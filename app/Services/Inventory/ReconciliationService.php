<?php

namespace App\Services\Inventory;

use App\Services\CompanyContext;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Phase 7 — Inventory reconciliation.
 *
 * Invariant (source-of-truth doc §invariant 8): the MOVEMENT LEDGER (headers +
 * lines) and the WAC ledger (ICB/ICT) are the truth; `products.quantity` is a
 * DERIVED cache. This service:
 *
 *  - REPORTS every product×warehouse where the movement-ledger quantity
 *    diverges from the WAC balance, counts legacy movement lines with no cost
 *    transaction behind them (pre-engine rows), and flags products whose
 *    derived quantity drifted from the sum of their warehouse ledgers;
 *  - RESYNCS by writing a real correction document (movement header + line +
 *    WAC transaction, source_type 'reconciliation_correction') so the fix is
 *    itself ledger-recorded — history is never silently rewritten. The derived
 *    quantity resync is a pure cache write.
 */
class ReconciliationService
{
    private const EPSILON = '0.0001';

    public function __construct(
        private CompanyContext $companyContext,
        private WeightedAverageCostService $wac,
    ) {}

    /* ---------------------------------------------------------------------
     |  Report
     --------------------------------------------------------------------- */

    /**
     * Company-scoped drift report.
     */
    public function report(?int $warehouseId = null): array
    {
        $companyId = $this->companyContext->id();

        $ledger = $this->ledgerQuantities($companyId, $warehouseId);
        $balances = $this->wacQuantities($companyId, $warehouseId);
        $legacy = $this->legacyLineCounts($companyId, $warehouseId);
        $derived = $this->derivedQuantities($companyId, $warehouseId);

        $keys = $ledger->keys()->merge($balances->keys())->merge($legacy->keys())->unique();

        $mismatches = [];
        foreach ($keys as $key) {
            [$productId, $whId] = explode(':', $key);
            $ledgerQty = (float) ($ledger[$key] ?? 0);
            $wacQty = (float) ($balances[$key] ?? 0);
            $legacyLines = (int) ($legacy[$key] ?? 0);

            if ($this->differs($ledgerQty, $wacQty) || $legacyLines > 0) {
                $mismatches[] = [
                    'product_id' => (int) $productId,
                    'warehouse_id' => (int) $whId,
                    'ledger_quantity' => $ledgerQty,
                    'wac_quantity' => $wacQty,
                    'delta' => round($ledgerQty - $wacQty, 4),
                    'legacy_lines_without_ict' => $legacyLines,
                ];
            }
        }

        // Derived-cache drift: products.quantity vs the sum of the movement
        // ledger across the scoped warehouses.
        $derivedDrift = [];
        foreach ($derived as $row) {
            if ($this->differs((float) $row->derived_quantity, (float) $row->ledger_total)) {
                $derivedDrift[] = [
                    'product_id' => (int) $row->product_id,
                    'derived_quantity' => (float) $row->derived_quantity,
                    'ledger_total' => (float) $row->ledger_total,
                    'delta' => round((float) $row->ledger_total - (float) $row->derived_quantity, 4),
                ];
            }
        }

        return [
            'mismatches' => $mismatches,
            'derived_drift' => $derivedDrift,
            'summary' => [
                'balance_mismatches' => count($mismatches),
                'legacy_line_products' => count(array_filter($mismatches, fn ($m) => $m['legacy_lines_without_ict'] > 0)),
                'derived_drifts' => count($derivedDrift),
            ],
        ];
    }

    /* ---------------------------------------------------------------------
     |  Resync: balance (ledger-recorded correction)
     --------------------------------------------------------------------- */

