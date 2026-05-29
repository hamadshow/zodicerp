<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\BankAccount;
use App\Models\BankPayment;
use App\Models\BankReceipt;
use App\Models\TreasuryTransfer;
use App\Http\Resources\Cash\TreasuryTransferResource;
use App\Services\TreasuryTransferService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BankTransactionController extends Controller
{
    protected string $transactionCodePrefix = 'BNK-';
    protected int $transactionCodeStart = 10001;
    protected $transferService;

    public function __construct(TreasuryTransferService $transferService)
    {
        $this->transferService = $transferService;
    }

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

        $transfers = TreasuryTransfer::query()
            ->orderBy('id', 'desc')
            ->get();

        $transferData = TreasuryTransferResource::collection($transfers)->resolve();
        $formattedTransfers = collect($transferData)->map(function ($transfer) {
            return [
                'id' => $transfer['id'],
                'type' => 'transfer',
                'code' => $transfer['reference_number'],
                'date' => $transfer['transfer_date'],
                'from_account_id' => $transfer['from_treasury']['id'],
                'to_account_id' => $transfer['to_treasury']['id'],
                'amount' => $transfer['amount'],
                'status' => $transfer['status'],
                'reference' => $transfer['reference_number'],
                'notes' => $transfer['notes'],
                'from_account' => [
                    'name' => $transfer['from_treasury']['name'],
                    'code' => $transfer['from_treasury']['account_code'],
                ],
                'to_account' => [
                    'name' => $transfer['to_treasury']['name'],
                    'code' => $transfer['to_treasury']['account_code'],
                ],
            ];
        });

        $bankAccounts = BankAccount::with(['bank', 'glAccount'])
            ->whereHas('glAccount', function ($query) {
                $query->where(function ($q) {
                    $q->where('Nature', 'bank')
                      ->orWhere('Nature', 'cash');
                })
                ->where('AccType', 1);
            })
            ->where('status', 'active')
            ->get(['id', 'bank_id', 'account_name', 'account_number', 'gl_account_id']);

        $cashAccounts = \App\Models\CashAccount::query()
            ->with('glAccount')
            ->whereHas('glAccount', function ($query) {
                $query->where(function ($q) {
                    $q->where('Nature', 'cash');
                })
                ->where('AccType', 1);
            })
            ->where('status', 'active')
            ->get();

        $combinedAccounts = $bankAccounts->map(function ($account) {
            return [
                'id' => $account->id,
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
                'currency' => $account->currency,
                'bank_name' => $account->bank?->name,
            ];
        })->concat($cashAccounts->map(function ($account) {
            return [
                'id' => 'cash_' . $account->id,
                'account_name' => $account->name,
                'account_number' => $account->account_code,
                'currency' => $account->currency,
                'bank_name' => 'Cash Account',
            ];
        }))->sortBy('account_name')->values()->all();

        $accounts = Account::select('AccID', 'AccCode', 'AccName', 'AccType')->get();

        return Inertia::render('Backend/06-Cash/BankTransactions', [
            'payments' => $payments,
            'receipts' => $receipts,
            'transfers' => $formattedTransfers,
            'bankAccounts' => $combinedAccounts,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        return DB::transaction(function () use ($validated) {
            if ($validated['type'] === 'transfer') {
                $transfer = $this->transferService->createTransfer([
                    'from_treasury_id' => $validated['from_account_id'],
                    'to_treasury_id' => $validated['to_account_id'],
                    'amount' => $validated['amount'],
                    'transfer_date' => $validated['date'],
                    'notes' => $validated['notes'],
                    'currency' => $validated['currency'] ?? 'EGP',
                ]);
                
                if ($validated['status'] === 'posted') {
                    $this->transferService->approveTransfer($transfer->id);
                }
                
                return redirect()->back()->with('success', 'Transfer transaction created successfully.');
            }

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

    public function update(Request $request, string $type, int $transaction)
    {
        $validated = $this->validatePayload($request);
        $originalType = $type;
        $newType = $validated['type'];

        return DB::transaction(function () use ($validated, $transaction, $originalType, $newType) {
            if ($originalType === 'transfer') {
                $this->transferService->updateTransfer($transaction, [
                    'from_treasury_id' => $validated['from_account_id'],
                    'to_treasury_id' => $validated['to_account_id'],
                    'amount' => $validated['amount'],
                    'transfer_date' => $validated['date'],
                    'notes' => $validated['notes'],
                    'currency' => $validated['currency'] ?? 'EGP',
                ]);
                return redirect()->back()->with('success', 'Transfer transaction updated successfully.');
            }

            if ($newType === 'transfer') {
                // Handle migration from payment/receipt to transfer if needed, 
                // but usually we don't allow changing basic types for simplicity
                throw new \Exception("Cannot change transaction type to transfer.");
            }

            if ($originalType !== $newType) {
                $code = $this->migrateTransactionType($originalType, $newType, $transaction, $validated);
            } else {
                $code = $this->updateTransactionRecord($originalType, $transaction, $validated);
            }

            $this->syncJournalEntry($newType, $code, $validated);

            return redirect()->back()->with('success', 'Bank transaction updated successfully.');
        });
    }

    public function destroy(Request $request, string $type, int $transaction)
    {
        abort_unless(in_array($type, ['payment', 'receipt', 'transfer'], true), 404);

        return DB::transaction(function () use ($type, $transaction) {
            if ($type === 'transfer') {
                $record = TreasuryTransfer::findOrFail($transaction);
                $record->delete();
                return redirect()->back()->with('success', 'Transfer transaction deleted successfully.');
            }

            if ($type === 'payment') {
                $record = BankPayment::findOrFail($transaction);
                $code = $record->payment_no;
                $record->delete();
            } else {
                $record = BankReceipt::findOrFail($transaction);
                $code = $record->receipt_no;
                $record->delete();
            }

            $this->deleteJournalEntry($type, $code);

            return redirect()->back()->with('success', 'Bank transaction deleted successfully.');
        });
    }

    protected function validatePayload(Request $request): array
    {
        return $request->validate([
            'type' => 'required|in:payment,receipt,transfer',
            'code' => 'nullable|string|max:100',
            'bank_account_id' => 'required_if:type,payment,receipt|exists:bank_accounts,id',
            'from_account_id' => 'required_if:type,transfer',
            'to_account_id' => 'required_if:type,transfer',
            'counterparty_account_id' => 'required_if:type,payment,receipt|exists:accounts,AccID',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'status' => 'required|in:draft,posted,cancelled',
            'reference' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
            'currency' => 'nullable|string|size:3',
        ]);
    }

    protected function updateTransactionRecord(string $type, int $transaction, array $validated): string
    {
        if ($type === 'payment') {
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

        return $code;
    }

    protected function migrateTransactionType(string $originalType, string $newType, int $transaction, array $validated): string
    {
        if ($originalType === 'payment') {
            $record = BankPayment::findOrFail($transaction);
            $code = $record->payment_no;
            $createdBy = $record->created_by;
            $record->delete();
            $this->deleteJournalEntry('payment', $code);

            BankReceipt::create([
                'bank_account_id' => $validated['bank_account_id'],
                'receipt_no' => $code,
                'receipt_date' => $validated['date'],
                'payer_type' => 'other',
                'payer_id' => $validated['counterparty_account_id'],
                'amount' => $validated['amount'],
                'reference' => $validated['reference'],
                'notes' => $validated['notes'],
                'status' => $validated['status'],
                'created_by' => $createdBy ?? Auth::id(),
            ]);
        } else {
            $record = BankReceipt::findOrFail($transaction);
            $code = $record->receipt_no;
            $createdBy = $record->created_by;
            $record->delete();
            $this->deleteJournalEntry('receipt', $code);

            BankPayment::create([
                'bank_account_id' => $validated['bank_account_id'],
                'payment_no' => $code,
                'payment_date' => $validated['date'],
                'payee_type' => 'other',
                'payee_id' => $validated['counterparty_account_id'],
                'amount' => $validated['amount'],
                'reference' => $validated['reference'],
                'notes' => $validated['notes'],
                'status' => $validated['status'],
                'created_by' => $createdBy ?? Auth::id(),
            ]);
        }

        return $code;
    }

    protected function syncJournalEntry(string $type, string $code, array $payload): void
    {
        $bankAccount = BankAccount::with('bank')->find($payload['bank_account_id']);
        if (! $bankAccount || ! $bankAccount->gl_account_id) {
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

        if (! $bankAccountExists || ! $counterAccountExists) {
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

        $header = JournalEntry::where('reference', $code)
            ->where('entry_type', $qaidType)
            ->lockForUpdate()
            ->first();

        if ($header) {
            $header->update([
                'date' => $payload['date'],
                'description' => $details,
                'total_amount' => $amount,
                'status' => $qaidStatus,
            ]);

            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $entryCode = $header->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => $qaidType,
                'reference' => $code,
                'date' => $payload['date'],
                'description' => $details,
                'total_amount' => $amount,
                'status' => $qaidStatus,
            ]);
        }

        $lines = $type === 'payment'
            ? [
                [
                    'account_id' => $counterAccountId,
                    'debit' => $amount,
                    'credit' => 0,
                    'description' => $details,
                ],
                [
                    'account_id' => $bankGlAccountId,
                    'debit' => 0,
                    'credit' => $amount,
                    'description' => $details,
                ],
            ]
            : [
                [
                    'account_id' => $bankGlAccountId,
                    'debit' => $amount,
                    'credit' => 0,
                    'description' => $details,
                ],
                [
                    'account_id' => $counterAccountId,
                    'debit' => 0,
                    'credit' => $amount,
                    'description' => $details,
                ],
            ];

        foreach ($lines as $line) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $line['account_id'],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'related_id_name' => $qaidType,
                'related_name_details' => $code,
                'description' => $line['description'],
                'cost_center_code' => null,
            ]);
        }
    }

    protected function deleteJournalEntry(string $type, string $code): void
    {
        $qaidType = $type === 'payment' ? 'BnkPayment' : 'BnkReceipt';

        $header = JournalEntry::where('reference', $code)
            ->where('entry_type', $qaidType)
            ->first();

        if (! $header) {
            return;
        }

        JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
        JournalEntry::where('entry_code', $header->entry_code)->delete();
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

        return $prefix.max($lastNumber + 1, $start);
    }

    protected function generateNextEntryCode(): string
    {
        $lastCode = JournalEntry::whereNotNull('entry_code')
            ->where('entry_code', '!=', '')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->value('entry_code');

        $nextNumber = $this->nextNumericPart($lastCode, 10001);

        return 'QID-'.$nextNumber;
    }

    protected function nextNumericPart(?string $code, int $fallbackStart): int
    {
        if (! $code) {
            return $fallbackStart;
        }

        if (preg_match('/(\d+)\s*$/', $code, $matches)) {
            return (int) $matches[1] + 1;
        }

        return $fallbackStart;
    }
}
