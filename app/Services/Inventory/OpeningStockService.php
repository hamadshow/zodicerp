<?php

namespace App\Services\Inventory;

use App\Models\OpeningStock;
use App\Models\Products;
use App\Models\Warehouses;
use App\Services\CompanyContext;
use App\Services\UnitConversionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Opening Stock engine (Phase 3).
 *
 * Contract (docs/inventory/inventory-source-of-truth.md, D1 + D3 + D4):
 *
 *  - Opening stock establishes the INITIAL quantity AND COST of a product in
 *    a warehouse, so it seeds WAC via WeightedAverageCostService::applyInbound
 *    at the entered cost (D1) — one immutable cost transaction per line.
 *  - Quantities are converted to the product's BASE unit before anything is
 *    written; the movement line keeps original_quantity +
 *    conversion_factor_snapshot (D3 / movement contract).
 *  - products.quantity is a derived cache: incremented by exactly the base
 *    quantity inside the same transaction (D3).
 *  - Everything happens in ONE database transaction: any failure rolls back
 *    movements, cost transactions, and quantity changes completely.
 *  - One active opening record per (company, warehouse, product). Edits are
 *    reversal-and-replacement (D4): the previous cost transactions are
 *    reversed exactly via WAC::reverse() and the new lines are applied.
 *    Deleting reverses the lines and keeps the header as an audit row
 *    (direction flipped to 'out') — history is never destroyed.
 */
class OpeningStockService
{
    public function __construct(
        private CompanyContext $companyContext,
        private WeightedAverageCostService $wac,
        private UnitConversionService $unitConversion,
    ) {}

    /**
     * Create an opening stock document.
     *
     * @throws ValidationException on duplicate products within the submission,
     *                             prior opening records, or invalid references
     * @throws RuntimeException on WAC/chronology failures (rolls back)
     */
    public function create(array $data): object
    {
        return DB::transaction(function () use ($data) {
            $companyId = $this->companyContext->id();
            $warehouseId = (int) $data['warehouse_id'];
            $movementDate = $this->movementDate($data);

            $this->assertOwnership($companyId, $warehouseId, $data['items']);
            $this->assertNoPriorOpening($companyId, $warehouseId, $data['items'], null);

            $headerId = $this->insertHeader($companyId, $warehouseId, $movementDate, $data['notes'] ?? null);

            $this->applyItems($headerId, $companyId, $warehouseId, $movementDate, $data['items']);

            return DB::table('inventory_movement_headers')->where('id', $headerId)->first();
        });
    }