    /**
     * Bring the WAC balance back in line with the movement ledger by posting
     * a real correction document. Returns the applied delta.
     */
    public function resyncBalance(int $productId, int $warehouseId): array
    {
        return DB::transaction(function () use ($productId, $warehouseId) {
            $companyId = $this->companyContext->id();
            $this->assertOwnership($companyId, $productId, $warehouseId);

            $key = $productId.':'.$warehouseId;
            $ledgerQty = (float) ($this->ledgerQuantities($companyId, $warehouseId)[$key] ?? 0);
            $balance = DB::table('inventory_cost_balances')
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();
            $wacQty = $balance ? (float) $balance->quantity : 0.0;

            $delta = round($ledgerQty - $wacQty, 4);
            if (abs($delta) <= (float) self::EPSILON) {
                return ['changed' => false, 'delta' => 0.0, 'ledger_quantity' => $ledgerQty];
            }

            $today = now()->toDateString();

            if ($delta > 0) {
                // LEDGER > WAC: movement lines exist that the cost engine
                // never saw (legacy pre-engine rows). Post the missing ICT(s)
                // against the UN-COSTED movement lines themselves — the
                // movement ledger is already correct and must NOT grow (a
                // synthetic movement would chase the gap forever), and the
                // lines stop counting as "legacy without ICT".
                $unitCost = $balance ? (string) $balance->average_cost : '0';
                $remaining = $delta;

                $legacyLineIds = DB::table('inventory_movement_lines as l')
                    ->join('inventory_movement_headers as h', 'h.id', '=', 'l.stock_movement_id')
                    ->leftJoin('inventory_cost_transactions as ict', function ($join) use ($companyId) {
                        $join->on('ict.movement_line_id', '=', 'l.id')
                            ->where('ict.company_id', $companyId);
                    })
                    ->where('h.company_id', $companyId)
                    ->where('h.warehouse_id', $warehouseId)
                    ->where('l.product_id', $productId)
                    ->whereNull('ict.id')
                    ->orderBy('h.movement_date')
                    ->orderBy('l.id')
                    ->pluck('l.id');

                foreach ($legacyLineIds as $lineId) {
                    if ($remaining <= (float) self::EPSILON) {
                        break;
                    }

                    $line = DB::table('inventory_movement_lines')->where('id', $lineId)->first();
                    $quantity = min((float) $line->quantity, $remaining);

                    $this->wac->applyInbound(
                        $productId,
                        $warehouseId,
                        (string) $quantity,
                        $unitCost,
                        'reconciliation_correction',
                        (int) $lineId,
                        max((string) now()->toDateString(), (string) $this->lineDate($lineId)),
                        null,
                        (int) $lineId,
                    );

                    $remaining = round($remaining - $quantity, 4);
                }

                // Any residual delta without a host line (rounding residue or
                // a line deleted outside the ledger) becomes a stand-alone
                // correction document.
                if ($remaining > (float) self::EPSILON) {
                    return $this->postCorrectionDocument(
                        $companyId,
                        $productId,
                        $warehouseId,
                        $remaining,
                        $unitCost,
                        $ledgerQty,
                        $wacQty
                    );
                }
            } else {
                // WAC > LEDGER. Decompose before touching anything:
                //
                // (a) If the balance disagrees with the SUM OF ITS OWN ICTs,
                //     it was tampered with outside the cost engine — repair it
                //     by recomputing quantity/value/average from Σ ICT. No new
                //     rows; the ledgers' shared history stays untouched.
                // (b) If Σ ICT itself exceeds the movement ledger (orphan cost
                //     transactions with no movement behind them), the correct
                //     fix is ambiguous (void the ICTs? add the missing
                //     movement?) — that is a human decision, so refuse with a
                //     manual-review flag instead of posting a correction that
                //     would chase the gap forever.
                $ictSum = (float) DB::table('inventory_cost_transactions')
                    ->where('company_id', $companyId)
                    ->where('product_id', $productId)
                    ->where('warehouse_id', $warehouseId)
                    ->lockForUpdate()
                    ->sum('quantity_delta');

                if ($this->differs($wacQty, $ictSum)) {
                    $valueSum = (float) DB::table('inventory_cost_transactions')
                        ->where('company_id', $companyId)
                        ->where('product_id', $productId)
                        ->where('warehouse_id', $warehouseId)
                        ->sum('value_delta');

                    DB::table('inventory_cost_balances')
                        ->where('company_id', $companyId)
                        ->where('product_id', $productId)
                        ->where('warehouse_id', $warehouseId)
                        ->update([
                            'quantity' => $ictSum,
                            'inventory_value' => $valueSum,
                            'average_cost' => abs((float) $ictSum) > 0 ? $valueSum / $ictSum : 0,
                            'updated_at' => now(),
                        ]);

                    return [
                        'changed' => true,
                        'mode' => 'balance_recomputed_from_ict',
                        'delta' => $delta,
                        'ledger_quantity' => $ledgerQty,
                    ];
                }

                throw new RuntimeException(
                    "Reconciliation needs manual review: cost transactions hold {$ictSum} units but the movement ledger holds {$ledgerQty} ".
                    '(orphan cost transactions). Inspect inventory_cost_transactions for this product/warehouse before deciding.'
                );
            }

            return [
                'changed' => true,
                'delta' => $delta,
                'ledger_quantity' => $ledgerQty,
            ];
        });
    }

