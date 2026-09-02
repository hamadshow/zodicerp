<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Traits\EnsuresFiscalPeriod;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use App\Models\BankAccount;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Vendor_Purchases\SupplierPayment;
use App\Models\Vendor_Purchases\SupplierPaymentAllocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentVoucherController extends Controller
{
    use EnsuresFiscalPeriod;
    public function store(Request $request): RedirectResponse
    {
        $payload = $this->normalizePayload($request);
        $validated = $this->validatePayload($request, $payload);

        DB::transaction(function () use ($validated) {
            $payment = SupplierPayment::create($this->paymentData($validated, true));
            $invoiceIds = $this->syncAllocations($payment, $validated['allocations'] ?? []);

            $this->refreshInvoices($invoiceIds);
            // Only create GL entry when payment is posted/reconciled
            if (in_array($validated['status'] ?? 'draft', ['posted', 'reconciled'])) {
                $this->createJournalEntryForPayment($payment, $validated);
            }
        });

        return redirect()->back()->with('success', 'Payment voucher created successfully.');
    }    public function update(Request $request, SupplierPayment $voucher): RedirectResponse
    {
        $payload = $this->normalizePayload($request);
        $validated = $this->validatePayload($request, $payload, $voucher);

        DB::transaction(function () use ($voucher, $validated) {
            $this->deleteJournalEntryForPayment($voucher);
            $previousInvoiceIds = $voucher->allocations()->pluck('invoice_id')->filter()->all();

            $voucher->update($this->paymentData($validated, false));
            $newInvoiceIds = $this->syncAllocations($voucher, $validated['allocations'] ?? []);
            $this->refreshInvoices(array_unique(array_merge($previousInvoiceIds, $newInvoiceIds)));
            // Only create GL entry when payment is posted/reconciled
            if (in_array($validated['status'] ?? 'draft', ['posted', 'reconciled'])) {
                $this->createJournalEntryForPayment($voucher->fresh(), $validated);
            }
        });

        return redirect()->back()->with('success', 'Payment voucher updated successfully.');
    }    public function destroy(SupplierPayment $voucher): RedirectResponse
    {
        DB::transaction(function () use ($voucher) {
            $this->deleteJournalEntryForPayment($voucher);
            $invoiceIds = $voucher->allocations()->pluck('invoice_id')->filter()->all();

            $voucher->allocations()->delete();
            $voucher->delete();

            $this->refreshInvoices($invoiceIds);
        });

        return redirect()->back()->with('success', 'Payment voucher deleted successfully.');
    }

    private function normalizePayload(Request $request): array
    {
        $payload = $request->all();

        $methodMap = [
            'cash' => 'cash',
            'bank_transfer' => 'bank_transfer',
            'check' => 'check',
            'card' => 'credit_card',
            'credit_card' => 'credit_card',
            'credit_note' => 'credit_note',
            'other' => 'other',
        ];

        $typeMap = [
            'standard' => 'invoice_payment',
            'invoice_payment' => 'invoice_payment',
            'advance' => 'advance_payment',
            'advance_payment' => 'advance_payment',
            'prepayment' => 'advance_payment',
            'credit_payment' => 'credit_payment',
            'adjustment' => 'adjustment',
        ];

        $statusMap = [
            'draft' => 'draft',
            'posted' => 'posted',
            'reconciled' => 'reconciled',
            'cancelled' => 'cancelled',
        ];

        $payload['payment_method'] = $methodMap[$payload['payment_method'] ?? 'cash'] ?? ($payload['payment_method'] ?? 'cash');
        $payload['payment_type'] = $typeMap[$payload['payment_type'] ?? 'invoice_payment'] ?? ($payload['payment_type'] ?? 'invoice_payment');
        $payload['status'] = $statusMap[$payload['status'] ?? 'draft'] ?? ($payload['status'] ?? 'draft');
        $payload['is_posted'] = filter_var($payload['is_posted'] ?? false, FILTER_VALIDATE_BOOL);

        $payload['bank_account_id'] = $payload['bank_account_id'] ?: null;
        $payload['check_number'] = $payload['check_number'] ?: null;
        $payload['check_date'] = $payload['check_date'] ?: null;
        $payload['check_due_date'] = $payload['check_due_date'] ?: null;
        $payload['reference_number'] = $payload['reference_number'] ?: null;
        $payload['description'] = $payload['description'] ?: null;
        $payload['notes'] = $payload['notes'] ?: null;
        $payload['posted_at'] = $payload['posted_at'] ?: null;
        $payload['posted_by'] = $payload['posted_by'] ?: null;
        $payload['reconciled_at'] = $payload['reconciled_at'] ?: null;
        $payload['reconciled_by'] = $payload['reconciled_by'] ?: null;

        $payload['allocations'] = collect($payload['allocations'] ?? [])
            ->map(function ($row) {
                return [
                    'invoice_id' => $row['invoice_id'] ?? null,
                    'allocated_amount' => $row['allocated_amount'] ?? 0,
                    'base_allocated_amount' => $row['base_allocated_amount'] ?? 0,
                    'discount_given' => $row['discount_given'] ?? 0,
                    'notes' => $row['notes'] ?? null,
                ];
            })
            ->filter(function ($row) {
                return !empty($row['invoice_id']);
            })
            ->values()
            ->all();

        if (empty($payload['payment_number'])) {
            $payload['payment_number'] = $this->generatePaymentNumber();
        }

        return $payload;
    }

    private function validatePayload(Request $request, array $payload, ?SupplierPayment $voucher = null): array
    {
        $request->replace($payload);

        $voucherId = $voucher?->id;

        $validated = $request->validate([
            'payment_number' => 'required|string|max:50|unique:supplier_payments,payment_number,' . $voucherId,
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0.000001',
            'payment_date' => 'required|date',
            'payment_method' => 'required|in:cash,check,bank_transfer,credit_card,credit_note,other',
            'amount' => 'required|numeric|min:0',
            'payment_type' => 'required|in:invoice_payment,advance_payment,credit_payment,adjustment',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'check_number' => 'nullable|string|max:50',
            'check_date' => 'nullable|date',
            'check_due_date' => 'nullable|date|after_or_equal:check_date',
            'reference_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:draft,posted,reconciled,cancelled',
            'is_posted' => 'nullable|boolean',
            'posted_at' => 'nullable|date',
            'posted_by' => 'nullable|exists:users,id',
            'reconciled_at' => 'nullable|date',
            'reconciled_by' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
            'allocations' => 'nullable|array',
            'allocations.*.invoice_id' => 'required|exists:purchase_invoices,id',
            'allocations.*.allocated_amount' => 'nullable|numeric|min:0',
            'allocations.*.base_allocated_amount' => 'nullable|numeric|min:0',
            'allocations.*.discount_given' => 'nullable|numeric|min:0',
            'allocations.*.notes' => 'nullable|string',
        ]);

        if (in_array($validated['payment_method'], ['bank_transfer', 'check'], true) && empty($validated['bank_account_id'])) {
            throw ValidationException::withMessages([
                'bank_account_id' => 'A bank account is required for this payment method.',
            ]);
        }

        $duplicateInvoiceIds = collect($validated['allocations'] ?? [])
            ->pluck('invoice_id')
            ->duplicates()
            ->values()
            ->all();

        if (!empty($duplicateInvoiceIds)) {
            throw ValidationException::withMessages([
                'allocations' => 'Each invoice can only be allocated once.',
            ]);
        }

        foreach (($validated['allocations'] ?? []) as $index => $allocation) {
            $invoice = PurchaseInvoice::query()
                ->select('id', 'supplier_id', 'total_amount', 'paid_amount')
                ->find($allocation['invoice_id']);

            if (!$invoice) {
                continue;
            }

            if ((int) $invoice->supplier_id !== (int) $validated['supplier_id']) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => 'The selected invoice does not belong to this supplier.',
                ]);
            }

            $existingAllocated = $this->existingInvoiceAllocationTotal($invoice->id, $voucher?->id);
            $availableBalance = max(0, (float) $invoice->total_amount - ((float) $invoice->paid_amount - $existingAllocated));
            $requestedAmount = (float) ($allocation['allocated_amount'] ?? 0);

            if ($requestedAmount > $availableBalance + 0.0001) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.allocated_amount" => 'Allocated amount exceeds the remaining invoice balance.',
                ]);
            }
        }

        return $validated;
    }

    private function paymentData(array $validated, bool $isCreate): array
    {
        $data = [
            'payment_number' => $validated['payment_number'],
            'supplier_id' => $validated['supplier_id'],
            'currency_id' => $validated['currency_id'],
            'exchange_rate' => $validated['exchange_rate'],
            'payment_date' => $validated['payment_date'],
            'payment_method' => $validated['payment_method'],
            'amount' => $validated['amount'],
            'payment_type' => $validated['payment_type'],
            'bank_account_id' => $validated['bank_account_id'] ?? null,
            'check_number' => $validated['check_number'] ?? null,
            'check_date' => $validated['check_date'] ?? null,
            'check_due_date' => $validated['check_due_date'] ?? null,
            'reference_number' => $validated['reference_number'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'is_posted' => (bool) ($validated['is_posted'] ?? false),
            'posted_at' => $validated['posted_at'] ?? null,
            'posted_by' => $validated['posted_by'] ?? null,
            'reconciled_at' => $validated['reconciled_at'] ?? null,
            'reconciled_by' => $validated['reconciled_by'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];

        if ($isCreate) {
            $data['created_by'] = Auth::id();
        }

        return $data;
    }

    private function syncAllocations(SupplierPayment $payment, array $allocations): array
    {
        $payment->allocations()->delete();

        $rows = collect($allocations)
            ->filter(function ($allocation) {
                return !empty($allocation['invoice_id']);
            })
            ->map(function ($allocation) {
                return [
                    'invoice_id' => $allocation['invoice_id'],
                    'allocated_amount' => round((float) ($allocation['allocated_amount'] ?? 0), 2),
                    'base_allocated_amount' => round((float) ($allocation['base_allocated_amount'] ?? 0), 2),
                    'discount_given' => round((float) ($allocation['discount_given'] ?? 0), 2),
                    'notes' => $allocation['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->values();

        if ($rows->isNotEmpty()) {
            $payment->allocations()->createMany($rows->all());
        }

        return $rows->pluck('invoice_id')->all();
    }

    private function refreshInvoices(array $invoiceIds): void
    {
        $invoiceIds = collect($invoiceIds)->filter()->unique()->values();

        if ($invoiceIds->isEmpty()) {
            return;
        }

        PurchaseInvoice::query()
            ->whereIn('id', $invoiceIds->all())
            ->get()
            ->each(function (PurchaseInvoice $invoice) {
                $paidAmount = SupplierPaymentAllocation::query()
                    ->join('supplier_payments', 'supplier_payments.id', '=', 'supplier_payment_allocations.payment_id')
                    ->where('supplier_payment_allocations.invoice_id', $invoice->id)
                    ->whereNull('supplier_payments.deleted_at')
                    ->where('supplier_payments.status', '!=', 'cancelled')
                    ->sum('supplier_payment_allocations.allocated_amount');

                $balance = max(0, (float) $invoice->total_amount - (float) $paidAmount);
                $status = 'unpaid';

                if ($balance <= 0.0001) {
                    $status = 'paid';
                } elseif ($paidAmount > 0) {
                    $status = 'partial';
                }

                $invoice->update([
                    'paid_amount' => round((float) $paidAmount, 2),
                    'payment_status' => $status,
                ]);
            });
    }

    private function existingInvoiceAllocationTotal(int $invoiceId, ?int $excludingVoucherId = null): float
    {
        return (float) SupplierPaymentAllocation::query()
            ->join('supplier_payments', 'supplier_payments.id', '=', 'supplier_payment_allocations.payment_id')
            ->where('supplier_payment_allocations.invoice_id', $invoiceId)
            ->whereNull('supplier_payments.deleted_at')
            ->when($excludingVoucherId, function ($query) use ($excludingVoucherId) {
                $query->where('supplier_payments.id', '!=', $excludingVoucherId);
            })
            ->where('supplier_payments.status', '!=', 'cancelled')
            ->sum('supplier_payment_allocations.allocated_amount');
    }

    private function generatePaymentNumber(): string
    {
        do {
            $number = 'PV-' . now()->format('Ymd-His') . '-' . random_int(100, 999);
        } while (SupplierPayment::query()->where('payment_number', $number)->exists());

        return $number;
    }

    /**
     * Create journal entry for supplier payment:
     *   Dr Accounts Payable (from supplier.account_id or default)
     *   Cr Cash/Bank (from bank_account.gl_account_id)
     */
    private function createJournalEntryForPayment(SupplierPayment $payment, array $validated): void
    {
        $amount = (float) $payment->amount;
        if ($amount <= 0) {
            return;
        }

        $apAccountId = null;
        if ($payment->supplier_id) {
            $supplier = Supplier::find($payment->supplier_id);
            $apAccountId = $supplier?->account_id;
        }
        if (!$apAccountId) {
            $apAccountId = Account::where('AccCode', 'like', '2%')->where('AccType', 1)->value('AccID');
        }

        $bankGlAccountId = null;
        if (!empty($payment->bank_account_id)) {
            $bankAccount = BankAccount::find($payment->bank_account_id);
            $bankGlAccountId = $bankAccount?->gl_account_id;
        }
        if (!$bankGlAccountId) {
            $bankGlAccountId = Account::where('AccCode', 'like', '1.1%')->where('AccType', 1)->value('AccID');
        }

        if (!$apAccountId || !$bankGlAccountId) {
            return;
        }

        $reference = $payment->payment_number;
        $paymentDate = $validated['payment_date'] ?? $payment->payment_date;

        // Fiscal period validation (always check, even for existing entries)
        $this->ensureOpenFiscalPeriod($paymentDate);

        // Upsert pattern (idempotent) — match SalesInvoice pattern
        $existingHeader = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'SupplierPayment')
            ->lockForUpdate()
            ->first();

        if ($existingHeader) {
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $existingHeader->update([
                'date' => $paymentDate,
                'total_amount' => $amount,
                'status' => 'Post',
            ]);
            $entryCode = $existingHeader->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'SupplierPayment',
                'reference' => $reference,
                'date' => $paymentDate,
                'description' => 'Supplier Payment ' . $reference,
                'total_amount' => $amount,
                'status' => 'Post',
            ]);
        }

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $apAccountId,
            'debit' => $amount,
            'credit' => 0,
            'related_id_name' => 'SupplierPayment',
            'related_name_details' => $reference,
            'description' => 'AP reduction - ' . $reference,
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $bankGlAccountId,
            'debit' => 0,
            'credit' => $amount,
            'related_id_name' => 'SupplierPayment',
            'related_name_details' => $reference,
            'description' => 'Cash/Bank paid - ' . $reference,
        ]);

        // Sync account_postings cache for Trial Balance consistency
        $companyId = $payment->company_id ?? Auth::user()?->company_id;
        if ($companyId) {
            app(PostingService::class)->recalculatePostings($companyId);
        }
    }

    private function deleteJournalEntryForPayment(SupplierPayment $payment): void
    {
        $header = JournalEntry::where('reference', $payment->payment_number)
            ->where('entry_type', 'SupplierPayment')
            ->first();
        if ($header) {
            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $header->delete();
        }
    }

    protected function generateNextEntryCode(): string
    {
        $lastCode = JournalEntry::whereNotNull('entry_code')
            ->where('entry_code', '!=', '')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->value('entry_code');

        $nextNumber = 10001;
        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $nextNumber = (int) $matches[1] + 1;
        }

        return 'QID-' . $nextNumber;
    }
}