    /**
     * Replace an opening stock document's items (D4).
     *
     * Movement lines are referenced by immutable cost transactions
     * (ict.movement_line_id is RESTRICT), so lines can never be rewritten in
     * place. Instead the OLD document is reversed exactly (every ICT negated
     * via WAC::reverse, derived quantity rolled back) and kept as an audit
     * row marked [SUPERSEDED]; a NEW opening document is then created with
     * the replacement items.
     *
     * The whole correction is dated at max(new date, today) so the WAC
     * chronology invariant (no backdated costing) is never violated.
     */
    public function update(int $headerId, array $data): object
    {
        return DB::transaction(function () use ($headerId, $data) {
            $companyId = $this->companyContext->id();
            $warehouseId = (int) $data['warehouse_id'];

            $header = DB::table('inventory_movement_headers')
                ->where('id', $headerId)
                ->where('company_id', $companyId)
                ->where('type', 'opening')
                ->first();

            // Missing OR cross-company target => 404 semantics (do not leak
            // the existence of another company's records).
            if (! $header) {
                throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)
                    ->setModel(OpeningStock::class);
            }

            if ($header->direction !== 'in') {
                throw new RuntimeException('A reversed opening stock record cannot be edited.');
            }

            $this->assertOwnership($companyId, $warehouseId, $data['items']);
            $this->assertNoPriorOpening($companyId, $warehouseId, $data['items'], (int) $headerId);

            $effectiveDate = max($this->movementDate($data), now()->toDateString());

            // 1) Reverse the old document exactly (WAC + derived quantity).
            $oldLines = DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $headerId)
                ->orderBy('id')
                ->get();

            foreach ($oldLines as $oldLine) {
                $this->reverseLine($companyId, (int) $headerId, $oldLine, $effectiveDate);
            }

            // 2) Keep the old header as a superseded audit row.
            DB::table('inventory_movement_headers')->where('id', $headerId)->update([
                'direction' => 'out',
                'notes' => trim(($header->notes ?? '').' [SUPERSEDED '.$effectiveDate.']'),
                'updated_at' => now(),
            ]);

            // 3) Create the replacement document with the new items.
            $newHeaderId = $this->insertHeader($companyId, $warehouseId, $effectiveDate, $data['notes'] ?? null);
            $this->applyItems($newHeaderId, $companyId, $warehouseId, $effectiveDate, $data['items']);

            return DB::table('inventory_movement_headers')->where('id', $newHeaderId)->first();
        });
    }

    /**
     * Reverse an opening stock document (D4). The movement lines and their
     * WAC effects are negated exactly; the header remains as an audit row
     * with direction flipped to 'out' — inventory history is never deleted.
     */
    public function delete(int $headerId): void
    {
        DB::transaction(function () use ($headerId) {
            $companyId = $this->companyContext->id();
            $reversalDate = now()->toDateString();

            $header = DB::table('inventory_movement_headers')
                ->where('id', $headerId)
                ->where('company_id', $companyId)
                ->where('type', 'opening')
                ->first();

            if (! $header) {
                throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)
                    ->setModel(OpeningStock::class);
            }

            if ($header->direction !== 'in') {
                throw new RuntimeException('Opening stock record is already reversed.');
            }

            $lines = DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $headerId)
                ->orderBy('id')
                ->get();

            foreach ($lines as $line) {
                $this->reverseLine($companyId, (int) $headerId, $line, $reversalDate);
            }

            DB::table('inventory_movement_headers')->where('id', $headerId)->update([
                'direction' => 'out',
                'notes' => trim(($header->notes ?? '').' [REVERSED '.$reversalDate.']'),
                'updated_at' => now(),
            ]);
        });
    }

    /* ---------------------------------------------------------------------
     |  Internals
     --------------------------------------------------------------------- */

    private function movementDate(array $data): string
    {
        return ! empty($data['movement_date'])
            ? (string) $data['movement_date']
            : now()->toDateString();
    }

    private function insertHeader(int $companyId, int $warehouseId, string $movementDate, ?string $notes): int
    {
        return DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $movementDate,
            'type' => 'opening',
            'direction' => 'in',
            'reference_type' => 'opening',
            'voucher_num' => 'OS-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseId,
            'company_id' => $companyId,
            'created_by' => auth()->id(),
            'notes' => $notes ?: 'OpeningStock',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Convert + persist every item, seed WAC, and bump the derived quantity.
     * The SAME base quantity drives the movement line, the cost transaction,
     * and products.quantity (movement contract).
     */
    private function applyItems(int $headerId, int $companyId, int $warehouseId, string $movementDate, array $items): void
    {
        foreach ($this->normalizedItems($items) as $item) {
            $lineId = DB::table('inventory_movement_lines')->insertGetId([
                'stock_movement_id' => $headerId,
                'product_id' => $item['product_id'],
                'unit_id' => $item['unit_id'],
                'quantity' => $item['base_quantity'],
                'conversion_factor_snapshot' => $item['conversion_factor'],
                'original_quantity' => $item['original_quantity'],
                'cost_price' => $item['base_cost'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // D1: opening cost seeds WAC (immutable ICT, movement-linked).
            $this->wac->applyInbound(
                $item['product_id'],
                $warehouseId,
                $item['base_quantity'],
                $item['base_cost'],
                'opening_stock_line',
                $lineId,
                $movementDate,
                $headerId,
                $lineId,
            );

            // D3: derived global quantity.
            DB::table('products')
                ->where('id', $item['product_id'])
                ->increment('quantity', (float) $item['base_quantity']);
        }
    }

    /**
     * Exactly negate one opening line: WAC reversal + derived quantity.
     * Legacy lines without a cost transaction (pre-Phase 3 data) reverse the
     * derived quantity only — reported as a reconciliation flag in Phase 7.
     */
    private function reverseLine(int $companyId, int $headerId, object $line, string $reversalDate): void
    {
        $originalTx = DB::table('inventory_cost_transactions')
            ->where('company_id', $companyId)
            ->where('source_type', 'opening_stock_line')
            ->where('source_id', $line->id)
            ->first();

        if ($originalTx) {
            $this->wac->reverse(
                (int) $originalTx->id,
                $reversalDate,
                'opening_stock_reversal',
                (int) $line->id,
            );
        }

        DB::table('products')
            ->where('id', $line->product_id)
            ->decrement('quantity', (float) $line->quantity);
    }

    /**
     * Validate + convert items. One line per product per submission; base
     * quantity and base unit cost are computed with bcmath precision.
     *
     * @return array<int, array{product_id:int, unit_id:int, original_quantity:string, base_quantity:string, conversion_factor:string, base_cost:string}>
     */
    private function normalizedItems(array $items): array
    {
        $seenProducts = [];

        $normalized = [];
        foreach ($items as $index => $item) {
            $productId = (int) $item['product_id'];
            $unitId = (int) $item['unit_id'];
            $quantity = (string) $item['quantity'];
            $cost = (string) ($item['cost_price'] ?? '0');

            if (isset($seenProducts[$productId])) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => ['Duplicate product in the opening stock submission. Combine quantities into one line.'],
                ]);
            }
            $seenProducts[$productId] = true;

            $conversion = $this->unitConversion->toBase($productId, $unitId, $quantity);

            // Cost is entered per DOCUMENT unit; the WAC needs cost per BASE unit.
            $factor = $conversion['conversion_factor'];
            $baseCost = $this->divideCost($cost, $factor);

            $normalized[] = [
                'product_id' => $productId,
                'unit_id' => $unitId,
                'original_quantity' => $quantity,
                'base_quantity' => $conversion['base_quantity'],
                'conversion_factor' => $factor,
                'base_cost' => $baseCost,
            ];
        }

        return $normalized;
    }

    private function divideCost(string $cost, string $factor): string
    {
        if (bccomp($factor, '0', 6) === 0) {
            return bcadd($cost, '0', 6);
        }

        return bcdiv($cost, $factor, 6);
    }

    /**
     * Every referenced warehouse/product must belong to the active company,
     * and services must never hold stock.
     */
    private function assertOwnership(int $companyId, int $warehouseId, array $items): void
    {
        $warehouseOwner = Warehouses::query()->whereKey($warehouseId)->value('company_id');
        if ((int) $warehouseOwner !== $companyId) {
            throw ValidationException::withMessages([
                'warehouse_id' => ['Warehouse does not belong to the active company.'],
            ]);
        }

        $products = Products::query()
            ->whereIn('id', array_map('intval', array_column($items, 'product_id')))
            ->get(['id', 'company_id', 'product_type'])
            ->keyBy('id');

        foreach ($items as $index => $item) {
            $product = $products->get((int) $item['product_id']);

            if (! $product || (int) $product->company_id !== $companyId) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => ['Product does not belong to the active company.'],
                ]);
            }

            if ($product->product_type === Products::PRODUCT_TYPE_SERVICE) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => ['Service products cannot hold stock.'],
                ]);
            }
        }
    }

    /**
     * D7 (conservative default): one ACTIVE opening record per
     * (company, warehouse, product). Additional submissions must go through
     * update/delete. Historical duplicates become Phase 7 reconciliation flags.
     */
    private function assertNoPriorOpening(int $companyId, int $warehouseId, array $items, ?int $excludeHeaderId): void
    {
        $productIds = array_values(array_unique(array_map(
            fn ($item) => (int) $item['product_id'],
            $items
        )));

        $clashes = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.company_id', $companyId)
            ->where('h.type', 'opening')
            ->where('h.direction', 'in')
            ->where('h.warehouse_id', $warehouseId)
            ->whereIn('l.product_id', $productIds)
            ->when($excludeHeaderId !== null, fn ($q) => $q->where('h.id', '!=', $excludeHeaderId))
            ->distinct()
            ->count('l.product_id');

        if ($clashes > 0) {
            throw ValidationException::withMessages([
                'items' => ['An active opening stock record already exists for one or more of these products in this warehouse. Edit the existing record instead.'],
            ]);
        }
    }
}