    /**
     * Stand-alone reconciliation correction document (type 'reconciliation')
     * hosting a WAC delta the existing movement lines cannot absorb.
     */
    private function postCorrectionDocument(
        int $companyId,
        int $productId,
        int $warehouseId,
        float $quantity,
        string $unitCost,
        float $ledgerQty,
        float $wacQty,
        string $direction = 'in'
    ): array {
        $today = now()->toDateString();
        $voucher = 'REC-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $today,
            'type' => 'reconciliation',
            'direction' => $direction,
            'reference_type' => 'reconciliation',
            'reference_id' => $productId,
            'voucher_num' => $voucher,
            'warehouse_id' => $warehouseId,
            'company_id' => $companyId,
            'created_by' => Auth::id(),
            'notes' => "Reconciliation correction: movement ledger {$ledgerQty}, WAC {$wacQty}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $lineId = DB::table('inventory_movement_lines')->insertGetId([
            'stock_movement_id' => $headerId,
            'product_id' => $productId,
            'unit_id' => DB::table('products')->where('id', $productId)->value('unit_id'),
            'quantity' => $quantity,
            'original_quantity' => $quantity,
            'conversion_factor_snapshot' => 1,
            'cost_price' => (float) $unitCost,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($direction === 'in') {
            $this->wac->applyInbound(
                $productId,
                $warehouseId,
                (string) $quantity,
                $unitCost,
                'reconciliation_correction',
                (int) $lineId,
                $today,
                (int) $headerId,
                (int) $lineId,
            );
        } else {
            $this->wac->applyOutbound(
                $productId,
                $warehouseId,
                (string) $quantity,
                'reconciliation_correction',
                (int) $lineId,
                $today,
                (int) $headerId,
                (int) $lineId,
            );
        }

        return [
            'changed' => true,
            'delta' => $direction === 'in' ? $quantity : -$quantity,
            'ledger_quantity' => $ledgerQty,
            'voucher_num' => $voucher,
            'movement_header_id' => (int) $headerId,
        ];
    }

    private function lineDate(int $lineId): ?string
    {
        return DB::table('inventory_movement_lines as l')
            ->join('inventory_movement_headers as h', 'h.id', '=', 'l.stock_movement_id')
            ->where('l.id', $lineId)
            ->value('h.movement_date');
    }

    /* ---------------------------------------------------------------------
     |  Resync: derived quantity (pure cache write)
     --------------------------------------------------------------------- */

    /**
     * Rewrite products.quantity from the movement ledger (all warehouses).
     */
    public function resyncDerivedQuantity(int $productId): array
    {
        return DB::transaction(function () use ($productId) {
            $companyId = $this->companyContext->id();

            $owner = DB::table('products')->where('id', $productId)->value('company_id');
            abort_unless((int) $owner === $companyId, 404, 'Product not found.');

            $ledgerTotal = (float) DB::table('inventory_movement_headers as h')
                ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
                ->where('h.company_id', $companyId)
                ->where('l.product_id', $productId)
                ->selectRaw("COALESCE(SUM(CASE WHEN h.direction = 'in' THEN l.quantity ELSE -l.quantity END), 0) as total")
                ->value('total');

            $current = (float) DB::table('products')->where('id', $productId)->value('quantity');
            if (!$this->differs($ledgerTotal, $current)) {
                return ['changed' => false, 'derived_quantity' => $current];
            }

            DB::table('products')->where('id', $productId)->update([
                'quantity' => $ledgerTotal,
                'updated_at' => now(),
            ]);

            return ['changed' => true, 'derived_quantity' => $ledgerTotal, 'previous' => $current];
        });
    }

