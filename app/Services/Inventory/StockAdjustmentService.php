<?php

namespace App\Services\Inventory;

use App\Services\CompanyContext;
use App\Services\UnitConversionService;
use App\Traits\EnsuresFiscalPeriod;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Stock Adjustment engine (Phase 4, decision D2 ratified).
 *
 * A stock adjustment is a full member of the movement engine:
 *
 *   draft  — record only (no ledger effects)
 *   approve — per item, ONE applied path:
 *       positive quantity: WAC applyInbound at the entered unit cost
 *                          (cost per DOCUMENT unit ÷ conversion factor)
 *       negative quantity: WAC applyOutbound at the CURRENT warehouse WAC
 *     both: movement header (one per net direction) + lines with base
 *     quantities + conversion snapshots, derived products.quantity delta,
 *     GL entry valued from the APPLIED cost transactions (never from raw
 *     document arithmetic), all in one transaction.
 *   cancel — draft: status flip only. approved: exact reversal via
 *     WeightedAverageCostService::reverse() + a reversal movement document +
 *     journal reversal. Refuses when stock has already been consumed.
 */
class StockAdjustmentService
{
    use EnsuresFiscalPeriod;

    public function __construct(
        private ?CompanyContext $companyContext = null,
        private ?WeightedAverageCostService $wac = null,
        private ?UnitConversionService $unitConversion = null,
    ) {
        // Tolerate `new StockAdjustmentService()` (existing ErpWorkflowTest
        // contract) while container injection supplies dependencies normally.
        $this->companyContext ??= app(CompanyContext::class);
        $this->wac ??= app(WeightedAverageCostService::class);
        $this->unitConversion ??= app(UnitConversionService::class);
    }

    /**
     * Active company for company-owned reads/writes (Phase 1 isolation).
     */
    private function companyId(): int
    {
        return $this->companyContext->id();
    }

    /**
     * Master-data (accounts) keep the "company_id = active OR NULL" convention.
     */
    private function scopeAccounts($query, ?int $companyId = null)
    {
        $companyId ??= $this->companyId();

        return $query->where(function ($q) use ($companyId) {
            $q->where('company_id', $companyId)->orWhereNull('company_id');
        });
    }

