<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Traits\EnsuresFiscalPeriod;
use App\Models\Accounting\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\BankAccount;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerPayment;
use App\Models\Client_Sales\CustomerPaymentAllocation;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Currency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceiptVoucherController extends Controller
{
    use EnsuresFiscalPeriod;
    public function store(Request $request): RedirectResponse
    {
        $payload = $this->normalizePayload($request);
        $validated = $this->validatePayload($request, $payload);

        DB::transaction(function () use ($validated) {
            $payment = CustomerPayment::create($this->paymentData($validated, true));
            $invoiceIds = $this->syncAllocations($payment, $validated['allocations'] ?? []);
            $this->refreshInvoices($invoiceIds);
            // Only create GL entry when payment is posted/reconciled, not draft
            if (in_array($validated['status'] ?? 'draft', ['posted', 'reconciled'])) {
                $this->createJournalEntryForPayment($payment, $validated);
            }
        });

        return redirect()->back()->with('success', 'Receipt voucher created successfully.');
    }

    public function update(Request $request, CustomerPayment $voucher): RedirectResponse
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

        return redirect()->back()->with('success', 'Receipt voucher updated successfully.');
    }

    public function destroy(CustomerPayment $voucher): RedirectResponse
    {
        DB::transaction(function () use ($voucher) {
            $this->deleteJournalEntryForPayment($voucher);
            $invoiceIds = $voucher->allocations()->pluck('invoice_id')->filter()->all();
            $voucher->allocations()->delete();
            $voucher->delete();
            $this->refreshInvoices($invoiceIds);
        });

        return redirect()->back()->with('success', 'Receipt voucher deleted.');
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
            'other' => 'other',
        ];

        $typeMap = [
            'standard' => 'invoice_payment',
            'invoice_payment' => 'invoice_payment',
            'advance' => 'advance_payment',
            'advance_payment' => 'advance_payment',
            'prepayment' => 'advance_payment',
            'credit_note' => 'credit_note',
        ];

        $statusMap = [
            'draft' => 'draft',
            'posted' => 'posted',
            'reconciled' => 'reconciled',
            'cancelled' => 'cancelled',
        ];

        $payload['payment_method'] = $methodMap[$payload['payment_method'] ?? 'cash'] ?? $payload['payment_method'] ?? 'cash';
        $payload['payment_type'] = $typeMap[$payload['payment_type'] ?? 'invoice_payment'] ?? $payload['payment_type'] ?? 'invoice_payment';
        $payload['status'] = $statusMap[$payload['status'] ?? 'draft'] ?? $payload['status'] ?? 'draft';
        $payload['is_posted'] = filter_var($payload['is_posted'] ?? false, FILTER_VALIDATE_BOOL);

        if (empty($payload['payment_number'])) {
            $payload['payment_number'] = $this->generatePaymentNumber();
        }

        $payload['allocations'] = collect($payload['allocations'] ?? [])
            ->filter(fn ($row) => !empty($row['invoice_id']))
            ->values()
            ->all();

        return $payload;
    }

    private function validatePayload(Request $request, array $payload, ?CustomerPayment $voucher = null): array
    {
        $request->replace($payload);

        $validated = $request->validate([
            'payment_number' => 'required|string|max:50|unique:customer_payments,payment_number,' . ($voucher?->id ?? ''),
            'customer_id' => 'required|exists:customers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0.000001',
            'payment_date' => 'required|date',
            'payment_method' => 'required|in:cash,check,bank_transfer,credit_card,credit_note,other',
            'amount' => 'required|numeric|min:0',
            'payment_type' => 'required|in:invoice_payment,advance_payment,credit_note',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'check_number' => 'nullable|string|max:50',
            'check_date' => 'nullable|date',
            'check_due_date' => 'nullable|date|after_or_equal:check_date',
            'reference_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:draft,posted,reconciled,cancelled',
            'notes' => 'nullable|string',
            'allocations' => 'nullable|array',
            'allocations.*.invoice_id' => 'required|exists:sales_invoices,id',
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

        // Validate invoice allocations
        foreach (($validated['allocations'] ?? []) as $index => $allocation) {
            $invoice = SalesInvoice::find($allocation['invoice_id']);
            if ($invoice && (int) $invoice->customer_id !== (int) $validated['customer_id']) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => 'The selected invoice does not belong to this customer.',
                ]);
            }
        }

        return $validated;
    }

    private function paymentData(array $validated, bool $isCreate): array
    {
        $data = [
            'payment_number' => $validated['payment_number'],
            'customer_id' => $validated['customer_id'],
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
            'notes' => $validated['notes'] ?? null,
        ];

        if ($isCreate) {
            $data['created_by'] = Auth::id();
        }

        return $data;
    }

    private function syncAllocations(CustomerPayment $payment, array $allocations): array
    {
        $payment->allocations()->delete();

        $rows = collect($allocations)
            ->filter(fn ($a) => !empty($a['invoice_id']))
            ->map(fn ($a) => [
                'invoice_id' => $a['invoice_id'],
                'allocated_amount' => round((float) ($a['allocated_amount'] ?? 0), 2),
                'base_allocated_amount' => round((float) ($a['base_allocated_amount'] ?? 0), 2),
                'discount_given' => round((float) ($a['discount_given'] ?? 0), 2),
                'notes' => $a['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ])
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

        SalesInvoice::query()
            ->whereIn('id', $invoiceIds->all())
            ->get()
            ->each(function (SalesInvoice $invoice) {
                $paidAmount = CustomerPaymentAllocation::query()
                    ->join('customer_payments', 'customer_payments.id', '=', 'customer_payment_allocations.payment_id')
                    ->where('customer_payment_allocations.invoice_id', $invoice->id)
                    ->whereNull('customer_payments.deleted_at')
                    ->where('customer_payments.status', '!=', 'cancelled')
                    ->sum('customer_payment_allocations.allocated_amount');

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

    private function generatePaymentNumber(): string
    {
        do {
            $number = 'RV-' . now()->format('Ymd-His') . '-' . random_int(100, 999);
        } while (CustomerPayment::where('payment_number', $number)->exists());

        return $number;
    }

    /**
     * Create journal entry for customer receipt:
     *   Dr Cash/Bank (from bank_account.gl_account_id)
     *   Cr Accounts Receivable (from customer.account_id or default)
     */
    private function createJournalEntryForPayment(CustomerPayment $payment, array $validated): void
    {
        $amount = (float) $payment->amount;
        if ($amount <= 0) {
            return;
        }

        $bankGlAccountId = null;
        if (!empty($payment->bank_account_id)) {
            $bankAccount = BankAccount::find($payment->bank_account_id);
            $bankGlAccountId = $bankAccount?->gl_account_id;
        }
        if (!$bankGlAccountId) {
            $bankGlAccountId = Account::where('AccCode', 'like', '1.1%')->where('AccType', 1)->value('AccID');
        }

        $customer = Customer::find($payment->customer_id);
        $arAccountId = $customer?->account_id;
        if (!$arAccountId) {
            $arAccountId = Account::where('AccCode', 'like', '1.2%')->where('AccType', 1)->value('AccID');
        }

        if (!$bankGlAccountId || !$arAccountId) {
            return; // Accounts not configured
        }

        $this->ensureOpenFiscalPeriod($validated['payment_date'] ?? $payment->payment_date);
        $entryCode = $this->generateNextEntryCode();
        $reference = $payment->payment_number;

        JournalEntry::create([
            'entry_code' => $entryCode,
            'entry_type' => 'CustomerReceipt',
            'reference' => $reference,
            'date' => $validated['payment_date'] ?? $payment->payment_date,
            'description' => 'Customer Receipt ' . $reference,
            'total_amount' => $amount,
            'status' => 'Post',
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $bankGlAccountId,
            'debit' => $amount,
            'credit' => 0,
            'related_id_name' => 'CustomerReceipt',
            'related_name_details' => $reference,
            'description' => 'Cash/Bank received - ' . $reference,
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $arAccountId,
            'debit' => 0,
            'credit' => $amount,
            'related_id_name' => 'CustomerReceipt',
            'related_name_details' => $reference,
            'description' => 'AR reduction - ' . $reference,
        ]);
    }

    private function deleteJournalEntryForPayment(CustomerPayment $payment): void
    {
        $header = JournalEntry::where('reference', $payment->payment_number)
            ->where('entry_type', 'CustomerReceipt')
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