    /* ---------------------------------------------------------------------
     |  Internals
     --------------------------------------------------------------------- */

    private function ledgerQuantities(int $companyId, ?int $warehouseId)
    {
        $query = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.company_id', $companyId)
            ->groupBy('l.product_id', 'h.warehouse_id')
            ->selectRaw(
                "CONCAT(l.product_id, ':', h.warehouse_id) as pkey,
                 COALESCE(SUM(CASE WHEN h.direction = 'in' THEN l.quantity ELSE -l.quantity END), 0) as qty"
            );

        if ($warehouseId) {
            $query->where('h.warehouse_id', $warehouseId);
        }

        return $query->get()->pluck('qty', 'pkey');
    }

    private function wacQuantities(int $companyId, ?int $warehouseId)
    {
        $query = DB::table('inventory_cost_balances')
            ->where('company_id', $companyId)
            ->groupBy('product_id', 'warehouse_id')
            ->selectRaw("CONCAT(product_id, ':', warehouse_id) as pkey, COALESCE(SUM(quantity), 0) as qty");

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        return $query->get()->pluck('qty', 'pkey');
    }

    /**
     * Legacy pre-engine lines: movement lines with no cost transaction
     * pointing at them (ict.movement_line_id). The sales engine is exempt
     * (documented: its ICTs share source_id provenance instead — see doc §9.1).
     */
    private function legacyLineCounts(int $companyId, ?int $warehouseId)
    {
        $query = DB::table('inventory_movement_lines as l')
            ->join('inventory_movement_headers as h', 'h.id', '=', 'l.stock_movement_id')
            ->leftJoin('inventory_cost_transactions as ict', function ($join) use ($companyId) {
                $join->on('ict.movement_line_id', '=', 'l.id')
                    ->where('ict.company_id', $companyId);
            })
            ->where('h.company_id', $companyId)
            ->whereNull('ict.id')
            ->groupBy('l.product_id', 'h.warehouse_id')
            ->selectRaw('CONCAT(l.product_id, \':\', h.warehouse_id) as pkey, COUNT(*) as legacy_lines');

        if ($warehouseId) {
            $query->where('h.warehouse_id', $warehouseId);
        }

        return $query->get()->pluck('legacy_lines', 'pkey');
    }

    private function derivedQuantities(int $companyId, ?int $warehouseId)
    {
        $sql = $warehouseId
            ? "SELECT p.id as product_id,
                      COALESCE(p.quantity, 0) as derived_quantity,
                      COALESCE((SELECT SUM(CASE WHEN h.direction = 'in' THEN l.quantity ELSE -l.quantity END)
                                FROM inventory_movement_headers h
                                JOIN inventory_movement_lines l ON l.stock_movement_id = h.id
                                WHERE h.company_id = {$companyId}
                                  AND h.warehouse_id = {$warehouseId}
                                  AND l.product_id = p.id), 0) as ledger_total
               FROM products p
               WHERE p.company_id = {$companyId}"
            : "SELECT p.id as product_id,
                      COALESCE(p.quantity, 0) as derived_quantity,
                      COALESCE((SELECT SUM(CASE WHEN h.direction = 'in' THEN l.quantity ELSE -l.quantity END)
                                FROM inventory_movement_headers h
                                JOIN inventory_movement_lines l ON l.stock_movement_id = h.id
                                WHERE h.company_id = {$companyId}
                                  AND l.product_id = p.id), 0) as ledger_total
               FROM products p
               WHERE p.company_id = {$companyId}";

        return collect(DB::select($sql));
    }

    private function differs(float $a, float $b): bool
    {
        return abs($a - $b) > (float) self::EPSILON;
    }

    private function assertOwnership(int $companyId, int $productId, int $warehouseId): void
    {
        $productOwner = DB::table('products')->where('id', $productId)->value('company_id');
        abort_unless((int) $productOwner === $companyId, 404, 'Product not found.');

        $warehouseOwner = DB::table('warehouses')->where('id', $warehouseId)->value('company_id');
        abort_unless((int) $warehouseOwner === $companyId, 404, 'Warehouse not found.');
    }
}