    /**
     * Create a draft stock adjustment (no ledger effects).
     */
    public function createAdjustment(array $data): object
    {
        return DB::transaction(function () use ($data) {
            $companyId = $this->companyId();

            $this->assertWarehouseOwnership((int) $data['warehouse_id'], $companyId);

            $adjustmentId = DB::table('stock_adjustments')->insertGetId([
                'adjustment_number' => $this->generateAdjustmentNumber(),
                'warehouse_id' => (int) $data['warehouse_id'],
                'adjustment_date' => $data['adjustment_date'],
                'reason' => $data['reason'] ?? 'correction',
                'description' => $data['description'] ?? null,
                'status' => 'draft',
                'company_id' => $companyId,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($data['items'] as $item) {
                $this->assertProductOwnership((int) $item['product_id'], $companyId);

                $quantityBefore = $this->getProductQuantity(
                    (int) $item['product_id'],
                    (int) $data['warehouse_id']
                );

                $conversion = $this->unitConversion->toBase(
                    (int) $item['product_id'],
                    (int) $item['unit_id'],
                    (string) $item['adjustment_quantity']
                );
                $baseQty = (float) $conversion['base_quantity'];

                DB::table('stock_adjustment_items')->insert([
                    'adjustment_id' => $adjustmentId,
                    'product_id' => (int) $item['product_id'],
                    'unit_id' => (int) $item['unit_id'],
                    'quantity_before' => $quantityBefore,
                    'adjustment_quantity' => (float) $item['adjustment_quantity'],
                    'quantity_after' => $quantityBefore + $baseQty,
                    'unit_cost' => $item['unit_cost'] ?? 0,
                    'reason' => $item['reason'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
        });
    }

    /**
     * Approve a draft adjustment: apply every item through the WAC engine
     * (D2), write the movement documents, derived quantity, and the GL entry.
     * Idempotent: an already-approved adjustment is returned unchanged.
     */
    public function approveAdjustment(int $adjustmentId): object
    {
        return DB::transaction(function () use ($adjustmentId) {
            $adjustment = $this->findOwnedAdjustment($adjustmentId);

            if ($adjustment->status === 'approved') {
                return $adjustment; // idempotent
            }

            if ($adjustment->status !== 'draft') {
                throw new RuntimeException('Only draft adjustments can be approved.');
            }

            $this->ensureOpenFiscalPeriod($adjustment->adjustment_date);

            $items = DB::table('stock_adjustment_items')
                ->where('adjustment_id', $adjustmentId)
                ->orderBy('id')
                ->get();

            if ($items->isEmpty()) {
                throw new RuntimeException('Stock adjustment has no items.');
            }

            $companyId = (int) $adjustment->company_id;
            $warehouseId = (int) $adjustment->warehouse_id;
            $date = (string) $adjustment->adjustment_date;

            // Split by direction: each direction gets its own movement header
            // (the movement contract requires an unambiguous header direction).
            $positive = $items->filter(fn ($i) => (float) $i->adjustment_quantity > 0);
            $negative = $items->filter(fn ($i) => (float) $i->adjustment_quantity < 0);

            $applied = [];

            if ($positive->isNotEmpty()) {
                $headerId = $this->insertMovementHeader($adjustment, 'in', $date, $companyId);
                foreach ($positive as $item) {
                    $applied[] = $this->applyPositiveItem($headerId, $adjustment, $item, $warehouseId, $date);
                }
            }

            if ($negative->isNotEmpty()) {
                $headerId = $this->insertMovementHeader($adjustment, 'out', $date, $companyId);
                foreach ($negative as $item) {
                    $applied[] = $this->applyNegativeItem($headerId, $adjustment, $item, $warehouseId, $date);
                }
            }

            // Derived quantity (D3): one delta per product across both directions.
            $deltas = [];
            foreach ($applied as $entry) {
                $deltas[$entry['product_id']] = ($deltas[$entry['product_id']] ?? 0.0) + $entry['base_quantity'];
            }
            foreach ($deltas as $productId => $delta) {
                if (abs($delta) > 0.0000001) {
                    DB::table('products')->where('id', $productId)->increment('quantity', $delta);
                }
            }

            $this->upsertJournalEntryForAdjustment($adjustment, $applied);

            DB::table('stock_adjustments')->where('id', $adjustmentId)->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

            return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
        });
    }

    /**
     * Cancel an adjustment.
     *
     * Draft/cancelled: status flip only (nothing was applied).
     * Approved: exact reversal — WAC::reverse per applied ICT, a reversal
     * movement document, derived quantity rollback, and journal reversal.
     * Refuses when the stock has already been consumed downstream.
     */
    public function cancelAdjustment(int $adjustmentId): object
    {
        return DB::transaction(function () use ($adjustmentId) {
            $adjustment = $this->findOwnedAdjustment($adjustmentId);

            if ($adjustment->status === 'cancelled') {
                return $adjustment; // idempotent
            }

            if ($adjustment->status !== 'approved') {
                DB::table('stock_adjustments')->where('id', $adjustmentId)->update([
                    'status' => 'cancelled',
                    'updated_at' => now(),
                ]);

                return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
            }

            $this->ensureOpenFiscalPeriod(now()->toDateString());

            $companyId = (int) $adjustment->company_id;
            $warehouseId = (int) $adjustment->warehouse_id;
            $reversalDate = now()->toDateString();

            $items = DB::table('stock_adjustment_items')
                ->where('adjustment_id', $adjustmentId)
                ->orderBy('id')
                ->get();

            // Reverse every applied cost transaction exactly (throws if the
            // stock has been consumed — the whole cancellation rolls back).
            $reversalDirection = 'in';
            $hasPositive = false;
            $hasNegative = false;

            foreach ($items as $item) {
                $originalTx = DB::table('inventory_cost_transactions')
                    ->where('company_id', $companyId)
                    ->where('source_type', 'stock_adjustment_line')
                    ->where('source_id', $item->id)
                    ->first();

                if (! $originalTx) {
                    continue; // legacy item approved before Phase 4
                }

                $this->wac->reverse(
                    (int) $originalTx->id,
                    $reversalDate,
                    'stock_adjustment_reversal',
                    (int) $item->id,
                );

                DB::table('products')
                    ->where('id', $item->product_id)
                    ->decrement('quantity', (float) $originalTx->quantity_delta);

                ((float) $originalTx->quantity_delta) > 0 ? $hasNegative = true : $hasPositive = true;
            }

            // Reversal movement document (opposite direction of the net effect).
            $reversalDirection = $hasNegative && ! $hasPositive ? 'in' : ($hasPositive && ! $hasNegative ? 'out' : null);
            if ($reversalDirection !== null) {
                $headerId = DB::table('inventory_movement_headers')->insertGetId([
                    'movement_date' => $reversalDate,
                    'type' => 'adjustment',
                    'direction' => $reversalDirection,
                    'reference_id' => $adjustmentId,
                    'reference_type' => 'stock_adjustment_reversal',
                    'voucher_num' => $adjustment->adjustment_number.'-REV',
                    'warehouse_id' => $warehouseId,
                    'company_id' => $companyId,
                    'created_by' => auth()->id(),
                    'notes' => "Stock Adjustment Reversal: {$adjustment->adjustment_number}",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($items as $item) {
                    $conversion = $this->unitConversion->toBase(
                        (int) $item->product_id,
                        (int) $item->unit_id,
                        (string) abs((float) $item->adjustment_quantity)
                    );

                    DB::table('inventory_movement_lines')->insert([
                        'stock_movement_id' => $headerId,
                        'product_id' => $item->product_id,
                        'unit_id' => $item->unit_id,
                        'quantity' => $conversion['base_quantity'],
                        'conversion_factor_snapshot' => $conversion['conversion_factor'],
                        'original_quantity' => abs((float) $item->adjustment_quantity),
                        'cost_price' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $this->reverseJournalEntryForAdjustment($adjustment);

            DB::table('stock_adjustments')->where('id', $adjustmentId)->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);

            return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
        });
    }

    /* ---------------------------------------------------------------------
     |  Item application (D2 core)
     --------------------------------------------------------------------- */

    /**
     * Positive adjustment: inbound at the ENTERED unit cost (per document
     * unit, divided by the conversion factor to reach cost per base unit).
     */
    private function applyPositiveItem(int $headerId, object $adjustment, object $item, int $warehouseId, string $date): array
    {
        $conversion = $this->unitConversion->toBase(
            (int) $item->product_id,
            (int) $item->unit_id,
            (string) $item->adjustment_quantity
        );
        $baseQuantity = $conversion['base_quantity'];
        $baseCost = $this->divideCost((string) ($item->unit_cost ?? 0), $conversion['conversion_factor']);

        $lineId = $this->insertMovementLine($headerId, $item, $baseQuantity, $conversion, $baseCost);

        $tx = $this->wac->applyInbound(
            (int) $item->product_id,
            $warehouseId,
            (string) $baseQuantity,
            $baseCost,
            'stock_adjustment_line',
            (int) $item->id,
            $date,
            $headerId,
            $lineId,
        );

        return [
            'product_id' => (int) $item->product_id,
            'base_quantity' => (float) $baseQuantity,
            'value' => abs((float) $tx->value_delta),
        ];
    }

    /**
     * Negative adjustment: outbound at the CURRENT warehouse WAC.
     * The ledger rejects insufficient stock (whole approval rolls back).
     */
    private function applyNegativeItem(int $headerId, object $adjustment, object $item, int $warehouseId, string $date): array
    {
        $conversion = $this->unitConversion->toBase(
            (int) $item->product_id,
            (int) $item->unit_id,
            (string) abs((float) $item->adjustment_quantity)
        );
        $baseQuantity = $conversion['base_quantity'];

        $lineId = $this->insertMovementLine($headerId, $item, $baseQuantity, $conversion, 0);

        $tx = $this->wac->applyOutbound(
            (int) $item->product_id,
            $warehouseId,
            (string) $baseQuantity,
            'stock_adjustment_line',
            (int) $item->id,
            $date,
            $headerId,
            $lineId,
        );

        DB::table('inventory_movement_lines')->where('id', $lineId)->update([
            'cost_price' => abs((float) $tx->unit_cost),
        ]);

        return [
            'product_id' => (int) $item->product_id,
            'base_quantity' => -1.0 * (float) $baseQuantity,
            'value' => abs((float) $tx->value_delta),
        ];
    }

    private function insertMovementHeader(object $adjustment, string $direction, string $date, int $companyId): int
    {
        return DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $date,
            'type' => 'adjustment',
            'direction' => $direction,
            'reference_id' => $adjustment->id,
            'reference_type' => 'stock_adjustment',
            'voucher_num' => $adjustment->adjustment_number,
            'warehouse_id' => (int) $adjustment->warehouse_id,
            'company_id' => $companyId,
            'created_by' => auth()->id(),
            'notes' => "Stock Adjustment: {$adjustment->adjustment_number}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function insertMovementLine(int $headerId, object $item, string $baseQuantity, array $conversion, float $cost): int
    {
        return DB::table('inventory_movement_lines')->insertGetId([
            'stock_movement_id' => $headerId,
            'product_id' => $item->product_id,
            'unit_id' => $item->unit_id,
            'quantity' => $baseQuantity,
            'conversion_factor_snapshot' => $conversion['conversion_factor'],
            'original_quantity' => abs((float) $item->adjustment_quantity),
            'cost_price' => $cost,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /* ---------------------------------------------------------------------
     |  Journal (values from APPLIED cost transactions, not document arithmetic)
     --------------------------------------------------------------------- */

    private function upsertJournalEntryForAdjustment(object $adjustment, array $applied): void
    {
        $inventoryAccountId = $this->resolveInventoryAssetAccountId();
        $adjustmentAccountId = $this->resolveInventoryAdjustmentAccountId();

        if (! $inventoryAccountId || ! $adjustmentAccountId) {
            return; // GL accounts not configured — operational effects stand
        }

        $positiveValue = 0.0;
        $negativeValue = 0.0;

        foreach ($applied as $entry) {
            if ($entry['base_quantity'] >= 0) {
                $positiveValue += $entry['value'];
            } else {
                $negativeValue += $entry['value'];
            }
        }

        $totalValue = round($positiveValue + $negativeValue, 2);
        if ($totalValue <= 0) {
            return;
        }

        $reference = $adjustment->adjustment_number;

        // Phase 18: the unreversed live entry via the journal_reversals
        // link table — a reversed adjustment's entry is never resurrected;
        // a re-approved adjustment posts a FRESH journal instead.
        $existing = app(\App\Services\Accounting\JournalReversalService::class)
            ->unreversedEntryFor($reference, 'StockAdjustment');

        if ($existing) {
            JournalEntryLine::where('journal_entry_code', $existing->entry_code)->delete();
            $existing->update([
                'date' => $adjustment->adjustment_date,
                'total_amount' => $totalValue,
                'status' => 'Post',
            ]);
            $entryCode = $existing->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'StockAdjustment',
                'reference' => $reference,
                'date' => $adjustment->adjustment_date,
                'description' => 'Stock Adjustment '.$reference,
                'total_amount' => $totalValue,
                'status' => 'Post',
                'company_id' => $this->companyId(),
            ]);
        }

        $lines = [];
        if ($positiveValue > 0) {
            $lines[] = ['account_id' => $inventoryAccountId, 'debit' => round($positiveValue, 2), 'credit' => 0, 'description' => 'Inventory increase - '.$reference];
            $lines[] = ['account_id' => $adjustmentAccountId, 'debit' => 0, 'credit' => round($positiveValue, 2), 'description' => 'Inventory adjustment gain - '.$reference];
        }
        if ($negativeValue > 0) {
            $lines[] = ['account_id' => $adjustmentAccountId, 'debit' => round($negativeValue, 2), 'credit' => 0, 'description' => 'Inventory adjustment loss - '.$reference];
            $lines[] = ['account_id' => $inventoryAccountId, 'debit' => 0, 'credit' => round($negativeValue, 2), 'description' => 'Inventory decrease - '.$reference];
        }

        foreach ($lines as $line) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $line['account_id'],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'related_id_name' => 'StockAdjustment',
                'related_name_details' => $reference,
                'description' => $line['description'],
            ]);
        }

        $debits = (float) JournalEntryLine::where('journal_entry_code', $entryCode)->sum('debit');
        $credits = (float) JournalEntryLine::where('journal_entry_code', $entryCode)->sum('credit');
        if (abs($debits - $credits) > 0.01) {
            throw new RuntimeException('Stock adjustment journal must balance before completion.');
        }

        app(PostingService::class)->recalculatePostings($this->companyId());
    }

    private function reverseJournalEntryForAdjustment(object $adjustment): void
    {
        // Phase 17: the LIVE entry via the journal_reversals link table (a
        // join) — a reference can own several entries after an amend cycle.
        $header = app(\App\Services\Accounting\JournalReversalService::class)
            ->liveEntryFor($adjustment->adjustment_number, 'StockAdjustment');

        if (! $header) {
            return;
        }

        if (in_array($header->status, ['Post', 'posted'], true)) {
            app(\App\Services\Accounting\JournalReversalService::class)->createReversal(
                $header->entry_code,
                'Stock Adjustment cancellation - '.$adjustment->adjustment_number
            );
        } else {
            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $header->delete();
        }

        app(PostingService::class)->recalculatePostings($this->companyId());
    }

    /* ---------------------------------------------------------------------
     |  Reports / helpers (company-scoped)
     --------------------------------------------------------------------- */

    /**
     * Get current product quantity in a warehouse from inventory movements.
     * Company-scoped: only movements of the active company are counted.
     */
    public function getProductQuantity(int $productId, int $warehouseId, ?int $companyId = null): float
    {
        $companyId ??= $this->companyId();

        $in = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.company_id', $companyId)
            ->where('h.warehouse_id', $warehouseId)
            ->where('l.product_id', $productId)
            ->where('h.direction', 'in')
            ->sum('l.quantity');

        $out = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.company_id', $companyId)
            ->where('h.warehouse_id', $warehouseId)
            ->where('l.product_id', $productId)
            ->where('h.direction', 'out')
            ->sum('l.quantity');

        return (float) $in - (float) $out;
    }

    /**
     * Get stock card for a product (company-scoped).
     */
    public function getStockCard(int $productId, ?int $warehouseId = null, ?string $dateFrom = null, ?string $dateTo = null, ?int $companyId = null): array
    {
        $companyId ??= $this->companyId();

        $query = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.company_id', $companyId)
            ->where('l.product_id', $productId)
            ->select(
                'h.movement_date',
                'h.type',
                'h.direction',
                'h.voucher_num',
                'h.warehouse_id',
                'l.quantity',
                'l.cost_price'
            )
            ->orderBy('h.movement_date')
            ->orderBy('h.id');

        if ($warehouseId) {
            $query->where('h.warehouse_id', $warehouseId);
        }

        if ($dateFrom) {
            $query->where('h.movement_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('h.movement_date', '<=', $dateTo);
        }

        $movements = $query->get();
        $runningBalance = 0;
        $result = [];

        foreach ($movements as $m) {
            $qty = (float) $m->quantity;
            $runningBalance += $m->direction === 'in' ? $qty : -$qty;

            $result[] = [
                'date' => $m->movement_date,
                'type' => $m->type,
                'direction' => $m->direction,
                'reference' => $m->voucher_num,
                'warehouse_id' => $m->warehouse_id,
                'quantity_in' => $m->direction === 'in' ? $qty : 0,
                'quantity_out' => $m->direction === 'out' ? $qty : 0,
                'unit_cost' => (float) $m->cost_price,
                'balance' => $runningBalance,
            ];
        }

        return $result;
    }

    /**
     * Get warehouse stock report (company-scoped, single grouped query).
     */
    public function getWarehouseStockReport(int $warehouseId, ?int $companyId = null): array
    {
        $companyId ??= $this->companyId();

        $movements = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.company_id', $companyId)
            ->where('h.warehouse_id', $warehouseId)
            ->select('l.product_id', 'h.direction', DB::raw('SUM(l.quantity) as total_qty'))
            ->groupBy('l.product_id', 'h.direction')
            ->get();

        $stock = [];
        foreach ($movements as $m) {
            if (! isset($stock[$m->product_id])) {
                $stock[$m->product_id] = ['in' => 0, 'out' => 0];
            }
            $stock[$m->product_id][$m->direction] += (float) $m->total_qty;
        }

        $products = DB::table('products')
            ->whereIn('id', array_keys($stock))
            ->get(['id', 'name', 'sku'])
            ->keyBy('id');

        $result = [];
        foreach ($stock as $productId => $totals) {
            $balance = $totals['in'] - $totals['out'];
            if ($balance != 0) {
                $product = $products->get($productId);
                $result[] = [
                    'product_id' => $productId,
                    'product_name' => $product?->name ?? 'Unknown',
                    'sku' => $product?->sku ?? '',
                    'quantity_in' => $totals['in'],
                    'quantity_out' => $totals['out'],
                    'balance' => $balance,
                ];
            }
        }

        return $result;
    }

    /* ---------------------------------------------------------------------
     |  Internals
     --------------------------------------------------------------------- */

    private function findOwnedAdjustment(int $adjustmentId): object
    {
        $adjustment = DB::table('stock_adjustments')->where('id', $adjustmentId)->first();

        // Missing OR cross-company target => 404 semantics.
        if (! $adjustment || (int) $adjustment->company_id !== $this->companyId()) {
            throw (new ModelNotFoundException)->setModel('StockAdjustment');
        }

        return $adjustment;
    }

    private function assertWarehouseOwnership(int $warehouseId, int $companyId): void
    {
        $owner = DB::table('warehouses')->where('id', $warehouseId)->value('company_id');
        if ((int) $owner !== $companyId) {
            throw new \Illuminate\Validation\ValidationException(
                validator([], []),
                ['warehouse_id' => ['Warehouse does not belong to the active company.']]
            );
        }
    }

    private function assertProductOwnership(int $productId, int $companyId): void
    {
        $owner = DB::table('products')->where('id', $productId)->value('company_id');
        if ((int) $owner !== $companyId) {
            throw new \Illuminate\Validation\ValidationException(
                validator([], []),
                ['items' => ['Product does not belong to the active company.']]
            );
        }
    }

    private function divideCost(string $cost, string $factor): string
    {
        if (bccomp($factor, '0', 6) === 0) {
            return bcadd($cost, '0', 6);
        }

        return bcdiv($cost, $factor, 6);
    }

    private function generateAdjustmentNumber(): string
    {
        do {
            $number = 'ADJ-'.now()->format('Ymd').'-'.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (DB::table('stock_adjustments')->where('adjustment_number', $number)->exists());

        return $number;
    }

    private function resolveInventoryAssetAccountId(): ?int
    {
        return $this->scopeAccounts(Account::where('AccCode', '11401'))
            ->value('AccID');
    }

    private function resolveInventoryAdjustmentAccountId(): ?int
    {
        return $this->scopeAccounts(Account::where('AccName', 'like', '%adjustment%'))
            ->orderBy('AccCode')
            ->value('AccID')
            ?? $this->scopeAccounts(Account::where('AccCode', '>=', 6100)
                ->where('AccCode', '<=', 6999))
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function generateNextEntryCode(): string
    {
        $nextNumber = 10001;
        // Sequence per company so companies do not consume each other's codes.
        $companyId = $this->companyId();
        $entries = JournalEntry::whereNotNull('entry_code')
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->pluck('entry_code');
        foreach ($entries as $entryCode) {
            if (preg_match('/(\d+)$/', $entryCode, $matches)) {
                $nextNumber = max($nextNumber, (int) $matches[1] + 1);
            }
        }

        return 'QID-'.$nextNumber;
    }
}
