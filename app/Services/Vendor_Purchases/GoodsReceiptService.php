<?php

namespace App\Services\Vendor_Purchases;

use App\Models\Vendor_Purchases\GoodsReceipt;
use App\Models\Vendor_Purchases\GoodsReceiptDetail;
use App\Models\Vendor_Purchases\PurchaseOrder;
use App\Models\Vendor_Purchases\PurchaseOrderItem;
use App\Models\Vendor_Purchases\PurchaseInvoiceDetail;
use Illuminate\Support\Facades\DB;
use App\Services\CompanyContext;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\UnitConversionService;

class GoodsReceiptService
{
    public function __construct(
        private WeightedAverageCostService $weightedAverageCost,
        private CompanyContext $companyContext,
    ) {}

    public function createGoodsReceipt(array $data): GoodsReceipt
    {
        return DB::transaction(function () use ($data) {
            $companyId = $this->companyContext->id();

            $this->assertOwnership($companyId, (int) $data['warehouse_id'], array_map(
                'intval',
                array_column($data['items'], 'product_id')
            ));

            $receipt = GoodsReceipt::create([
                'receipt_number' => $this->generateReceiptNumber(),
                'order_id' => $data['order_id'],
                'invoice_id' => $data['invoice_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'],
                'company_id' => $companyId,
                'receipt_date' => $data['receipt_date'],
                'receipt_time' => $data['receipt_time'] ?? now()->format('H:i:s'),
                'received_by' => $data['received_by'] ?? auth()->id(),
                'checked_by' => $data['checked_by'] ?? null,
                'approved_by' => $data['approved_by'] ?? null,
                'receipt_type' => $data['receipt_type'] ?? 'partial',
                'status' => 'draft',
                'quality_status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'inspection_notes' => $data['inspection_notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $totalQuantity = 0;
            $totalValue = 0;
            $totalItems = 0;

            foreach ($data['items'] as $item) {
                $acceptedQty = (float) ($item['accepted_quantity'] ?? $item['quantity_received']);
                $rejectedQty = (float) ($item['rejected_quantity'] ?? 0);
                $receivedQty = $acceptedQty + $rejectedQty;

                if (! empty($item['invoice_detail_id'])) {
                    $invoiceDetail = PurchaseInvoiceDetail::findOrFail((int) $item['invoice_detail_id']);
                    if ((int) $invoiceDetail->product_id !== (int) $item['product_id']
                        || (int) $invoiceDetail->warehouse_id !== (int) $data['warehouse_id']) {
                        throw new \RuntimeException('Goods Receipt detail does not match its Purchase Invoice Detail.');
                    }
                }

                GoodsReceiptDetail::create([
                    'receipt_id' => $receipt->id,
                    'invoice_detail_id' => $item['invoice_detail_id'] ?? null,
                    'product_id' => $item['product_id'],
                    'quantity_received' => $receivedQty,
                    'unit_id' => $item['unit_id'],
                    'unit_cost' => $item['unit_cost'] ?? 0,
                    'batch_number' => $item['batch_number'] ?? null,
                    'serial_number' => $item['serial_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'production_date' => $item['production_date'] ?? null,
                    'shelf_location' => $item['shelf_location'] ?? null,
                    'quality_status' => $item['quality_status'] ?? 'good',
                    'quality_notes' => $item['quality_notes'] ?? null,
                    'is_accepted' => $rejectedQty <= 0,
                    'accepted_quantity' => $acceptedQty,
                    'rejected_quantity' => $rejectedQty,
                    'rejection_reason' => $item['rejection_reason'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);

                $totalQuantity += $receivedQty;
                $totalValue += $receivedQty * (float) ($item['unit_cost'] ?? 0);
                $totalItems++;
            }

            $receipt->update([
                'total_items' => $totalItems,
                'total_quantity' => $totalQuantity,
                'total_value' => round($totalValue, 2),
            ]);

            return $receipt;
        });
    }

    public function approveReceipt(GoodsReceipt $receipt): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt) {
            // Idempotent: if already approved, return without error
            if ($receipt->status === 'approved') {
                return $receipt->fresh();
            }

            if (! in_array($receipt->status, ['draft', 'received', 'checked'], true)) {
                throw new \Exception('Only draft, received, or checked receipts can be approved.');
            }

            // company_id may be missing on legacy rows created before Phase 6;
            // the active company's user approving is the best-available owner.
            $receipt->company_id = $receipt->company_id ?: $this->companyContext->id();

            $receipt->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
            ]);

            // Create inventory movements and update product quantities for accepted items
            $unitConversionService = app(UnitConversionService::class);
            foreach ($receipt->details as $detail) {
                if ($detail->is_accepted && $detail->accepted_quantity > 0) {
                    $conversion = $unitConversionService->toBase(
                        (int) $detail->product_id,
                        (int) $detail->unit_id,
                        (string) $detail->accepted_quantity
                    );

                    $this->createStockMovement($receipt, $detail, $conversion);

                    // Update product quantity
                    DB::table('products')
                        ->where('id', $detail->product_id)
                        ->increment('quantity', (float) bcadd($conversion['base_quantity'], '0', 6));
                }
            }

            // Update purchase order received quantities
            $this->updatePurchaseOrderQuantities($receipt);
            $this->updatePurchaseInvoiceQuantities($receipt);

            // NOTE: No GL journal entry is created here.
            //
            // ARCHITECTURE DECISION (Forensic Audit — Prompt #2):
            //
            // The ZodicERP architecture is "Invoice-driven inventory recognition":
            //   - Purchase Invoice creates: Dr Purchase/COGS, Cr Accounts Payable
            //   - The GRN is purely an operational/warehouse transaction
            //   - No GRNI (Goods Received Not Invoiced) account exists in the chart of accounts
            //   - No receipt allocation or matching concept exists
            //   - The Purchase Invoice is the sole financial trigger for purchases
            //
            // Using account 501 (Purchase/COGS) as a GRNI proxy would cause incorrect
            // account balances when GRN and Invoice amounts differ, because the residual
            // would sit in an expense account rather than a proper clearing account.
            //
            // The GRN should remain operational-only until a proper GRNI account
            // and receipt allocation mechanism are added to the architecture.

            return $receipt->fresh();
        });
    }

