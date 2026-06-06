<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\BankAccount;
use App\Models\TreasuryTransaction;
use App\Services\TreasuryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BankTransactionController extends Controller
{
    protected TreasuryService $treasuryService;

    public function __construct(TreasuryService $treasuryService)
    {
        $this->treasuryService = $treasuryService;
    }

    public function index(Request $request)
    {
        $transactions = TreasuryTransaction::with(['sourceAccount.bank', 'destinationAccount.bank'])
            ->latest()
            ->get();

        $payments = $transactions->where('transaction_type', 'withdrawal')->map(function ($t) {
            return [
                'id' => $t->id,
                'type' => 'payment',
                'code' => $t->transaction_no,
                'date' => $t->transaction_date->format('Y-m-d'),
                'bank_account_id' => $t->source_account_id,
                'counterparty_account_id' => $t->counterparty_id,
                'amount' => $t->amount,
                'status' => $t->status,
                'reference' => $t->reference,
                'notes' => $t->notes,
                'bank_account' => $t->sourceAccount ? [
                    'id' => $t->sourceAccount->id,
                    'account_name' => $t->sourceAccount->account_name,
                    'account_number' => $t->sourceAccount->account_number,
                    'bank_name' => $t->sourceAccount->bank?->name,
                    'gl_account_id' => $t->sourceAccount->gl_account_id,
                ] : null,
            ];
        })->values();

        $receipts = $transactions->where('transaction_type', 'deposit')->map(function ($t) {
            return [
                'id' => $t->id,
                'type' => 'receipt',
                'code' => $t->transaction_no,
                'date' => $t->transaction_date->format('Y-m-d'),
                'bank_account_id' => $t->destination_account_id,
                'counterparty_account_id' => $t->counterparty_id,
                'amount' => $t->amount,
                'status' => $t->status,
                'reference' => $t->reference,
                'notes' => $t->notes,
                'bank_account' => $t->destinationAccount ? [
                    'id' => $t->destinationAccount->id,
                    'account_name' => $t->destinationAccount->account_name,
                    'account_number' => $t->destinationAccount->account_number,
                    'bank_name' => $t->destinationAccount->bank?->name,
                    'gl_account_id' => $t->destinationAccount->gl_account_id,
                ] : null,
            ];
        })->values();

        $transfers = $transactions->where('transaction_type', 'transfer')->map(function ($t) {
            return [
                'id' => $t->id,
                'type' => 'transfer',
                'code' => $t->transaction_no,
                'date' => $t->transaction_date->format('Y-m-d'),
                'from_account_id' => $t->source_account_id,
                'to_account_id' => $t->destination_account_id,
                'amount' => $t->amount,
                'status' => $t->status,
                'reference' => $t->reference,
                'notes' => $t->notes,
                'from_account' => $t->sourceAccount ? [
                    'id' => $t->sourceAccount->id,
                    'account_name' => $t->sourceAccount->account_name,
                    'bank_name' => $t->sourceAccount->bank?->name,
                    'account_number' => $t->sourceAccount->account_number,
                ] : null,
                'to_account' => $t->destinationAccount ? [
                    'id' => $t->destinationAccount->id,
                    'account_name' => $t->destinationAccount->account_name,
                    'bank_name' => $t->destinationAccount->bank?->name,
                    'account_number' => $t->destinationAccount->account_number,
                ] : null,
            ];
        })->values();

        $allAccounts = BankAccount::with(['bank', 'glAccount'])
            ->where('status', 'active')
            ->get();

        $combinedAccounts = $allAccounts->map(function ($account) {
            return [
                'id' => $account->id,
                'type' => $account->account_type, // 'bank' or 'cash'
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
                'currency' => $account->currency,
                'bank_name' => $account->account_type === 'bank' ? ($account->bank?->name ?? 'Bank') : 'Cash',
            ];
        })->sortBy('account_name')->values()->all();

        $accounts = Account::select('AccID', 'AccCode', 'AccName', 'AccType')->get();

        return Inertia::render('Backend/06-Cash/BankTransactions', [
            'payments' => $payments,
            'receipts' => $receipts,
            'transfers' => $transfers,
            'bankAccounts' => $combinedAccounts,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        $data = [
            'transaction_type' => $validated['type'] === 'receipt' ? 'deposit' : ($validated['type'] === 'payment' ? 'withdrawal' : 'transfer'),
            'transaction_no' => $validated['code'],
            'transaction_date' => $validated['date'],
            'amount' => $validated['amount'],
            'status' => $validated['status'],
            'reference' => $validated['reference'],
            'notes' => $validated['notes'],
            'currency' => $validated['currency'] ?? 'USD',
        ];

        if ($validated['type'] === 'transfer') {
            $source = BankAccount::findOrFail($validated['from_account_id']);
            $dest = BankAccount::findOrFail($validated['to_account_id']);
            
            $data['source_account_type'] = $source->account_type;
            $data['source_account_id'] = $source->id;
            $data['destination_account_type'] = $dest->account_type;
            $data['destination_account_id'] = $dest->id;
        } elseif ($validated['type'] === 'payment') {
            $source = BankAccount::findOrFail($validated['bank_account_id']);
            $data['source_account_type'] = $source->account_type;
            $data['source_account_id'] = $source->id;
            $data['counterparty_id'] = $validated['counterparty_account_id'];
            $data['counterparty_type'] = 'other';
        } else {
            $dest = BankAccount::findOrFail($validated['bank_account_id']);
            $data['destination_account_type'] = $dest->account_type;
            $data['destination_account_id'] = $dest->id;
            $data['counterparty_id'] = $validated['counterparty_account_id'];
            $data['counterparty_type'] = 'other';
        }

        $this->treasuryService->createTransaction($data);

        return redirect()->back()->with('success', 'Bank transaction created successfully.');
    }

    public function update(Request $request, string $type, $transaction)
    {
        // Clean ID from prefixes like "transfer_5"
        if (is_string($transaction)) {
            $id = (int) preg_replace('/[^0-9]/', '', $transaction);
        } else {
            $id = $transaction;
        }

        $record = TreasuryTransaction::findOrFail($id);
        $validated = $this->validatePayload($request);

        $data = [
            'transaction_type' => $validated['type'] === 'receipt' ? 'deposit' : ($validated['type'] === 'payment' ? 'withdrawal' : 'transfer'),
            'transaction_date' => $validated['date'],
            'amount' => $validated['amount'],
            'status' => $validated['status'],
            'reference' => $validated['reference'],
            'notes' => $validated['notes'],
        ];

        if ($validated['type'] === 'transfer') {
            $source = BankAccount::findOrFail($validated['from_account_id']);
            $dest = BankAccount::findOrFail($validated['to_account_id']);
            
            $data['source_account_type'] = $source->account_type;
            $data['source_account_id'] = $source->id;
            $data['destination_account_type'] = $dest->account_type;
            $data['destination_account_id'] = $dest->id;
            $data['counterparty_id'] = null;
        } elseif ($validated['type'] === 'payment') {
            $source = BankAccount::findOrFail($validated['bank_account_id']);
            $data['source_account_type'] = $source->account_type;
            $data['source_account_id'] = $source->id;
            $data['destination_account_type'] = null;
            $data['destination_account_id'] = null;
            $data['counterparty_id'] = $validated['counterparty_account_id'];
        } else {
            $dest = BankAccount::findOrFail($validated['bank_account_id']);
            $data['destination_account_type'] = $dest->account_type;
            $data['destination_account_id'] = $dest->id;
            $data['source_account_type'] = null;
            $data['source_account_id'] = null;
            $data['counterparty_id'] = $validated['counterparty_account_id'];
        }

        $this->treasuryService->updateTransaction($record, $data);

        return redirect()->back()->with('success', 'Bank transaction updated successfully.');
    }

    public function destroy(Request $request, string $type, $transaction)
    {
        if (is_string($transaction)) {
            $id = (int) preg_replace('/[^0-9]/', '', $transaction);
        } else {
            $id = $transaction;
        }

        $record = TreasuryTransaction::findOrFail($id);
        $this->treasuryService->deleteTransaction($record);

        return redirect()->back()->with('success', 'Bank transaction deleted successfully.');
    }

    protected function validatePayload(Request $request): array
    {
        return $request->validate([
            'type' => 'required|in:payment,receipt,transfer',
            'code' => 'nullable|string|max:100',
            'bank_account_id' => 'nullable|required_unless:type,transfer|exists:bank_accounts,id',
            'from_account_id' => 'nullable|required_if:type,transfer|exists:bank_accounts,id',
            'to_account_id' => 'nullable|required_if:type,transfer|exists:bank_accounts,id|different:from_account_id',
            'counterparty_account_id' => 'nullable|required_unless:type,transfer|exists:accounts,AccID',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'status' => 'required|in:draft,posted,cancelled',
            'reference' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
            'currency' => 'nullable|string|size:3',
        ]);
    }
}
