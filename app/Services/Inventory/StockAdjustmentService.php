<?php

namespace App\Services\Inventory;

use App\Traits\EnsuresFiscalPeriod;
use App\Models\Accounting\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StockAdjustmentService
{
    use EnsuresFiscalPeriod;
    /**
     * Create a stock adjustment that creates proper inventory movements.
     */
    public function createAdjustment(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $adjustmentNumber = $this->generateAdjustmentNumber();

            $adjustmentId = DB::table('stock_adjustments')->insertGetId([
                'adjustment_number' => $adjustmentNumber,
                'warehouse_id' => $data['warehouse_id'],
                'adjustment_date' => $data['adjustment_date'],
                'reason' => $data['reason'] ?? 'correction',
                'description' => $data['description'] ?? null,
                'status' => 'draft',
                'company_id' => auth()->user()->company_id ?? 1,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($data['items'] as $item) {
                $quantityBefore = $this->getProductQuantity(
                    $item['product_id'],
                    $data['warehouse_id']
                );

                $adjustmentQty = (float) $item['adjustment_quantity'];
                $quantityAfter = $quantityBefore + $adjustmentQty;

                DB::table('stock_adjustment_items')->insert([
                    'adjustment_id' => $adjustmentId,
                    'product_id' => $item['product_id'],
                    'unit_id' => $item['unit_id'],
                    'quantity_before' => $quantityBefore,
                    'adjustment_quantity' => $adjustmentQty,
                    'quantity_after' => $quantityAfter,
                    'unit_cost' => $item['unit_cost'] ?? 0,
                    'reason' => $item['reason'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                // Inventory movements are created ONLY during approval, not during draft creation.
                // This ensures draft adjustments cannot affect effective inventory.
            }

            return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
        });
    }

    public function approveAdjustment(int $adjustmentId): array
    {
        return DB::transaction(function () use ($adjustmentId) {
            $adjustment = DB::table('stock_adjustments')->where('id', $adjustmentId)->first();

            if (!$adjustment) {
                throw new \Exception('Stock adjustment not found.');
            }

            // Idempotent: if already approved, return without creating duplicate effects
            if ($adjustment->status === 'approved') {
                return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
            }

            if ($adjustment->status !== 'draft') {
                throw new \Exception('Only draft adjustments can be approved.');
            }

            // Check for existing movements to prevent duplicate approval
            $existingMovement = DB::table('inventory_movement_headers')
                ->where('reference_type', 'stock_adjustment')
                ->where('reference_id', $adjustmentId)
                ->first();
            if ($existingMovement) {
                throw new \Exception('Stock adjustment already has inventory movements. Cannot approve again.');
            }

            // Update product quantities based on adjustment items
            $items = DB::table('stock_adjustment_items')
                ->where('adjustment_id', $adjustmentId)
                ->get();

            $totalAdjustmentValue = 0;

            foreach ($items as $item) {
                $adjQty = (float) $item->adjustment_quantity;
                if ($adjQty != 0) {
                    // Use raw update to add signed adjustment quantity
                    DB::table('products')
                        ->where('id', $item->product_id)
                        ->update([
                            'quantity' => DB::raw("quantity + ({$adjQty})"),
                            'updated_at' => now(),
                        ]);

                    // Create inventory movement for traceability
                    $direction = $adjQty > 0 ? 'in' : 'out';
                    $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
                        'movement_date' => $adjustment->adjustment_date,
                        'type' => 'adjustment',
                        'direction' => $direction,
                        'reference_id' => $adjustmentId,
                        'reference_type' => 'stock_adjustment',
                        'voucher_num' => $adjustment->adjustment_number,
                        'warehouse_id' => $adjustment->warehouse_id,
                        'company_id' => $adjustment->company_id ?? 1,
                        'created_by' => auth()->id(),
                        'notes' => "Stock Adjustment: {$adjustment->adjustment_number}",
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('inventory_movement_lines')->insert([
                        'stock_movement_id' => $movementHeaderId,
                        'product_id' => $item->product_id,
                        'unit_id' => $item->unit_id,
                        'quantity' => abs($adjQty),
                        'cost_price' => $item->unit_cost ?? 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Accumulate total adjustment value for GL
                    $totalAdjustmentValue += abs($adjQty) * (float) ($item->unit_cost ?? 0);
                }
            }

            // Create GL entry if there's a monetary value
            if ($totalAdjustmentValue > 0) {
                $this->createJournalEntryForAdjustment($adjustment, $items, $totalAdjustmentValue);
            }

            DB::table('stock_adjustments')->where('id', $adjustmentId)->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

            return DB::table('stock_adjustments')->where('id', $adjustmentId)->first();
        });
    }

    public function cancelAdjustment(int $adjustmentId): array
    {
        return DB::transaction(function () use ($adjustmentId) {
            $adjustment = DB::table('stock_adjustments')->where('id', $adjustmentId)->first();

            if (!$adjustment) {
                throw new \Exception('Stock adjustment not found.');
            }

            if ($adjustment->status === 'approved') {
                throw new \Exception('Approved adjustments cannot be cancelled. Create a reversal adjustment instead.');
            }

            DB::table('stock_adjustments')->where('id', $adjustmentId)->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);

            return $adjustment;
        });
    }

    /**
     * Get current product quantity in a warehouse from inventory movements.
     */
    public function getProductQuantity(int $productId, int $warehouseId): float
    {
        $in = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.warehouse_id', $warehouseId)
            ->where('l.product_id', $productId)
            ->where('h.direction', 'in')
            ->whereNull('h.deleted_at')
            ->sum('l.quantity');

        $out = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.warehouse_id', $warehouseId)
            ->where('l.product_id', $productId)
            ->where('h.direction', 'out')
            ->whereNull('h.deleted_at')
            ->sum('l.quantity');

        return (float) $in - (float) $out;
    }

    /**
     * Get stock card for a product.
     */
    public function getStockCard(int $productId, ?int $warehouseId = null, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $query = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('l.product_id', $productId)
            ->whereNull('h.deleted_at')
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
                'quantity_in' => $m->direction === 'in' ? $qty : 0,
                'quantity_out' => $m->direction === 'out' ? $qty : 0,
                'unit_cost' => (float) $m->cost_price,
                'balance' => $runningBalance,
            ];
        }

        return $result;
    }

    /**
     * Get warehouse stock report.
     */
    public function getWarehouseStockReport(int $warehouseId): array
    {
        $movements = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('h.warehouse_id', $warehouseId)
            ->whereNull('h.deleted_at')
            ->select('l.product_id', 'h.direction', DB::raw('SUM(l.quantity) as total_qty'))
            ->groupBy('l.product_id', 'h.direction')
            ->get();

        $stock = [];
        foreach ($movements as $m) {
            if (!isset($stock[$m->product_id])) {
                $stock[$m->product_id] = ['in' => 0, 'out' => 0];
            }
            $stock[$m->product_id][$m->direction] += (float) $m->total_qty;
        }

        $result = [];
        foreach ($stock as $productId => $totals) {
            $balance = $totals['in'] - $totals['out'];
            if ($balance != 0) {
                $product = DB::table('products')->where('id', $productId)->first(['id', 'name', 'sku']);
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

    private function generateAdjustmentNumber(): string
    {
        do {
            $number = 'ADJ-' . now()->format('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (DB::table('stock_adjustments')->where('adjustment_number', $number)->exists());

        return $number;
    }

    /**
     * Create GL entry for stock adjustment:
     *   Positive: Dr Inventory Asset, Cr Inventory Adjustment Gain
     *   Negative: Dr Inventory Adjustment Loss, Cr Inventory Asset
     */
    private function createJournalEntryForAdjustment(object $adjustment, $items, float $totalValue): void
    {
        // Determine net direction
        $netQty = 0;
        foreach ($items as $item) {
            $netQty += (float) $item->adjustment_quantity;
        }

        $inventoryAccountId = $this->resolveInventoryAssetAccountId();
        $adjustmentAccountId = $this->resolveInventoryAdjustmentAccountId();

        if (!$inventoryAccountId || !$adjustmentAccountId) {
            return; // Accounts not configured
        }

        $this->ensureOpenFiscalPeriod($adjustment->adjustment_date);

        // Upsert pattern (idempotent)
        $reference = $adjustment->adjustment_number;
        $existingHeader = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'StockAdjustment')
            ->first();

        if ($existingHeader) {
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $existingHeader->update([
                'date' => $adjustment->adjustment_date,
                'total_amount' => round($totalValue, 2),
                'status' => 'Post',
            ]);
            $entryCode = $existingHeader->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'StockAdjustment',
                'reference' => $reference,
                'date' => $adjustment->adjustment_date,
                'description' => 'Stock Adjustment ' . $reference,
                'total_amount' => round($totalValue, 2),
                'status' => 'Post',
            ]);
        }

        if ($netQty >= 0) {
            // Positive adjustment: Dr Inventory, Cr Adjustment Gain
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $inventoryAccountId,
                'debit' => round($totalValue, 2),
                'credit' => 0,
                'related_id_name' => 'StockAdjustment',
                'related_name_details' => $reference,
                'description' => 'Inventory increase - ' . $reference,
            ]);
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $adjustmentAccountId,
                'debit' => 0,
                'credit' => round($totalValue, 2),
                'related_id_name' => 'StockAdjustment',
                'related_name_details' => $reference,
                'description' => 'Inventory adjustment gain - ' . $reference,
            ]);
        } else {
            // Negative adjustment: Dr Adjustment Loss, Cr Inventory
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $adjustmentAccountId,
                'debit' => round($totalValue, 2),
                'credit' => 0,
                'related_id_name' => 'StockAdjustment',
                'related_name_details' => $reference,
                'description' => 'Inventory adjustment loss - ' . $reference,
            ]);
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $inventoryAccountId,
                'debit' => 0,
                'credit' => round($totalValue, 2),
                'related_id_name' => 'StockAdjustment',
                'related_name_details' => $reference,
                'description' => 'Inventory decrease - ' . $reference,
            ]);
        }

        // Sync account_postings cache
        $companyId = $adjustment->company_id ?? Auth::user()?->company_id;
        if ($companyId) {
            app(PostingService::class)->recalculatePostings($companyId);
        }
    }

    private function resolveInventoryAssetAccountId(): ?int
    {
        // Inventory asset is typically in 1xxx range
        return Account::where('AccType', 1)
            ->where('AccCode', 'like', '1%')
            ->where('AccName', 'like', '%inventory%')
            ->orderBy('AccCode')
            ->value('AccID')
            ?? Account::where('AccType', 1)
                ->where('AccCode', 'like', '1.1.5%')
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function resolveInventoryAdjustmentAccountId(): ?int
    {
        // Inventory adjustment gain/loss is typically in 4xxx or 6xxx range
        return Account::where('AccType', 1)
            ->where('AccCode', 'like', '4%')
            ->where('AccName', 'like', '%adjustment%')
            ->orderBy('AccCode')
            ->value('AccID')
            ?? Account::where('AccType', 1)
                ->where('AccCode', 'like', '6%')
                ->where('AccName', 'like', '%adjustment%')
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function generateNextEntryCode(): string
    {
        $lastCode = JournalEntry::whereNotNull('entry_code')
            ->where('entry_code', '!=', '')
            ->orderByDesc('id')
            ->value('entry_code');

        $nextNumber = 10001;
        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $nextNumber = (int) $matches[1] + 1;
        }

        return 'QID-' . $nextNumber;
    }
}
