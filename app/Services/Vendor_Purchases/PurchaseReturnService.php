<?php

namespace App\Services\Vendor_Purchases;

use App\Traits\EnsuresFiscalPeriod;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Models\Vendor_Purchases\PurchaseInvoiceDetail;
use App\Models\Vendor_Purchases\PurchaseReturn;
use App\Models\Vendor_Purchases\PurchaseReturnDetail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseReturnService
{
    use EnsuresFiscalPeriod;
    public function getPreviouslyReturnedQuantities(int $invoiceId, ?int $excludeReturnId = null): array
    {
        $query = PurchaseReturnDetail::query()
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_details.return_id')
            ->where('purchase_returns.invoice_id', $invoiceId)
            ->where('purchase_returns.status', '!=', 'rejected')
            ->where('purchase_returns.status', '!=', 'cancelled');

        if ($excludeReturnId !== null) {
            $query->where('purchase_returns.id', '!=', $excludeReturnId);
        }

        $results = $query
            ->select(
                'purchase_return_details.invoice_detail_id',
                'purchase_return_details.product_id',
                DB::raw('SUM(purchase_return_details.quantity) as total_returned')
            )
            ->groupBy('purchase_return_details.invoice_detail_id', 'purchase_return_details.product_id')
            ->get();

        $returned = [];
        foreach ($results as $row) {
            $key = $row->invoice_detail_id ?: ('p_' . $row->product_id);
            $returned[$key] = (float) $row->total_returned;
        }

        return $returned;
    }

    public function validateAndBuildItems(array $items, PurchaseInvoice $invoice, ?int $excludeReturnId = null): array
    {
        if (empty($items)) {
            throw ValidationException::withMessages([
                'items' => ['At least one return item is required.'],
            ]);
        }

        $previouslyReturned = $this->getPreviouslyReturnedQuantities($invoice->id, $excludeReturnId);

        $invoiceDetails = $invoice->items->keyBy('id');
        $invoiceDetailsByProduct = $invoice->items->keyBy('product_id');

        $validItems = [];
        $seenKeys = [];
        $totalSubtotal = 0;
        $totalTax = 0;

        foreach ($items as $idx => $item) {
            $returnQty = (float) ($item['return_qty'] ?? $item['quantity'] ?? 0);

            if ($returnQty <= 0) {
                continue;
            }

            $invoiceDetailId = !empty($item['invoice_detail_id']) ? (int) $item['invoice_detail_id'] : null;
            $productId = (int) ($item['product_id'] ?? 0);

            if (!$productId) {
                throw ValidationException::withMessages([
                    "items.{$idx}.product_id" => ['Product is required for each return line.'],
                ]);
            }

            $sourceDetail = null;
            if ($invoiceDetailId && $invoiceDetails->has($invoiceDetailId)) {
                $sourceDetail = $invoiceDetails->get($invoiceDetailId);
            } elseif ($invoiceDetailsByProduct->has($productId)) {
                $sourceDetail = $invoiceDetailsByProduct->get($productId);
                $invoiceDetailId = $sourceDetail->id;
            }

            if (!$sourceDetail) {
                throw ValidationException::withMessages([
                    "items.{$idx}.product_id" => ['Product does not exist on the selected Purchase Invoice.'],
                ]);
            }

            $dedupKey = $invoiceDetailId . '_' . $productId;
            if (isset($seenKeys[$dedupKey])) {
                throw ValidationException::withMessages([
                    "items.{$idx}" => ['Duplicate return line for the same invoice item.'],
                ]);
            }
            $seenKeys[$dedupKey] = true;

            $invoiceQty = (float) $sourceDetail->quantity;
            $returnedKey = $invoiceDetailId ?: ('p_' . $productId);
            $alreadyReturned = $previouslyReturned[$returnedKey] ?? 0;
            $availableQty = max(0, $invoiceQty - $alreadyReturned);

            if ($returnQty > $availableQty + 0.000001) {
                $productName = $sourceDetail->product?->name_en ?? $sourceDetail->product?->name_ar ?? "Product #{$productId}";
                throw ValidationException::withMessages([
                    "items.{$idx}.return_qty" => [
                        "Return quantity ({$returnQty}) for {$productName} exceeds remaining available quantity ({$availableQty}). Invoice qty: {$invoiceQty}, previously returned: {$alreadyReturned}."
                    ],
                ]);
            }

            if ($returnQty < 0) {
                throw ValidationException::withMessages([
                    "items.{$idx}.return_qty" => ['Return quantity cannot be negative.'],
                ]);
            }

            $unitId = (int) ($item['unit_id'] ?? 0);
            if (!$unitId) {
                $unitId = (int) $sourceDetail->unit_id;
            }

            $unitPrice = (float) $sourceDetail->unit_price;
            $taxPercentage = (float) ($sourceDetail->tax_percentage ?? 0);
            $lineNet = $returnQty * $unitPrice;
            $lineTax = round($lineNet * ($taxPercentage / 100), 2);

            $totalSubtotal += $lineNet;
            $totalTax += $lineTax;

            $batch = !empty($item['batch_number']) ? substr(trim((string) $item['batch_number']), 0, 100) : null;
            $serial = !empty($item['serial_number']) ? substr(trim((string) $item['serial_number']), 0, 100) : null;
            $condition = !empty($item['condition']) ? $item['condition'] : null;
            if ($condition !== null && !in_array($condition, ['new', 'used', 'damaged', 'defective'], true)) {
                $condition = null;
            }

            $validItems[] = [
                'invoice_detail_id' => $invoiceDetailId,
                'product_id' => $productId,
                'quantity' => $returnQty,
                'unit_id' => $unitId,
                'unit_price' => $unitPrice,
                'tax_percentage' => $taxPercentage,
                'tax_amount' => $lineTax,
                'batch_number' => $batch,
                'serial_number' => $serial,
                'return_reason_details' => !empty($item['return_reason_details']) ? trim((string) $item['return_reason_details']) : null,
                'condition' => $condition,
                'inspection_notes' => !empty($item['inspection_notes']) ? trim((string) $item['inspection_notes']) : null,
                'notes' => !empty($item['notes']) ? trim((string) $item['notes']) : null,
            ];
        }

        if (empty($validItems)) {
            throw ValidationException::withMessages([
                'items' => ['At least one item with return quantity greater than 0 is required.'],
            ]);
        }

        return [
            'items' => $validItems,
            'subtotal' => round($totalSubtotal, 2),
            'tax_amount' => round($totalTax, 2),
        ];
    }

    public function validateHeaderAgainstInvoice(array $data, PurchaseInvoice $invoice): void
    {
        $supplierId = (int) ($data['supplier_id'] ?? 0);
        if ($supplierId !== (int) $invoice->supplier_id) {
            throw ValidationException::withMessages([
                'supplier_id' => ['Supplier must match the selected Purchase Invoice supplier.'],
            ]);
        }

        $warehouseId = (int) ($data['warehouse_id'] ?? 0);
        if ($warehouseId !== (int) $invoice->warehouse_id) {
            throw ValidationException::withMessages([
                'warehouse_id' => ['Warehouse must match the selected Purchase Invoice warehouse.'],
            ]);
        }
    }

    public function computeTotals(float $subtotal, float $taxAmount, float $restockingFee): array
    {
        $totalAmount = round($subtotal + $taxAmount - $restockingFee, 2);
        $refundAmount = $totalAmount;

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total_amount' => max(0, $totalAmount),
            'refund_amount' => max(0, $refundAmount),
        ];
    }

    public function generateReturnNumber(): string
    {
        $prefix = 'PR-' . date('Ymd') . '-';
        $last = PurchaseReturn::where('return_number', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->lockForUpdate()
            ->first();

        $seq = 1;
        if ($last) {
            $suffix = substr($last->return_number, strlen($prefix));
            if (ctype_digit($suffix)) {
                $seq = (int) $suffix + 1;
            }
        }

        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function createPurchaseReturn(array $data): PurchaseReturn
    {
        return DB::transaction(function () use ($data) {
            $invoice = PurchaseInvoice::with('items.product')->findOrFail((int) $data['invoice_id']);

            $this->validateHeaderAgainstInvoice($data, $invoice);

            $built = $this->validateAndBuildItems($data['items'] ?? [], $invoice);
            $restockingFee = (float) ($data['restocking_fee'] ?? 0);
            if ($restockingFee < 0) {
                $restockingFee = 0;
            }
            $totals = $this->computeTotals($built['subtotal'], $built['tax_amount'], $restockingFee);

            $receivedBy = !empty($data['received_by']) ? (int) $data['received_by'] : null;
            $receivedDate = !empty($data['received_date']) ? $data['received_date'] : null;

            $returnNumber = !empty($data['return_number'])
                ? substr(trim((string) $data['return_number']), 0, 50)
                : $this->generateReturnNumber();

            $validReturnReasons = ['damaged', 'defective', 'wrong_item', 'excess_quantity', 'quality_issue', 'expired', 'other'];
            $returnReason = in_array($data['return_reason'] ?? null, $validReturnReasons, true)
                ? $data['return_reason']
                : 'other';

            $validReturnTypes = ['full_return', 'partial_return', 'exchange'];
            $returnType = in_array($data['return_type'] ?? null, $validReturnTypes, true)
                ? $data['return_type']
                : 'partial_return';

            $validStatuses = ['draft', 'requested', 'approved', 'completed', 'cancelled'];
            $status = in_array($data['status'] ?? null, $validStatuses, true)
                ? $data['status']
                : 'draft';

            $validRefundStatuses = ['pending', 'partial', 'completed', 'cancelled'];
            $refundStatus = in_array($data['refund_status'] ?? null, $validRefundStatuses, true)
                ? $data['refund_status']
                : 'pending';

            $purchaseReturn = PurchaseReturn::create([
                'return_number' => $returnNumber,
                'invoice_id' => $invoice->id,
                'supplier_id' => (int) $invoice->supplier_id,
                'warehouse_id' => (int) $invoice->warehouse_id,
                'return_date' => $data['return_date'],
                'return_reason' => $returnReason,
                'return_type' => $returnType,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'restocking_fee' => round($restockingFee, 2),
                'total_amount' => $totals['total_amount'],
                'refund_amount' => $totals['refund_amount'],
                'refund_status' => $refundStatus,
                'status' => $status,
                'approval_notes' => !empty($data['approval_notes']) ? trim((string) $data['approval_notes']) : null,
                'received_by' => $receivedBy,
                'received_date' => $receivedDate,
                'notes' => !empty($data['notes']) ? trim((string) $data['notes']) : null,
                'created_by' => Auth::id(),
            ]);

            foreach ($built['items'] as $item) {
                $purchaseReturn->details()->create($item);
            }

            // Create journal entry if return is approved/completed
            if (in_array($status, ['approved', 'completed'])) {
                $this->createJournalEntryForReturn($purchaseReturn, $totals);
            }

            return $purchaseReturn;
        });
    }

    public function updatePurchaseReturn(int $id, array $data): PurchaseReturn
    {
        return DB::transaction(function () use ($id, $data) {
            $purchaseReturn = PurchaseReturn::with('details')->findOrFail($id);
            $oldStatus = $purchaseReturn->status;

            $invoice = PurchaseInvoice::with('items.product')->findOrFail((int) $data['invoice_id']);

            $this->validateHeaderAgainstInvoice($data, $invoice);

            $built = $this->validateAndBuildItems($data['items'] ?? [], $invoice, $id);
            $restockingFee = (float) ($data['restocking_fee'] ?? 0);
            if ($restockingFee < 0) {
                $restockingFee = 0;
            }
            $totals = $this->computeTotals($built['subtotal'], $built['tax_amount'], $restockingFee);

            $receivedBy = !empty($data['received_by']) ? (int) $data['received_by'] : null;
            $receivedDate = !empty($data['received_date']) ? $data['received_date'] : null;

            $returnNumber = !empty($data['return_number'])
                ? substr(trim((string) $data['return_number']), 0, 50)
                : $purchaseReturn->return_number;

            $validReturnReasons = ['damaged', 'defective', 'wrong_item', 'excess_quantity', 'quality_issue', 'expired', 'other'];
            $returnReason = in_array($data['return_reason'] ?? null, $validReturnReasons, true)
                ? $data['return_reason']
                : ($purchaseReturn->return_reason ?? 'other');

            $validReturnTypes = ['full_return', 'partial_return', 'exchange'];
            $returnType = in_array($data['return_type'] ?? null, $validReturnTypes, true)
                ? $data['return_type']
                : ($purchaseReturn->return_type ?? 'partial_return');

            $validStatuses = ['draft', 'requested', 'approved', 'completed', 'cancelled'];
            $status = in_array($data['status'] ?? null, $validStatuses, true)
                ? $data['status']
                : ($purchaseReturn->status ?? 'draft');

            $validRefundStatuses = ['pending', 'partial', 'completed', 'cancelled'];
            $refundStatus = in_array($data['refund_status'] ?? null, $validRefundStatuses, true)
                ? $data['refund_status']
                : ($purchaseReturn->refund_status ?? 'pending');

            $newStatusIsPosted = in_array($status, ['approved', 'completed']);
            $oldStatusWasPosted = in_array($oldStatus, ['approved', 'completed']);

            $purchaseReturn->update([
                'return_number' => $returnNumber,
                'invoice_id' => $invoice->id,
                'supplier_id' => (int) $invoice->supplier_id,
                'warehouse_id' => (int) $invoice->warehouse_id,
                'return_date' => $data['return_date'],
                'return_reason' => $returnReason,
                'return_type' => $returnType,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'restocking_fee' => round($restockingFee, 2),
                'total_amount' => $totals['total_amount'],
                'refund_amount' => $totals['refund_amount'],
                'refund_status' => $refundStatus,
                'status' => $status,
                'approval_notes' => isset($data['approval_notes']) ? (trim((string) $data['approval_notes']) ?: null) : $purchaseReturn->approval_notes,
                'received_by' => $receivedBy,
                'received_date' => $receivedDate,
                'notes' => isset($data['notes']) ? (trim((string) $data['notes']) ?: null) : $purchaseReturn->notes,
            ]);

            $purchaseReturn->details()->delete();
            foreach ($built['items'] as $item) {
                $purchaseReturn->details()->create($item);
            }

            // Synchronize financial effects based on status transitions
            $freshReturn = $purchaseReturn->fresh();

            if ($newStatusIsPosted && !$oldStatusWasPosted) {
                $this->createJournalEntryForReturn($freshReturn, $totals);
            } elseif ($newStatusIsPosted && $oldStatusWasPosted) {
                $this->reverseJournalEntryForReturn($freshReturn);
                $this->createJournalEntryForReturn($freshReturn, $totals);
            } elseif (!$newStatusIsPosted && $oldStatusWasPosted) {
                $this->reverseJournalEntryForReturn($freshReturn);
            }

            return $freshReturn;
        });
    }

    public function getInvoiceWithReturnableQuantities(int $invoiceId, ?int $excludeReturnId = null): array
    {
        $invoice = PurchaseInvoice::with([
            'items.product',
            'supplier',
            'warehouse',
            'currency',
        ])->findOrFail($invoiceId);

        $returned = $this->getPreviouslyReturnedQuantities($invoiceId, $excludeReturnId);

        $details = $invoice->items->map(function (PurchaseInvoiceDetail $detail) use ($returned, $excludeReturnId) {
            $invoiceQty = (float) $detail->quantity;
            $key = $detail->id ?: ('p_' . $detail->product_id);
            $alreadyReturned = $returned[$key] ?? 0;
            $available = max(0, $invoiceQty - $alreadyReturned);

            return [
                'id' => $detail->id,
                'product_id' => $detail->product_id,
                'item_name_ar' => $detail->product?->name_ar ?? '',
                'item_name_en' => $detail->product?->name_en ?? '',
                'invoice_qty' => $invoiceQty,
                'returned_qty' => $alreadyReturned,
                'available_qty' => $available,
                'unit_id' => $detail->unit_id,
                'unit_price' => (float) $detail->unit_price,
                'discount_percentage' => (float) ($detail->discount_percentage ?? 0),
                'discount_amount' => (float) ($detail->discount_amount ?? 0),
                'tax_percentage' => (float) ($detail->tax_percentage ?? 0),
                'batch_number' => $detail->batch_number ?? '',
                'serial_number' => $detail->serial_number ?? '',
                'expiry_date' => $detail->expiry_date,
                'warehouse_id' => $detail->warehouse_id,
            ];
        })->values()->all();

        return [
            'invoice' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'invoice_date' => $invoice->invoice_date,
                'supplier_id' => $invoice->supplier_id,
                'warehouse_id' => $invoice->warehouse_id,
                'currency_id' => $invoice->currency_id,
                'exchange_rate' => (float) ($invoice->exchange_rate ?? 1),
                'supplier_name_ar' => $invoice->supplier?->name_ar ?? '',
                'supplier_name_en' => $invoice->supplier?->name_en ?? '',
                'warehouse_name_ar' => $invoice->warehouse?->name_ar ?? '',
                'warehouse_name_en' => $invoice->warehouse?->name ?? $invoice->warehouse?->name_en ?? '',
                'currency_code' => $invoice->currency?->code ?? '',
            ],
            'details' => $details,
        ];
    }

    /**
     * Create journal entry for purchase return (Debit Note):
     *   Dr Accounts Payable (total return amount)
     *   Cr Purchase/Expense (return subtotal)
     *   Cr Input Tax (return tax amount)
     */
    private function createJournalEntryForReturn(PurchaseReturn $return, array $totals): void
    {
        $totalAmount = (float) ($totals['total_amount'] ?? $return->total_amount ?? 0);
        $taxAmount = (float) ($totals['tax_amount'] ?? $return->tax_amount ?? 0);
        $netAmount = $totalAmount - $taxAmount;

        $apAccountId = $this->resolveAccountsPayableAccountId($return->supplier_id);
        $purchaseAccountId = $this->resolvePurchaseAccountId();
        $taxAccountId = $this->resolveInputTaxAccountId();

        if (!$apAccountId || !$purchaseAccountId) {
            return;
        }

        $reference = $return->return_number;

        // Upsert pattern (idempotent)
        $this->ensureOpenFiscalPeriod($return->return_date);
        $existingHeader = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'PurchaseReturn')
            ->first();

        if ($existingHeader) {
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $existingHeader->update([
                'date' => $return->return_date,
                'total_amount' => $totalAmount,
                'status' => 'Post',
            ]);
            $entryCode = $existingHeader->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'PurchaseReturn',
            'reference' => $reference,
            'date' => $return->return_date,
            'description' => 'Purchase Return ' . $reference,
            'total_amount' => $totalAmount,
            'status' => 'Post',
            ]);
        }

        // Dr Accounts Payable
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $apAccountId,
            'debit' => $totalAmount,
            'credit' => 0,
            'related_id_name' => 'PurchaseReturn',
            'related_name_details' => $reference,
            'description' => 'AP reduction - Return ' . $reference,
        ]);

        // Cr Purchase/Expense
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $purchaseAccountId,
            'debit' => 0,
            'credit' => $netAmount,
            'related_id_name' => 'PurchaseReturn',
            'related_name_details' => $reference,
            'description' => 'Purchase reversal - ' . $reference,
        ]);

        // Cr Input Tax (if applicable)
        if ($taxAmount > 0 && $taxAccountId) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $taxAccountId,
                'debit' => 0,
                'credit' => $taxAmount,
                'related_id_name' => 'PurchaseReturn',
                'related_name_details' => $reference,
                'description' => 'Input Tax reversal - ' . $reference,
            ]);
        }

        // Sync account_postings cache for Trial Balance consistency
        $companyId = $return->company_id ?? Auth::user()?->company_id;
        if ($companyId) {
            app(PostingService::class)->recalculatePostings($companyId);
        }
    }

    private function resolveAccountsPayableAccountId(?int $supplierId = null): ?int
    {
        if ($supplierId) {
            $supplier = \App\Models\Vendor_Purchases\Supplier::find($supplierId);
            if ($supplier && $supplier->account_id) {
                return $supplier->account_id;
            }
        }
        return Account::where('AccCode', 'like', '2%')->where('AccType', 1)->value('AccID');
    }

    private function resolvePurchaseAccountId(): ?int
    {
        return Account::where('AccType', 1)
            ->where('AccCode', 'like', '5%')
            ->orderBy('AccCode')
            ->value('AccID');
    }

    private function resolveInputTaxAccountId(): ?int
    {
        return Account::where(function ($q) {
            $q->where('AccCode', 'like', '2.1.3%')
              ->orWhere('AccCode', 'like', '213%');
        })->value('AccID');
    }

    private function generateNextEntryCode(): string
    {
        $nextNumber = 10001;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            if (preg_match('/(\d+)$/', $entryCode, $matches)) {
                $nextNumber = max($nextNumber, (int) $matches[1] + 1);
            }
        }

        return 'QID-' . $nextNumber;
    }

    /**
     * P0-06: Create a reversal journal for a purchase return instead of deleting the original.
     * Called when status changes from approved/completed to draft/requested/cancelled.
     */
    private function reverseJournalEntryForReturn(PurchaseReturn $return): void
    {
        $reference = $return->return_number;
        $header = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'PurchaseReturn')
            ->first();

        if ($header && in_array($header->status, ['Post', 'posted'])) {
            // Posted: create reversal, preserve original
            app(\App\Services\Accounting\JournalReversalService::class)->createReversal(
                $header->entry_code,
                'Purchase Return cancellation - ' . $reference
            );
        } elseif ($header) {
            // Unposted: safe to delete
            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $header->delete();
        }
    }
}
