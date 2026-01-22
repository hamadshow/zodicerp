<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\BankPayment;
use App\Models\BankReceipt;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BankTransactionController extends Controller
{
    protected string $transactionCodePrefix = 'BNK-';
    protected int $transactionCodeStart = 10001;

    public function index(Request $request)
    {
        $payments = BankPayment::with(['bankAccount.bank'])
            ->latest()
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'type' => 'payment',
                    'code' => $payment->payment_no,
                    'date' => $payment->payment_date,
                    'bank_account_id' => $payment->bank_account_id,
                    'counterparty_account_id' => $payment->payee_id,
                    'amount' => $payment->amount,
                    'status' => $payment->status,
                    'reference' => $payment->reference,
                    'notes' => $payment->notes,
                    'bank_account' => $payment->bankAccount ? [
                        'id' => $payment->bankAccount->id,
                        'account_name' => $payment->bankAccount->account_name,
                        'account_number' => $payment->bankAccount->account_number,
                        'bank_name' => $payment->bankAccount->bank?->name,
                        'gl_account_id' => $payment->bankAccount->gl_account_id,
                    ] : null,
                ];
            });

        $receipts = BankReceipt::with(['bankAccount.bank'])
            ->latest()
            ->get()
            ->map(function ($receipt) {
                return [
                    'id' => $receipt->id,
                    'type' => 'receipt',
                    'code' => $receipt->receipt_no,
                    'date' => $receipt->receipt_date,
                    'bank_account_id' => $receipt->bank_account_id,
                    'counterparty_account_id' => $receipt->payer_id,
                    'amount' => $receipt->amount,
                    'status' => $receipt->status,
                    'reference' => $receipt->reference,
                    'notes' => $receipt->notes,
                    'bank_account' => $receipt->bankAccount ? [
                        'id' => $receipt->bankAccount->id,
                        'account_name' => $receipt->bankAccount->account_name,
                        'account_number' => $receipt->bankAccount->account_number,
                        'bank_name' => $receipt->bankAccount->bank?->name,
                        'gl_account_id' => $receipt->bankAccount->gl_account_id,
                    ] : null,
                ];
            });

        $bankAccounts = BankAccount::with('bank')
            ->where('status', 'active')
            ->get(['id', 'bank_id', 'account_name', 'account_number', 'gl_account_id']);

        $accounts = Account::select('AccID', 'AccCode', 'AccName', 'AccType')->get();

        return Inertia::render('Backend/06-Cash/BankTransactions', [
            'payments' => $payments,
            'receipts' => $receipts,
            'bankAccounts' => $bankAccounts,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        return DB::transaction(function () use ($validated) {
            $code = $validated['code'] ?: $this->generateNextTransactionCode();

            if ($validated['type'] === 'payment') {
                $transaction = BankPayment::create([
                    'bank_account_id' => $validated['bank_account_id'],
                    'payment_no' => $code,
                    'payment_date' => $validated['date'],
                    'payee_type' => 'other',
                    'payee_id' => $validated['counterparty_account_id'],
                    'amount' => $validated['amount'],
                    'reference' => $validated['reference'],
                    'notes' => $validated['notes'],
                    'status' => $validated['status'],
                    'created_by' => Auth::id(),
                ]);
            } else {
                $transaction = BankReceipt::create([
                    'bank_account_id' => $validated['bank_account_id'],
                    'receipt_no' => $code,
                    'receipt_date' => $validated['date'],
                    'payer_type' => 'other',
                    'payer_id' => $validated['counterparty_account_id'],
                    'amount' => $validated['amount'],
                    'reference' => $validated['reference'],
                    'notes' => $validated['notes'],
                    'status' => $validated['status'],
                    'created_by' => Auth::id(),
                ]);
            }

            $this->syncJournalEntry($validated['type'], $code, $validated);

            return redirect()->back()->with('success', 'Bank transaction created successfully.');
        });
    }

    public function update(Request $request, int $transaction)
    {
        $validated = $this->validatePayload($request, true);

        return DB::transaction(function () use ($validated, $transaction) {
            if ($validated['type'] === 'payment') {
                $record = BankPayment::findOrFail($transaction);
                $code = $record->payment_no;
                $record->update([
                    'bank_account_id' => $validated['bank_account_id'],
                    'payment_date' => $validated['date'],
                    'payee_type' => 'other',
                    'payee_id' => $validated['counterparty_account_id'],
                    'amount' => $validated['amount'],
                    'reference' => $validated['reference'],
                    'notes' => $validated['notes'],
                    'status' => $validated['status'],
                ]);
            } else {
                $record = BankReceipt::findOrFail($transaction);
                $code = $record->receipt_no;
                $record->update([
                    'bank_account_id' => $validated['bank_account_id'],
                    'receipt_date' => $validated['date'],
                    'payer_type' => 'other',
                    'payer_id' => $validated['counterparty_account_id'],
                    'amount' => $validated['amount'],
                    'reference' => $validated['reference'],
                    'notes' => $validated['notes'],
                    'status' => $validated['status'],
                ]);
            }

            $this->syncJournalEntry($validated['type'], $code, $validated);

            return redirect()->back()->with('success', 'Bank transaction updated successfully.');
        });
    }

    public function destroy(Request $request, int $transaction)
    {
        $validated = $request->validate([
            'type' => 'required|in:payment,receipt',
        ]);

        return DB::transaction(function () use ($validated, $transaction) {
            if ($validated['type'] === 'payment') {
                $record = BankPayment::findOrFail($transaction);
                $code = $record->payment_no;
                $record->delete();
            } else {
                $record = BankReceipt::findOrFail($transaction);
                $code = $record->receipt_no;
                $record->delete();
            }

            $this->deleteJournalEntry($validated['type'], $code);

            return redirect()->back()->with('success', 'Bank transaction deleted successfully.');
        });
    }

    protected function validatePayload(Request $request, bool $isUpdate = false): array
    {
        return $request->validate([
            'type' => 'required|in:payment,receipt',
            'code' => 'nullable|string|max:100',
            'bank_account_id' => 'required|exists:bank_accounts,id',
            'counterparty_account_id' => 'required|exists:accounts,AccID',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'status' => 'required|in:draft,posted,cancelled',
            'reference' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
        ]);
    }

    protected function syncJournalEntry(string $type, string $code, array $payload): void
    {
        $bankAccount = BankAccount::with('bank')->find($payload['bank_account_id']);
        if (!$bankAccount || !$bankAccount->gl_account_id) {
            abort(
                response()->json([
                    'message' => 'Bank account must be linked to a GL account.',
                ], 422)
            );
        }

        $bankGlAccountId = (int) $bankAccount->gl_account_id;
        $counterAccountId = (int) $payload['counterparty_account_id'];

        $bankAccountExists = Account::where('AccID', $bankGlAccountId)->exists();
        $counterAccountExists = Account::where('AccID', $counterAccountId)->exists();

        if (!$bankAccountExists || !$counterAccountExists) {
            abort(
                response()->json([
                    'message' => 'One or more GL accounts are invalid.',
                ], 422)
            );
        }

        $amount = (float) $payload['amount'];
        $qaidStatus = $payload['status'] === 'posted' ? 'Post' : 'UnPost';
        $qaidType = $type === 'payment' ? 'BnkPayment' : 'BnkReceipt';
        $details = $payload['notes'] ?: $payload['reference'];

        $header = DB::table('tblqaid')
            ->where('QaidRef', $code)
            ->where('QaidType', $qaidType)
            ->lockForUpdate()
            ->first();

        if ($header) {
            DB::table('tblqaid')
                ->where('QaidRef', $code)
                ->where('QaidType', $qaidType)
                ->update([
                    'QaidDate' => $payload['date'],
                    'QaidDetails' => $details,
                    'QaidTotal' => $amount,
                    'QaidStatus' => $qaidStatus,
                ]);

            DB::table('tblqaidbody')
                ->where('QaidCode', $header->QaidCode)
                ->delete();

            $qaidCode = $header->QaidCode;
        } else {
            $qaidCode = $this->generateNextQaidCode();
            DB::table('tblqaid')->insert([
                'QaidCode' => $qaidCode,
                'QaidType' => $qaidType,
                'QaidRef' => $code,
                'QaidDate' => $payload['date'],
                'QaidDetails' => $details,
                'QaidTotal' => $amount,
                'QaidStatus' => $qaidStatus,
            ]);
        }

        $lines = $type === 'payment'
            ? [
                [
                    'QaidBodyAccID' => $counterAccountId,
                    'QaidDebit' => $amount,
                    'QaidCredit' => 0,
                    'QaidBodyDetails' => $details,
                ],
                [
                    'QaidBodyAccID' => $bankGlAccountId,
                    'QaidDebit' => 0,
                    'QaidCredit' => $amount,
                    'QaidBodyDetails' => $details,
                ],
            ]
            : [
                [
                    'QaidBodyAccID' => $bankGlAccountId,
                    'QaidDebit' => $amount,
                    'QaidCredit' => 0,
                    'QaidBodyDetails' => $details,
                ],
                [
                    'QaidBodyAccID' => $counterAccountId,
                    'QaidDebit' => 0,
                    'QaidCredit' => $amount,
                    'QaidBodyDetails' => $details,
                ],
            ];

        foreach ($lines as $line) {
            DB::table('tblqaidbody')->insert([
                'QaidCode' => $qaidCode,
                'QaidBodyAccID' => $line['QaidBodyAccID'],
                'QaidDebit' => $line['QaidDebit'],
                'QaidCredit' => $line['QaidCredit'],
                'idName' => $qaidType,
                'NameDetails' => $code,
                'QaidBodyDetails' => $line['QaidBodyDetails'],
                'copCode' => null,
            ]);
        }
    }

    protected function deleteJournalEntry(string $type, string $code): void
    {
        $qaidType = $type === 'payment' ? 'BnkPayment' : 'BnkReceipt';

        $header = DB::table('tblqaid')
            ->where('QaidRef', $code)
            ->where('QaidType', $qaidType)
            ->first();

        if (!$header) {
            return;
        }

        DB::table('tblqaidbody')->where('QaidCode', $header->QaidCode)->delete();
        DB::table('tblqaid')->where('QaidCode', $header->QaidCode)->delete();
    }

    protected function generateNextTransactionCode(): string
    {
        $prefix = $this->transactionCodePrefix;
        $start = $this->transactionCodeStart;

        $lastPayment = BankPayment::whereNotNull('payment_no')
            ->where('payment_no', '!=', '')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->value('payment_no');

        $lastReceipt = BankReceipt::whereNotNull('receipt_no')
            ->where('receipt_no', '!=', '')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->value('receipt_no');

        $lastNumber = max(
            $this->nextNumericPart($lastPayment, $start) - 1,
            $this->nextNumericPart($lastReceipt, $start) - 1
        );

        return $prefix . max($lastNumber + 1, $start);
    }

    protected function generateNextQaidCode(): string
    {
        $lastCode = DB::table('tblqaid')
            ->whereNotNull('QaidCode')
            ->where('QaidCode', '!=', '')
            ->orderByDesc('QaidID')
            ->lockForUpdate()
            ->value('QaidCode');

        $nextNumber = $this->nextNumericPart($lastCode, 10001);

        return 'QID-' . $nextNumber;
    }

    protected function nextNumericPart(?string $code, int $fallbackStart): int
    {
        if (!$code) {
            return $fallbackStart;
        }

        if (preg_match('/(\d+)\s*$/', $code, $matches)) {
            return (int) $matches[1] + 1;
        }

        return $fallbackStart;
    }
}