    public function cancelReceipt(GoodsReceipt $receipt): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt) {
            if ($receipt->status === 'approved') {
                throw new \Exception('Approved receipts cannot be cancelled. Reverse the receipt instead.');
            }

            $receipt->update(['status' => 'cancelled']);

            return $receipt;
        });
    }

    /**
     * Phase 6 — reverse an APPROVED receipt exactly.
     *
     * Every accepted detail's inbound ICT is negated through WAC::reverse
     * (source_type 'goods_receipt_reversal', reversal_of_id set), the
     * inventory movement is stamped [REVERSED date], derived product quantity
     * is decremented, PO received quantities are recomputed, and the receipt
     * status becomes 'cancelled' (enum-compatible terminal state).
     *
     * Refused (whole reversal rolls back) when the received stock was already
     * consumed downstream — WAC refuses a negative balance.
     */
    public function reverseReceipt(GoodsReceipt $receipt): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt) {
            // Idempotency backstop FIRST: a receipt whose movements are
            // already stamped [REVERSED] was reversed before — return
            // unchanged regardless of its current (terminal) status.
            $alreadyReversed = DB::table('inventory_movement_headers')
                ->where('reference_type', 'goods_receipt')
                ->where('reference_id', $receipt->id)
                ->where('notes', 'like', '%[REVERSED%')
                ->exists();
            if ($alreadyReversed) {
                return $receipt->fresh();
            }

            if ($receipt->status !== 'approved') {
                throw new \Exception('Only approved receipts can be reversed.');
            }

            $companyId = (int) ($receipt->company_id ?: $this->companyContext->id());
            $today = now()->toDateString();
            $reverseDate = max((string) $receipt->receipt_date, $today);

            $detailIds = $receipt->details()
                ->where('is_accepted', true)
                ->where('accepted_quantity', '>', 0)
                ->pluck('id');

            $originalTxs = $detailIds->isEmpty() ? collect() : DB::table('inventory_cost_transactions')
                ->where('company_id', $companyId)
                ->where('source_type', 'goods_receipt_detail')
                ->whereIn('source_id', $detailIds)
                ->orderBy('id')
                ->get();

            if ($originalTxs->isEmpty()) {
                throw new \Exception(
                    'This receipt has no cost transactions to reverse (legacy pre-engine row). Use reconciliation instead.'
                );
            }

            foreach ($originalTxs as $tx) {
                $this->weightedAverageCost->reverse(
                    (int) $tx->id,
                    $reverseDate,
                    'goods_receipt_reversal',
                    (int) $tx->id
                );

                // Derived quantity rollback: the original approval incremented
                // products.quantity by the base quantity — undo exactly that.
                DB::table('products')
                    ->where('id', $tx->product_id)
                    ->decrement('quantity', (float) abs((float) $tx->quantity_delta));
            }

            // Stamp the movement as reversed (audit-visible on the stock card).
            DB::table('inventory_movement_headers')
                ->where('reference_type', 'goods_receipt')
                ->where('reference_id', $receipt->id)
                ->update([
                    'notes' => DB::raw("CONCAT(COALESCE(notes, ''), ' [REVERSED {$reverseDate}]')"),
                ]);

            // Terminal status FIRST, then recompute: PO received quantities
            // accumulate over approved receipts only, so the reversed receipt
            // must not count itself anymore.
            $receipt->update(['status' => 'cancelled']);
            $this->updatePurchaseOrderQuantities($receipt);

            return $receipt->fresh();
        });
    }

    public function receiveItems(GoodsReceipt $receipt): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt) {
            $receipt->update([
                'status' => 'received',
                'received_by' => auth()->id(),
            ]);

            return $receipt;
        });
    }

    public function checkItems(GoodsReceipt $receipt, string $qualityStatus, ?string $inspectionNotes = null): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt, $qualityStatus, $inspectionNotes) {
            $acceptedCount = $receipt->details()->where('is_accepted', true)->count();
            $rejectedCount = $receipt->details()->where('is_accepted', false)->count();

            if ($acceptedCount > 0 && $rejectedCount > 0) {
                $qualityStatus = 'partial';
            } elseif ($rejectedCount > 0) {
                $qualityStatus = 'failed';
            } else {
                $qualityStatus = 'passed';
            }

            $receipt->update([
                'status' => 'checked',
                'quality_status' => $qualityStatus,
                'inspection_notes' => $inspectionNotes ?? $receipt->inspection_notes,
                'checked_by' => auth()->id(),
            ]);

            return $receipt;
        });
    }

    private function createStockMovement(GoodsReceipt $receipt, GoodsReceiptDetail $detail, ?array $conversion = null): void
    {
        $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $receipt->receipt_date,
            'type' => 'purchase',
            'direction' => 'in',
            'reference_id' => $receipt->id,
            'reference_type' => 'goods_receipt',
            'voucher_num' => $receipt->receipt_number,
            'warehouse_id' => $receipt->warehouse_id,
            'company_id' => app(CompanyContext::class)->id(),
            'created_by' => auth()->id(),
            'notes' => "Goods Receipt: {$receipt->receipt_number}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $quantity = $conversion !== null ? $conversion['base_quantity'] : (string) $detail->accepted_quantity;
        $conversionFactorSnapshot = $conversion['conversion_factor'] ?? '1.000000';

        $movementLineId = DB::table('inventory_movement_lines')->insertGetId([
            'stock_movement_id' => $movementHeaderId,
            'product_id' => $detail->product_id,
            'unit_id' => $detail->unit_id,
            'quantity' => $quantity,
            'cost_price' => $detail->unit_cost,
            'conversion_factor_snapshot' => $conversionFactorSnapshot,
            'original_quantity' => $detail->accepted_quantity,
            'goods_receipt_detail_id' => $detail->id,
            'purchase_invoice_detail_id' => $detail->invoice_detail_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->weightedAverageCost->applyInbound(
            (int) $detail->product_id,
            (int) $receipt->warehouse_id,
            $quantity,
            (string) $detail->unit_cost,
            'goods_receipt_detail',
            (int) $detail->id,
            (string) $receipt->receipt_date,
            $movementHeaderId,
            $movementLineId,
        );
    }

    private function updatePurchaseOrderQuantities(GoodsReceipt $receipt): void
    {
        if (!$receipt->order_id) {
            return;
        }

        $order = PurchaseOrder::find($receipt->order_id);
        if (!$order) {
            return;
        }

        // Calculate total received quantity per product from all approved receipts
        $receivedByProduct = GoodsReceipt::query()
            ->join('goods_receipt_details', 'goods_receipt_details.receipt_id', '=', 'goods_receipts.id')
            ->where('goods_receipts.order_id', $receipt->order_id)
            ->where('goods_receipts.status', 'approved')
            ->whereNull('goods_receipts.deleted_at')
            ->select('goods_receipt_details.product_id', DB::raw('SUM(goods_receipt_details.accepted_quantity) as total_received'))
            ->groupBy('goods_receipt_details.product_id')
            ->pluck('total_received', 'product_id');

        // Update PO items. Received is written UNCONDITIONALLY (clamped to the
        // ordered quantity): a reversal recomputes to zero and must actually
        // reset the accumulated figure, not silently keep the stale one.
        foreach ($order->items as $item) {
            $received = (float) ($receivedByProduct[$item->product_id] ?? 0);
            $ordered = (float) $item->ordered_quantity;

            $item->update([
                'received_quantity' => min($received, $ordered),
            ]);
        }

        // Update PO overall status
        $totalOrdered = $order->items->sum('ordered_quantity');
        $totalReceived = $order->items->sum('received_quantity');

        if ($totalReceived >= $totalOrdered - 0.0001) {
            $order->update(['status' => 'fully_received']);
        } elseif ($totalReceived > 0) {
            $order->update(['status' => 'partially_received']);
        } else {
            // Everything received has been reversed — back to the plain
            // approved state.
            $order->update(['status' => 'approved']);
        }
    }

    private function updatePurchaseInvoiceQuantities(GoodsReceipt $receipt): void
    {
        $details = GoodsReceiptDetail::query()
            ->where('receipt_id', $receipt->id)
            ->whereNotNull('invoice_detail_id')
            ->where('is_accepted', true)
            ->select('invoice_detail_id', DB::raw('SUM(accepted_quantity) as accepted_total'))
            ->groupBy('invoice_detail_id')
            ->get();

        foreach ($details as $detail) {
            $invoiceDetail = PurchaseInvoiceDetail::lockForUpdate()->find($detail->invoice_detail_id);
            if (! $invoiceDetail) {
                continue;
            }

            $received = GoodsReceiptDetail::query()
                ->where('invoice_detail_id', $invoiceDetail->id)
                ->where('is_accepted', true)
                ->whereHas('receipt', fn ($query) => $query->where('status', 'approved')->whereNull('deleted_at'))
                ->sum('accepted_quantity');

            $invoiceDetail->update([
                'received_quantity' => min((float) $invoiceDetail->quantity, (float) $received),
            ]);
        }
    }

    private function generateReceiptNumber(): string
    {
        do {
            $number = 'GRN-' . now()->format('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (GoodsReceipt::where('receipt_number', $number)->exists());

        return $number;
    }

    /**
     * The referenced master data must belong to the active company — the WAC
     * engine would refuse later, but the boundary rejects the request itself
     * (404, do not leak other companies' records).
     */
    private function assertOwnership(int $companyId, int $warehouseId, array $productIds): void
    {
        $warehouseOwner = DB::table('warehouses')->where('id', $warehouseId)->value('company_id');
        abort_unless((int) $warehouseOwner === $companyId, 404, 'Warehouse not found.');

        $productOwners = DB::table('products')
            ->whereIn('id', array_unique($productIds))
            ->pluck('company_id', 'id');

        foreach (array_unique($productIds) as $productId) {
            abort_unless((int) ($productOwners[$productId] ?? 0) === $companyId, 404, 'Product not found.');
        }
    }
}
