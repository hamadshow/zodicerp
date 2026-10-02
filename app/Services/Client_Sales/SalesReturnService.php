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
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\CompanyContext;
use App\Services\UnitConversionService;
use Illuminate\Validation\ValidationException;
use RuntimeException;

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
                // line_total is a DB-generated stored column (quantity * unit_price + tax_amount);
                // writing it explicitly fails under strict mode.
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
     *
     * Phase 12 (silent AR-skip closed, docs Phase 9 outlook): posting an
     * approved/completed return without AR + revenue accounts used to be
     * silently skipped while stock still moved back into inventory — a
     * company could "give back" stock with no credit note in the books.
     * The GL is now an all-or-nothing contract: the entry posts in full,
     * or the whole return (journal + stock movements + derived quantity)
     * rolls back with a loud RuntimeException. Unseeded test/legacy
     * contexts must seed the accounts first, exactly like every other
     * GL-integrated flow.
     */
    private function createJournalEntryForReturn(SalesReturn $return, array $totals): void
    {
        $totalAmount = (float) ($totals['total_amount'] ?? $return->total_amount ?? 0);
        $taxAmount = (float) ($totals['tax_amount'] ?? $return->tax_amount ?? 0);
        $companyId = (int) ($return->company_id ?? Auth::user()?->company_id ?? 0);

        $arAccountId = $this->resolveArAccountId($return->customer_id);
        $revenueAccountId = $this->resolveRevenueAccountId();

        // Loud refusal instead of a silent skip: the AR + revenue pair is
        // mandatory for a posted return. The caller's transaction rolls the
        // whole return back (details, movements, ICTs, derived quantity).
        if (!$arAccountId || !$revenueAccountId) {
            throw new RuntimeException(
                'Sales return cannot be posted: no Accounts Receivable and/or Revenue account is configured for this company. Seed the GL accounts (or complete the customer account assignment) before approving returns.'
            );
        }

        // Fiscal period validation — always check, even for existing entries
        $this->ensureOpenFiscalPeriod($return->return_date);

        // Check for existing journal entry (idempotency)
        $reference = $return->return_number;
        $existingHeader = $this->liveJournalEntryFor($reference);

        // Phase 13 intent, Phase 17 mechanism: a REVERSED slot is never
        // resurrected. liveEntryFor() already skips recorded reversals via
        // the journal_reversals link table; the fallback below catches the
        // legacy-ambiguous case where every entry of the reference is
        // reversed — the re-approval must post a fresh entry, otherwise the
        // standing reversal nets the live credit note away to zero.
        if ($existingHeader && $this->hasRecordedReversal($existingHeader)) {
            $existingHeader = null;
        }

        if ($existingHeader) {
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $entryCode = $existingHeader->entry_code;
            $existingHeader->update([
                'date' => $return->return_date,
                'total_amount' => $totalAmount,
                'status' => 'Post',
                'company_id' => $companyId, // heal legacy unstamped rows (Phase 13)
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
                'company_id' => $companyId, // Phase 13: mirrors the Phase 9 sales-invoice stamp
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
            'company_id' => $companyId,
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $arAccountId,
            'debit' => 0,
            'credit' => $totalAmount,
            'related_id_name' => 'SalesReturn',
            'related_name_details' => $reference,
            'description' => 'AR reduction - Return ' . $reference,
            'company_id' => $companyId,
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
                    'company_id' => $companyId,
                ]);

                JournalEntryLine::create([
                    'journal_entry_code' => $entryCode,
                    'account_id' => $cogsAccountId,
                    'debit' => 0,
                    'credit' => round($cogsReversalAmount, 2),
                    'related_id_name' => 'SalesReturn',
                    'related_name_details' => $reference,
                    'description' => 'COGS reversal - Return ' . $reference,
                    'company_id' => $companyId,
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
        $existingHeaders = DB::table('inventory_movement_headers')
            ->where('reference_id', $return->id)
            ->where('reference_type', 'sales_return')
            ->orderBy('id')
            ->get();

        // Phase 13: idempotency is judged from the WAC ledger, not from
        // documents — headers/lines are immutable, so a RETRACTED return
        // keeps its original 'sales_return' documents and must still be
        // allowed to re-apply. Skip only when un-reversed
        // 'sales_return_detail' ICTs already exist for this return's
        // movement lines: never applied → proceed, applied → skip,
        // retracted → proceed. An empty header shell also proceeds.
        if ($existingHeaders->isNotEmpty()) {
            $lineIds = DB::table('inventory_movement_lines')
                ->whereIn('stock_movement_id', $existingHeaders->pluck('id'))
                ->pluck('id');

            $alreadyApplied = $lineIds->isNotEmpty() && DB::table('inventory_cost_transactions as tx')
                ->where('tx.company_id', (int) $existingHeaders->first()->company_id)
                ->where('tx.source_type', 'sales_return_detail')
                ->whereIn('tx.movement_line_id', $lineIds)
                ->whereNull('tx.reversal_of_id')
                ->whereNotExists(function ($q) {
                    $q->selectRaw(1)
                        ->from('inventory_cost_transactions as rev')
                        ->whereColumn('rev.reversal_of_id', 'tx.id')
                        ->where('rev.source_type', 'sales_return_detail_reversal');
                })
                ->exists();

            if ($alreadyApplied) {
                return;
            }
        }

        $return->load('details');
        $unitConversionService = app(UnitConversionService::class);
        foreach ($return->details as $detail) {
            if (($detail->quantity ?? 0) <= 0) {
                continue;
            }

            $conversion = $unitConversionService->toBase(
                (int) $detail->product_id,
                (int) $detail->unit_id,
                (string) $detail->quantity
            );
            $baseQuantity = $conversion['base_quantity'];
            $conversionFactorSnapshot = $conversion['conversion_factor'];

            $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
                'movement_date' => $return->return_date,
                'type' => 'sale_return',
                'direction' => 'in',
                'reference_id' => $return->id,
                'reference_type' => 'sales_return',
                'voucher_num' => $return->return_number,
                'warehouse_id' => $return->warehouse_id,
                'company_id' => app(CompanyContext::class)->id(),
                'created_by' => auth()->id(),
                'notes' => "Sales Return: {$return->return_number}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $costTransaction = DB::table('inventory_cost_transactions')
                ->where('company_id', app(CompanyContext::class)->id())
                ->where('source_type', 'sales_invoice_detail')
                ->where('source_id', $detail->invoice_detail_id)
                ->first();
            if (! $costTransaction) {
                throw new \RuntimeException('Original sales weighted-average cost transaction was not found.');
            }
            $costPrice = (string) $costTransaction->unit_cost;

            $movementLineId = DB::table('inventory_movement_lines')->insertGetId([
                'stock_movement_id' => $movementHeaderId,
                'product_id' => $detail->product_id,
                'unit_id' => $detail->unit_id ?? null,
                'quantity' => $baseQuantity,
                'conversion_factor_snapshot' => $conversionFactorSnapshot,
                'original_quantity' => $detail->quantity,
                'cost_price' => $costPrice,
                'goods_receipt_detail_id' => null,
                'purchase_invoice_detail_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('products')
                ->where('id', $detail->product_id)
                ->increment('quantity', (float) $baseQuantity);

            app(WeightedAverageCostService::class)->applyInbound(
                (int) $detail->product_id,
                (int) $return->warehouse_id,
                $baseQuantity,
                $costPrice,
                'sales_return_detail',
                (int) $detail->id,
                (string) $return->return_date,
                $movementHeaderId,
                $movementLineId,
            );
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
     * (inventory_movement_headers.reference_type = 'sales_invoice', normalized
     * from the legacy PascalCase 'SalesInvoice' in Phase 2).
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
            ->where('reference_type', 'sales_invoice')
            ->first();

        foreach ($return->details as $detail) {
            $qty = (float) ($detail->quantity ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $costPrice = 0.0;

            $historicalCost = DB::table('inventory_cost_transactions')
                ->where('company_id', app(CompanyContext::class)->id())
                ->where('source_type', 'sales_invoice_detail')
                ->where('source_id', $detail->invoice_detail_id)
                ->value('unit_cost');
            $costPrice = (float) ($historicalCost ?? 0);

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
     * Phase 17: the LIVE credit-note entry for this return's reference —
     * answered through the journal_reversals link table (a join), not by
     * probing for '-REV' code suffixes.
     */
    private function liveJournalEntryFor(string $reference): ?JournalEntry
    {
        return app(\App\Services\Accounting\JournalReversalService::class)
            ->liveEntryFor($reference, 'SalesReturn');
    }

    private function hasRecordedReversal(?JournalEntry $entry): bool
    {
        return $entry !== null
            && app(\App\Services\Accounting\JournalReversalService::class)->hasReversal($entry->entry_code);
    }

    /**
     * P0-06: Create a reversal journal for a sales return instead of deleting the original.
     * Called when status changes from approved/completed to draft/requested/cancelled.
     */
    private function reverseJournalEntryForReturn(SalesReturn $return): void
    {
        $reference = $return->return_number;

        // Phase 17: the LIVE entry (no recorded reversal) via the link
        // table — with reversed history kept for audit, a reference can own
        // several entries; the fallback handles legacy-ambiguous history.
        $header = $this->liveJournalEntryFor($reference);

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
     * Reverse the stock side of a posted sales return (Phase 13,
     * engine-routed). Immutable documents: lines and headers are NEVER
     * deleted — that was the pre-Phase-13 raw-delete retraction that broke
     * on ict_movement_line_fk and silently left the WAC ledger un-reversed
     * even when the deletes worked. Instead:
     *
     *   - every detail's applied ICT is exactly reversed via
     *     WeightedAverageCostService::reverse() (which REFUSES — and rolls
     *     the whole retraction back — when the returned units have already
     *     been consumed downstream); the reversal ICT keeps the original's
     *     movement header/line links and carries reversal_of_id;
     *   - the derived products.quantity delta rolls back per detail
     *     (decrement by the original ICT's quantity_delta);
     *   - a reversal movement document ('sale_return' type, direction 'out',
     *     voucher '<number>-REV') records the round trip.
     *
     * Idempotent: no original ICTs → nothing to do.
     *
     * @throws \RuntimeException when returned stock has been consumed.
     */
    private function reverseStockMovementsForReturn(SalesReturn $return): void
    {
        $headers = DB::table('inventory_movement_headers')
            ->where('reference_id', $return->id)
            ->where('reference_type', 'sales_return')
            ->orderBy('id')
            ->get();

        if ($headers->isEmpty()) {
            return; // nothing applied (or legacy raw-delete era) — idempotent no-op
        }

        // Pair each applied ICT with its IMMUTABLE original movement line.
        // Keyed by MOVEMENT LINE, not by return-detail id:
        // updateSalesReturn() recreates details (delete + create) BEFORE the
        // transition effects run, so detail ids are not stable across a
        // retraction, while movement lines never change. Originals only —
        // reversal ICTs carry reversal_of_id / their own source_type and are
        // never re-reversed.
        $lineIds = DB::table('inventory_movement_lines')
            ->whereIn('stock_movement_id', $headers->pluck('id'))
            ->pluck('id');

        $txs = DB::table('inventory_cost_transactions as tx')
            ->where('tx.company_id', (int) $headers->first()->company_id)
            ->where('tx.source_type', 'sales_return_detail')
            ->whereIn('tx.movement_line_id', $lineIds)
            ->whereNull('tx.reversal_of_id')
            ->whereNotExists(function ($q) {
                $q->selectRaw(1)
                    ->from('inventory_cost_transactions as rev')
                    ->whereColumn('rev.reversal_of_id', 'tx.id')
                    ->where('rev.source_type', 'sales_return_detail_reversal');
            })
            ->orderBy('tx.id')
            ->get();

        if ($txs->isEmpty()) {
            return; // already retracted — idempotent no-op
        }

        $reversals = [];
        foreach ($txs as $tx) {
            $line = $tx->movement_line_id
                ? DB::table('inventory_movement_lines')->where('id', $tx->movement_line_id)->first()
                : null;
            $reversals[] = ['tx' => $tx, 'line' => $line];
        }

        $companyId = (int) $headers->first()->company_id;
        $reversalDate = now()->toDateString();

        foreach ($reversals as $entry) {
            // Exact reversal through the WAC engine: refuses (RuntimeException)
            // when the returned units have already been consumed downstream —
            // the whole retraction transaction rolls back.
            app(WeightedAverageCostService::class)->reverse(
                (int) $entry['tx']->id,
                $reversalDate,
                'sales_return_detail_reversal',
                (int) $entry['tx']->id,
            );

            // Derived-quantity rollback: the original ICT's delta is the
            // authoritative applied quantity (base units).
            DB::table('products')
                ->where('id', $entry['tx']->product_id)
                ->decrement('quantity', (float) $entry['tx']->quantity_delta);
        }

        // Reversal movement document records the round trip (immutable history).
        $reversalHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $reversalDate,
            'type' => 'sale_return',
            'direction' => 'out',
            'reference_id' => $return->id,
            'reference_type' => 'sales_return_reversal',
            'voucher_num' => $return->return_number.'-REV',
            'warehouse_id' => $return->warehouse_id,
            'company_id' => $companyId,
            'created_by' => auth()->id(),
            'notes' => "Sales Return Reversal: {$return->return_number}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($reversals as $entry) {
            DB::table('inventory_movement_lines')->insert([
                'stock_movement_id' => $reversalHeaderId,
                'product_id' => $entry['tx']->product_id,
                'unit_id' => $entry['line']->unit_id ?? null,
                'quantity' => abs((float) $entry['tx']->quantity_delta),
                'conversion_factor_snapshot' => $entry['line']->conversion_factor_snapshot ?? '1.000000',
                'original_quantity' => abs((float) $entry['tx']->quantity_delta),
                'cost_price' => abs((float) $entry['tx']->unit_cost),
                'goods_receipt_detail_id' => null,
                'purchase_invoice_detail_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}