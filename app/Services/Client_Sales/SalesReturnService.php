<?php

namespace App\Services\Client_Sales;

use App\Traits\EnsuresFiscalPeriod;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Client_Sales\SalesInvoiceDetail;
use App\Models\Client_Sales\SalesReturn;
use App\Models\Client_Sales\SalesReturnDetail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesReturnService
{
    use EnsuresFiscalPeriod;
    public function getPreviouslyReturnedQuantities(int $invoiceId, ?int $excludeReturnId = null): array
    {
        $query = SalesReturnDetail::query()
            ->join('sales_returns', 'sales_returns.id', '=', 'sales_return_details.return_id')
            ->where('sales_returns.invoice_id', $invoiceId)
            ->where('sales_returns.status', '!=', 'rejected')
            ->where('sales_returns.status', '!=', 'cancelled');

        if ($excludeReturnId !== null) {
            $query->where('sales_returns.id', '!=', $excludeReturnId);
        }

        $results = $query
            ->select(
                'sales_return_details.invoice_detail_id',
                'sales_return_details.product_id',
                DB::raw('SUM(sales_return_details.quantity) as total_returned')
            )
            ->groupBy('sales_return_details.invoice_detail_id', 'sales_return_details.product_id')
            ->get();

        $returned = [];
        foreach ($results as $row) {
            $key = $row->invoice_detail_id ?: ('s_' . $row->product_id);
            $returned[$key] = (float) $row->total_returned;
        }

        return $returned;
    }

    public function getPreviouslyReturnedQuantitiesForInvoices(array $invoiceIds): array
    {
        $invoiceIds = array_values(array_unique(array_map('intval', array_filter($invoiceIds))));
        if (empty($invoiceIds)) {
            return [];
        }

        $results = SalesReturnDetail::query()
            ->join('sales_returns', 'sales_returns.id', '=', 'sales_return_details.return_id')
            ->whereIn('sales_returns.invoice_id', $invoiceIds)
            ->where('sales_returns.status', '!=', 'rejected')
            ->where('sales_returns.status', '!=', 'cancelled')
            ->select(
                'sales_returns.invoice_id',
                'sales_return_details.invoice_detail_id',
                'sales_return_details.product_id',
                DB::raw('SUM(sales_return_details.quantity) as total_returned')
            )
            ->groupBy(
                'sales_returns.invoice_id',
                'sales_return_details.invoice_detail_id',
                'sales_return_details.product_id'
            )
            ->get();

        $returnedByInvoice = [];
        foreach ($results as $row) {
            $invoiceId = (int) $row->invoice_id;
            $key = $row->invoice_detail_id ?: ('s_' . $row->product_id);
            if (!isset($returnedByInvoice[$invoiceId])) {
                $returnedByInvoice[$invoiceId] = [];
            }
            $returnedByInvoice[$invoiceId][$key] = (float) $row->total_returned;
        }

        return $returnedByInvoice;
    }

    public function validateAndBuildItems(array $items, SalesInvoice $invoice, ?int $excludeReturnId = null): array
    {
        if (empty($items)) {
            throw ValidationException::withMessages([
                'items' => ['At least one return item is required.'],
            ]);
        }

        $previouslyReturned = $this->getPreviouslyReturnedQuantities($invoice->id, $excludeReturnId);

        $invoiceDetails = $invoice->details->keyBy('id');
        $invoiceDetailsByProduct = $invoice->details->keyBy('product_id');

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
                    "items.{$idx}.product_id" => ['Product does not exist on the selected Sales Invoice.'],
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
            $returnedKey = $invoiceDetailId ?: ('s_' . $productId);
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
            $taxPercentage = (float) ($item['tax_percentage'] ?? 0);
            if ($taxPercentage <= 0 && $sourceDetail->tax_id) {
                $taxType = $sourceDetail->tax;
                if ($taxType) {
                    $taxPercentage = (float) $taxType->rate;
                }
            }
            if ($taxPercentage <= 0 && $sourceDetail->tax_amount > 0 && $invoiceQty > 0) {
                $netAmount = $invoiceQty * $unitPrice;
                if ($netAmount > 0) {
                    $taxPercentage = round(($sourceDetail->tax_amount / $netAmount) * 100, 2);
                }
            }

            $netAmount = $returnQty * $unitPrice;
            $lineTax = round($netAmount * ($taxPercentage / 100), 2);

            $totalSubtotal += $netAmount;
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
                'line_total' => round($netAmount + $lineTax, 2),
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

    public function validateHeaderAgainstInvoice(array $data, SalesInvoice $invoice): void
    {
        $customerId = (int) ($data['customer_id'] ?? 0);
        if ($customerId !== (int) $invoice->customer_id) {
            throw ValidationException::withMessages([
                'customer_id' => ['Customer must match the selected Sales Invoice customer.'],
            ]);
        }

        $warehouseId = (int) ($data['warehouse_id'] ?? 0);
        if ($warehouseId !== (int) $invoice->warehouse_id) {
            throw ValidationException::withMessages([
                'warehouse_id' => ['Warehouse must match the selected Sales Invoice warehouse.'],
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
        $prefix = 'SR-' . date('Ymd') . '-';
        $last = SalesReturn::where('return_number', 'like', $prefix . '%')
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

    public function createSalesReturn(array $data): SalesReturn
    {
        return DB::transaction(function () use ($data) {
            $invoice = SalesInvoice::with('details.product', 'details.tax')->findOrFail((int) $data['invoice_id']);

            $this->validateHeaderAgainstInvoice($data, $invoice);

            $built = $this->validateAndBuildItems($data['items'] ?? [], $invoice);
            $restockingFee = (float) ($data['restocking_fee'] ?? 0);
            if ($restockingFee < 0) {
                $restockingFee = 0;
            }
            $totals = $this->computeTotals($built['subtotal'], $built['tax_amount'], $restockingFee);

            $returnNumber = !empty($data['return_number'])
                ? substr(trim((string) $data['return_number']), 0, 50)
                : $this->generateReturnNumber();

            $validReturnReasons = ['damaged', 'defective', 'wrong_item', 'excess'];
            $returnReason = in_array($data['return_reason'] ?? null, $validReturnReasons, true)
                ? $data['return_reason']
                : 'damaged';

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

            $salesReturn = SalesReturn::create([
                'return_number' => $returnNumber,
                'invoice_id' => $invoice->id,
                'customer_id' => (int) $invoice->customer_id,
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
                'received_by' => !empty($data['received_by']) ? (int) $data['received_by'] : null,
                'received_date' => !empty($data['received_date']) ? $data['received_date'] : null,
                'inspection_notes' => !empty($data['inspection_notes']) ? trim((string) $data['inspection_notes']) : null,
                'customer_notes' => !empty($data['customer_notes']) ? trim((string) $data['customer_notes']) : null,
                'internal_notes' => !empty($data['internal_notes']) ? trim((string) $data['internal_notes']) : null,
                'created_by' => Auth::id(),
            ]);

            foreach ($built['items'] as $item) {
                $salesReturn->details()->create($item);
            }

            // Create journal entry + stock movements if approved/completed
            if (in_array($status, ['approved', 'completed'])) {
                $this->createJournalEntryForReturn($salesReturn, $totals);
                $this->createStockMovementsForReturn($salesReturn);
            }

            return $salesReturn;
        });
    }

    public function updateSalesReturn(int $id, array $data): SalesReturn
    {
        return DB::transaction(function () use ($id, $data) {
            $salesReturn = SalesReturn::with('details')->findOrFail($id);
            $oldStatus = $salesReturn->status;

            $invoice = SalesInvoice::with('details.product', 'details.tax')->findOrFail((int) $data['invoice_id']);

            $this->validateHeaderAgainstInvoice($data, $invoice);

            $built = $this->validateAndBuildItems($data['items'] ?? [], $invoice, $id);
            $restockingFee = (float) ($data['restocking_fee'] ?? 0);
            if ($restockingFee < 0) {
                $restockingFee = 0;
            }
            $totals = $this->computeTotals($built['subtotal'], $built['tax_amount'], $restockingFee);

            $returnNumber = !empty($data['return_number'])
                ? substr(trim((string) $data['return_number']), 0, 50)
                : $salesReturn->return_number;

            $validReturnReasons = ['damaged', 'defective', 'wrong_item', 'excess'];
            $returnReason = in_array($data['return_reason'] ?? null, $validReturnReasons, true)
                ? $data['return_reason']
                : ($salesReturn->return_reason ?? 'damaged');

            $validReturnTypes = ['full_return', 'partial_return', 'exchange'];
            $returnType = in_array($data['return_type'] ?? null, $validReturnTypes, true)
                ? $data['return_type']
                : ($salesReturn->return_type ?? 'partial_return');

            $validStatuses = ['draft', 'requested', 'approved', 'completed', 'cancelled'];
            $status = in_array($data['status'] ?? null, $validStatuses, true)
                ? $data['status']
                : ($salesReturn->status ?? 'draft');

            $validRefundStatuses = ['pending', 'partial', 'completed', 'cancelled'];
            $refundStatus = in_array($data['refund_status'] ?? null, $validRefundStatuses, true)
                ? $data['refund_status']
                : ($salesReturn->refund_status ?? 'pending');

            $newStatusIsPosted = in_array($status, ['approved', 'completed']);
            $oldStatusWasPosted = in_array($oldStatus, ['approved', 'completed']);

            $salesReturn->update([
                'return_number' => $returnNumber,
                'invoice_id' => $invoice->id,
                'customer_id' => (int) $invoice->customer_id,
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
                'approval_notes' => isset($data['approval_notes']) ? (trim((string) $data['approval_notes']) ?: null) : $salesReturn->approval_notes,
                'received_by' => !empty($data['received_by']) ? (int) $data['received_by'] : $salesReturn->received_by,
                'received_date' => !empty($data['received_date']) ? $data['received_date'] : $salesReturn->received_date,
                'inspection_notes' => isset($data['inspection_notes']) ? (trim((string) $data['inspection_notes']) ?: null) : $salesReturn->inspection_notes,
                'customer_notes' => isset($data['customer_notes']) ? (trim((string) $data['customer_notes']) ?: null) : $salesReturn->customer_notes,
                'internal_notes' => isset($data['internal_notes']) ? (trim((string) $data['internal_notes']) ?: null) : $salesReturn->internal_notes,
            ]);

            $salesReturn->details()->delete();
            foreach ($built['items'] as $item) {
                $salesReturn->details()->create($item);
            }

            // Synchronize financial effects based on status transitions
            $freshReturn = $salesReturn->fresh();

            if ($newStatusIsPosted && !$oldStatusWasPosted) {
                // Draft/requested → approved/completed: CREATE effects
                $this->createJournalEntryForReturn($freshReturn, $totals);
                $this->createStockMovementsForReturn($freshReturn);
            } elseif ($newStatusIsPosted && $oldStatusWasPosted) {
                // Already posted, still posted: UPDATE effects (idempotent)
                $this->reverseStockMovementsForReturn($freshReturn);
                $this->createJournalEntryForReturn($freshReturn, $totals);
                $this->createStockMovementsForReturn($freshReturn);
            } elseif (!$newStatusIsPosted && $oldStatusWasPosted) {
                // approved/completed → draft/requested/cancelled: REVERSE effects
                $this->reverseJournalEntryForReturn($freshReturn);
                $this->reverseStockMovementsForReturn($freshReturn);
            }
            // else: both draft/requested — no financial effects needed

            return $freshReturn;
        });
    }

    public function getInvoiceWithReturnableQuantities(int $invoiceId, ?int $excludeReturnId = null): array
    {
        $invoice = SalesInvoice::with([
            'details.product',
            'details.tax',
            'customer',
            'warehouse',
            'currency',
        ])->findOrFail($invoiceId);

        $returned = $this->getPreviouslyReturnedQuantities($invoiceId, $excludeReturnId);

        $details = $invoice->details->map(function (SalesInvoiceDetail $detail) use ($returned, $excludeReturnId) {
            $invoiceQty = (float) $detail->quantity;
            $key = $detail->id ?: ('s_' . $detail->product_id);
            $alreadyReturned = $returned[$key] ?? 0;
            $available = max(0, $invoiceQty - $alreadyReturned);

            $taxPercentage = (float) ($detail->tax_percentage ?? 0);
            if ($taxPercentage <= 0 && $detail->tax_id) {
                $taxType = $detail->tax;
                if ($taxType) {
                    $taxPercentage = (float) $taxType->rate;
                }
            }
            if ($taxPercentage <= 0 && $detail->tax_amount > 0 && $invoiceQty > 0) {
                $netAmount = $invoiceQty * (float) $detail->unit_price;
                if ($netAmount > 0) {
                    $taxPercentage = round(($detail->tax_amount / $netAmount) * 100, 2);
                }
            }

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
                'tax_percentage' => $taxPercentage,
                'tax_amount' => (float) $detail->tax_amount,
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
                'customer_id' => $invoice->customer_id,
                'warehouse_id' => $invoice->warehouse_id,
                'currency_id' => $invoice->currency_id,
                'exchange_rate' => (float) ($invoice->exchange_rate ?? 1),
                'customer_name_ar' => $invoice->customer?->name_ar ?? '',
                'customer_name_en' => $invoice->customer?->name_en ?? '',
                'warehouse_name_ar' => $invoice->warehouse?->name_ar ?? '',
                'warehouse_name_en' => $invoice->warehouse?->name ?? $invoice->warehouse?->name_en ?? '',
                'currency_code' => $invoice->currency?->code ?? '',
            ],
            'details' => $details,
        ];
    }

    /**
     * Create journal entry for sales return (Credit Note):
     *   Dr Accounts Receivable (total return amount)
     *   Dr Output Tax (tax reversal)
     *   Cr Revenue (net return amount)
     */
    private function createJournalEntryForReturn(SalesReturn $return, array $totals): void
    {
        $totalAmount = (float) ($totals['total_amount'] ?? $return->total_amount ?? 0);
        $taxAmount = (float) ($totals['tax_amount'] ?? $return->tax_amount ?? 0);

        $arAccountId = $this->resolveArAccountId($return->customer_id);
        $revenueAccountId = $this->resolveRevenueAccountId();

        if (!$arAccountId || !$revenueAccountId) {
            return;
        }

        // Fiscal period validation — always check, even for existing entries
        $this->ensureOpenFiscalPeriod($return->return_date);

        // Check for existing journal entry (idempotency)
        $reference = $return->return_number;
        $existingHeader = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'SalesReturn')
            ->first();

        if ($existingHeader) {
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $entryCode = $existingHeader->entry_code;
            $existingHeader->update([
                'date' => $return->return_date,
                'total_amount' => $totalAmount,
                'status' => 'Post',
            ]);
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'SalesReturn',
                'reference' => $reference,
                'date' => $return->return_date,
                'description' => 'Sales Return ' . $reference,
                'total_amount' => $totalAmount,
                'status' => 'Post',
            ]);
        }

        // Revenue reversal (Dr Revenue, Cr AR)
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $revenueAccountId,
            'debit' => $totalAmount,
            'credit' => 0,
            'related_id_name' => 'SalesReturn',
            'related_name_details' => $reference,
            'description' => 'Revenue reversal - Return ' . $reference,
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $arAccountId,
            'debit' => 0,
            'credit' => $totalAmount,
            'related_id_name' => 'SalesReturn',
            'related_name_details' => $reference,
            'description' => 'AR reduction - Return ' . $reference,
        ]);

        // COGS reversal (Dr Inventory, Cr COGS) — restores inventory value and reverses COGS
        $cogsReversalAmount = $this->calculateCogsReversalAmount($return);
        if ($cogsReversalAmount > 0) {
            $cogsAccountId = $this->resolveCogsAccountId();
            $inventoryAccountId = $this->resolveInventoryAssetAccountId();

            if ($cogsAccountId && $inventoryAccountId) {
                JournalEntryLine::create([
                    'journal_entry_code' => $entryCode,
                    'account_id' => $inventoryAccountId,
                    'debit' => round($cogsReversalAmount, 2),
                    'credit' => 0,
                    'related_id_name' => 'SalesReturn',
                    'related_name_details' => $reference,
                    'description' => 'Inventory restoration - Return ' . $reference,
                ]);

                JournalEntryLine::create([
                    'journal_entry_code' => $entryCode,
                    'account_id' => $cogsAccountId,
                    'debit' => 0,
                    'credit' => round($cogsReversalAmount, 2),
                    'related_id_name' => 'SalesReturn',
                    'related_name_details' => $reference,
                    'description' => 'COGS reversal - Return ' . $reference,
                ]);
            }
        }

        // Sync account_postings cache for Trial Balance consistency
        $companyId = $return->company_id ?? Auth::user()?->company_id;
        if ($companyId) {
            app(PostingService::class)->recalculatePostings($companyId);
        }
    }


    /**
     * Create stock movements for returned items (goods come back into inventory).
     */
    private function createStockMovementsForReturn(SalesReturn $return): void
    {
        $return->load('details');
        foreach ($return->details as $detail) {
            if (($detail->quantity ?? 0) <= 0) {
                continue;
            }

            $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
                'movement_date' => $return->return_date,
                'type' => 'sales_return',
                'direction' => 'in',
                'reference_id' => $return->id,
                'reference_type' => 'sales_return',
                'voucher_num' => $return->return_number,
                'warehouse_id' => $return->warehouse_id,
                'company_id' => auth()->user()->company_id ?? 1,
                'created_by' => auth()->id(),
                'notes' => "Sales Return: {$return->return_number}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Recover historical cost from original sale's inventory movement
            $costPrice = 0.0;
            if ($return->invoice_id) {
                $saleMovementHeader = DB::table('inventory_movement_headers')
                    ->where('reference_id', $return->invoice_id)
                    ->where('reference_type', 'SalesInvoice')
                    ->first();

                if ($saleMovementHeader) {
                    $originalLine = DB::table('inventory_movement_lines')
                        ->where('stock_movement_id', $saleMovementHeader->id)
                        ->where('product_id', $detail->product_id)
                        ->first();

                    if ($originalLine && (float) $originalLine->cost_price > 0) {
                        $costPrice = (float) $originalLine->cost_price;
                    }
                }
            }

            // Fallback to current product cost if no historical movement found
            if ($costPrice <= 0) {
                $product = DB::table('products')->where('id', $detail->product_id)->first();
                $costPrice = (float) ($product->cost_per_item ?? 0);
            }

            DB::table('inventory_movement_lines')->insert([
                'stock_movement_id' => $movementHeaderId,
                'product_id' => $detail->product_id,
                'unit_id' => $detail->unit_id ?? null,
                'quantity' => $detail->quantity,
                'cost_price' => $costPrice,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update product quantity
            DB::table('products')
                ->where('id', $detail->product_id)
                ->increment('quantity', (float) $detail->quantity);
        }
    }

    private function resolveArAccountId(?int $customerId = null): ?int
    {
        if ($customerId) {
            $customer = Customer::find($customerId);
            if ($customer && $customer->account_id) {
                return $customer->account_id;
            }
        }
        return Account::where('AccCode', 'like', '1.2%')->where('AccType', 1)->value('AccID');
    }

    private function resolveRevenueAccountId(): ?int
    {
        return Account::where('AccType', 1)
            ->where('AccCode', 'like', '4%')
            ->orderBy('AccCode')
            ->value('AccID');
    }

    private function resolveOutputTaxAccountId(): ?int
    {
        return Account::where(function ($q) {
            $q->where('AccCode', 'like', '2.1.4%')
              ->orWhere('AccCode', 'like', '214%');
        })->value('AccID');
    }

    /**
     * Resolve the COGS account (501 - Cost of Sales).
     */
    private function resolveCogsAccountId(): ?int
    {
        return Account::where('AccCode', 'like', '5%')
            ->where('AccType', 1)
            ->orderBy('AccCode')
            ->value('AccID');
    }

    /**
     * Resolve the Inventory Asset account (11401 - Main Warehouse).
     */
    private function resolveInventoryAssetAccountId(): ?int
    {
        // P0-FIX: Use exact match for Inventory Asset account (11401).
        return Account::where('AccCode', '11401')
            ->value('AccID');
    }

    /**
     * Calculate COGS reversal amount for a Sales Return.
     * Uses the HISTORICAL cost from the original sale's inventory movement
     * (inventory_movement_lines.cost_price where reference_type = 'SalesInvoice').
     *
     * This ensures the COGS reversal matches the original sale's recorded cost,
     * even if products.cost_per_item has changed since the original sale.
     * Falls back to current products.cost_per_item only if no historical movement exists.
     */
    private function calculateCogsReversalAmount(SalesReturn $return): float
    {
        $return->load('details');
        $totalCogs = 0.0;

        if (!$return->invoice_id) {
            return $totalCogs;
        }

        // Find the original sale's inventory movement header
        $saleMovementHeader = DB::table('inventory_movement_headers')
            ->where('reference_id', $return->invoice_id)
            ->where('reference_type', 'SalesInvoice')
            ->first();

        foreach ($return->details as $detail) {
            $qty = (float) ($detail->quantity ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $costPrice = 0.0;

            // Try to recover historical cost from original sale's inventory movement
            if ($saleMovementHeader) {
                $originalLine = DB::table('inventory_movement_lines')
                    ->where('stock_movement_id', $saleMovementHeader->id)
                    ->where('product_id', $detail->product_id)
                    ->first();

                if ($originalLine && (float) $originalLine->cost_price > 0) {
                    $costPrice = (float) $originalLine->cost_price;
                }
            }

            // Fallback: use current products.cost_per_item if no historical movement exists
            if ($costPrice <= 0) {
                $product = DB::table('products')->where('id', $detail->product_id)->first();
                $costPrice = (float) ($product->cost_per_item ?? 0);
            }

            $totalCogs += $qty * $costPrice;
        }

        return $totalCogs;
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
     * P0-06: Create a reversal journal for a sales return instead of deleting the original.
     * Called when status changes from approved/completed to draft/requested/cancelled.
     */
    private function reverseJournalEntryForReturn(SalesReturn $return): void
    {
        $reference = $return->return_number;
        $header = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'SalesReturn')
            ->first();

        if ($header && in_array($header->status, ['Post', 'posted'])) {
            // Posted: create reversal, preserve original
            app(\App\Services\Accounting\JournalReversalService::class)->createReversal(
                $header->entry_code,
                'Sales Return cancellation - ' . $reference
            );
        } elseif ($header) {
            // Unposted: safe to delete
            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $header->delete();
        }
    }

    /**
     * Reverse/remove stock movements and product quantity for a sales return.
     * Called when status changes from approved/completed to draft/requested/cancelled.
     */
    private function reverseStockMovementsForReturn(SalesReturn $return): void
    {
        // Find and delete existing movements for this return
        $headers = DB::table('inventory_movement_headers')
            ->where('reference_id', $return->id)
            ->where('reference_type', 'sales_return')
            ->get();

        foreach ($headers as $header) {
            // Reverse product quantities
            $lines = DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $header->id)
                ->get();

            foreach ($lines as $line) {
                DB::table('products')
                    ->where('id', $line->product_id)
                    ->decrement('quantity', (float) $line->quantity);
            }

            DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $header->id)
                ->delete();
        }

        DB::table('inventory_movement_headers')
            ->where('reference_id', $return->id)
            ->where('reference_type', 'sales_return')
            ->delete();
    }
}