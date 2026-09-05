<?php

namespace App\Services\Vendor_Purchases;

use App\Models\Vendor_Purchases\GoodsReceipt;
use App\Models\Vendor_Purchases\GoodsReceiptDetail;
use App\Models\Vendor_Purchases\PurchaseOrder;
use App\Models\Vendor_Purchases\PurchaseOrderItem;
use Illuminate\Support\Facades\DB;

class GoodsReceiptService
{
    public function createGoodsReceipt(array $data): GoodsReceipt
    {
        return DB::transaction(function () use ($data) {
            $receipt = GoodsReceipt::create([
                'receipt_number' => $this->generateReceiptNumber(),
                'order_id' => $data['order_id'],
                'invoice_id' => $data['invoice_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'],
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

                GoodsReceiptDetail::create([
                    'receipt_id' => $receipt->id,
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

            if ($receipt->status !== 'draft' && $receipt->status !== 'received') {
                throw new \Exception('Only draft or received receipts can be approved.');
            }

            $receipt->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
            ]);

            // Create inventory movements and update product quantities for accepted items
            foreach ($receipt->details as $detail) {
                if ($detail->is_accepted && $detail->accepted_quantity > 0) {
                    $this->createStockMovement($receipt, $detail);

                    // Update product quantity
                    DB::table('products')
                        ->where('id', $detail->product_id)
                        ->increment('quantity', (float) $detail->accepted_quantity);
                }
            }

            // Update purchase order received quantities
            $this->updatePurchaseOrderQuantities($receipt);

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
                throw new \Exception('Approved receipts cannot be cancelled. Use a reversal instead.');
            }

            $receipt->update(['status' => 'cancelled']);

            return $receipt;
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

    private function createStockMovement(GoodsReceipt $receipt, GoodsReceiptDetail $detail): void
    {
        $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $receipt->receipt_date,
            'type' => 'purchase',
            'direction' => 'in',
            'reference_id' => $receipt->id,
            'reference_type' => 'goods_receipt',
            'voucher_num' => $receipt->receipt_number,
            'warehouse_id' => $receipt->warehouse_id,
            'company_id' => $receipt->order->company_id ?? 1,
            'created_by' => auth()->id(),
            'notes' => "Goods Receipt: {$receipt->receipt_number}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $movementHeaderId,
            'product_id' => $detail->product_id,
            'unit_id' => $detail->unit_id,
            'quantity' => $detail->accepted_quantity,
            'cost_price' => $detail->unit_cost,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
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

        // Update PO items
        foreach ($order->items as $item) {
            $received = (float) ($receivedByProduct[$item->product_id] ?? 0);
            $ordered = (float) $item->ordered_quantity;

            if ($received >= $ordered - 0.0001) {
                $item->update([
                    'received_quantity' => $ordered,
                    'status' => 'fully_received',
                ]);
            } elseif ($received > 0) {
                $item->update([
                    'received_quantity' => $received,
                    'status' => 'partially_received',
                ]);
            }
        }

        // Update PO overall status
        $totalOrdered = $order->items->sum('ordered_quantity');
        $totalReceived = $order->items->sum('received_quantity');

        if ($totalReceived >= $totalOrdered - 0.0001) {
            $order->update(['status' => 'fully_received']);
        } elseif ($totalReceived > 0) {
            $order->update(['status' => 'partially_received']);
        }
    }

    private function generateReceiptNumber(): string
    {
        do {
            $number = 'GRN-' . now()->format('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (GoodsReceipt::where('receipt_number', $number)->exists());

        return $number;
    }
}
