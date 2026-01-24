<?php

namespace App\Services\Vendor_Purchases;

use App\Models\Vendor_Purchases\PurchaseQuotation;
use App\Models\Vendor_Purchases\PurchaseOrder;
use App\Models\Vendor_Purchases\PurchaseOrderItem;
use App\Models\Vendor_Purchases\PurchaseQuotationItem;
use Illuminate\Support\Facades\DB;
use Exception;

class PurchaseConversionService
{
    /**
     * Convert Purchase Quotation items to Purchase Order(s).
     *
     * @param int $quotationId
     * @param array $itemsToConvert Array of ['item_id' => int, 'quantity' => float]
     * @param int $userId
     * @return PurchaseOrder
     * @throws Exception
     */
    public function convertQuotationToPO($quotationId, array $itemsToConvert, $userId)
    {
        return DB::transaction(function () use ($quotationId, $itemsToConvert, $userId) {
            $quotation = PurchaseQuotation::findOrFail($quotationId);

            // 1. Validate quotation status
            if ($quotation->status !== 'approved') {
                throw new Exception("Only approved quotations can be converted.");
            }

            // Group items by vendor (though Quotation usually has one vendor, strictly speaking)
            // But logic allows partial items selection.
            // If the Quotation has a vendor_id, the PO will be for that vendor.
            
            $po = PurchaseOrder::create([
                'order_number' => 'PO-' . time(), // Needs better generation logic
                'supplier_id' => $quotation->vendor_id,
                'quotation_id' => $quotation->id,
                'currency_id' => $quotation->currency_id,
                'exchange_rate' => $quotation->exchange_rate,
                'order_date' => now(),
                'status' => 'draft', // Initial status
                'priority' => $quotation->priority,
                'warehouse_id' => 1, // Default or derived from items?
                'created_by' => $userId,
                // Copy financial defaults (will recalculate later)
                'subtotal' => 0,
                'total_amount' => 0,
            ]);

            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;
            $itemsConvertedCount = 0;

            foreach ($itemsToConvert as $itemData) {
                $quotationItem = PurchaseQuotationItem::findOrFail($itemData['item_id']);
                
                if ($quotationItem->quotation_id !== $quotation->id) {
                    throw new Exception("Item {$itemData['item_id']} does not belong to quotation {$quotation->id}");
                }

                $convertQty = $itemData['quantity'];
                
                // 4. Quantity validation
                $pendingQty = $quotationItem->quantity - $quotationItem->converted_quantity;
                if ($convertQty > $pendingQty) {
                    throw new Exception("Quantity to convert ({$convertQty}) exceeds pending quantity ({$pendingQty}) for item {$quotationItem->item_name_ar}");
                }

                // 5. Insert purchase_order_item
                $poItem = PurchaseOrderItem::create([
                    'order_id' => $po->id,
                    'quotation_item_id' => $quotationItem->id,
                    'product_id' => $quotationItem->product_id,
                    'service_id' => $quotationItem->service_id,
                    'item_code' => $quotationItem->item_code,
                    'item_name_ar' => $quotationItem->item_name_ar,
                    'item_name_en' => $quotationItem->item_name_en,
                    'description_ar' => $quotationItem->description_ar,
                    'description_en' => $quotationItem->description_en,
                    'quantity' => $convertQty,
                    'unit_id' => $quotationItem->unit_id,
                    'unit_price' => $quotationItem->unit_price,
                    'discount_percent' => $quotationItem->discount_percent,
                    'discount_amount' => $quotationItem->discount_amount, // Need to verify if per unit or total
                    'tax_id' => $quotationItem->tax_id,
                    'tax_amount' => $quotationItem->tax_amount,
                    'delivery_date' => $quotationItem->promised_delivery_date,
                    'warehouse_id' => $quotationItem->warehouse_id ?? $po->warehouse_id,
                    'cost_center_id' => $quotationItem->cost_center_id,
                    'project_id' => $quotationItem->project_id,
                ]);

                // Update converted quantity
                $quotationItem->increment('converted_quantity', $convertQty);

                // Accumulate totals
                $subtotal += $poItem->line_total; // Generated column might not be available immediately in memory, usually safe to recalc
                // $poItem->line_total is generated in DB. We might need to refresh or calc manually.
                $netPrice = $quotationItem->unit_price - $quotationItem->discount_amount;
                $lineTotal = $convertQty * $netPrice;
                $taxTotal = $lineTotal * ($quotationItem->tax_amount / 100);
                
                $subtotal += $lineTotal;
                $totalTax += $taxTotal;
                $totalDiscount += ($quotationItem->discount_amount * $convertQty);
                
                $itemsConvertedCount++;
            }

            // Update PO Totals
            $po->update([
                'subtotal' => $subtotal,
                'tax_amount' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $subtotal + $totalTax, // Simplified logic
            ]);

            // 7. Update Quotation Status
            $allFullyConverted = true;
            foreach ($quotation->items as $item) {
                if (($item->quantity - $item->converted_quantity) > 0) {
                    $allFullyConverted = false;
                    break;
                }
            }

            if ($allFullyConverted) {
                $quotation->update([
                    'status' => 'converted_to_po',
                    'converted_to_po_id' => $po->id, // Last PO link
                    'converted_date' => now(),
                ]);
            } else {
                $quotation->update([
                    'status' => 'vendor_replied', // Or 'partially_converted'
                ]);
            }

            return $po;
        });
    }
}
