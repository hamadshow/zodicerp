<?php

namespace App\Services;

use App\Traits\EnsuresFiscalPeriod;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Accounting\AccountPosting;
use App\Models\Account;
use App\Models\BankAccount;
use App\Models\TreasuryTransaction;
use App\Services\Accounting\PostingService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TreasuryService
{
    use EnsuresFiscalPeriod;

    protected string $transactionCodePrefix = 'TRX-';
    protected int $transactionCodeStart = 10001;

    public function __construct(protected PostingService $postingService) {}

    /**
     * Resolve account model based on type and ID.
     * Unified to use BankAccount for both bank and cash types.
     */
    public function resolveTreasuryAccount(string $type, int $id)
    {
        return BankAccount::find($id);
    }

    /**
     * Create a new treasury transaction.
     */
    public function createTransaction(array $data): TreasuryTransaction
    {
        return DB::transaction(function () use ($data) {
            $data['transaction_no'] = $data['transaction_no'] ?? $this->generateNextTransactionCode();
            $data['created_by'] = Auth::id();
            $data['company_id'] = Auth::user()->company_id;

            $transaction = TreasuryTransaction::create($data);

            if ($transaction->status === 'posted') {
                $this->syncJournalEntry($transaction);
                $this->updateTreasuryBalance($transaction);
            }

            return $transaction;
        });
    }

    /**
     * Update an existing treasury transaction.
     */
    public function updateTransaction(TreasuryTransaction $transaction, array $data): TreasuryTransaction
    {
        return DB::transaction(function () use ($transaction, $data) {
            $transaction->update($data);

            if ($transaction->status === 'posted') {
                $this->syncJournalEntry($transaction);
            } else {
                $this->deleteJournalEntry($transaction);
            }

            $this->postingService->recalculatePostings($transaction->company_id);

            return $transaction;
        });
    }

    /**
     * Delete a treasury transaction.
     */
    public function deleteTransaction(TreasuryTransaction $transaction): bool
    {
        return DB::transaction(function () use ($transaction) {
            $companyId = $transaction->company_id;
            $this->deleteJournalEntry($transaction);
            $transaction->delete();
            $this->postingService->recalculatePostings($companyId);
            return true;
        });
    }

    /**
     * Sync journal entries for a transaction.
     */
    public function syncJournalEntry(TreasuryTransaction $transaction): void
    {
        $type = $transaction->transaction_type;
        $code = $transaction->transaction_no;
        $amount = (float) $transaction->amount;
        $qaidStatus = $transaction->status === 'posted' ? 'Post' : 'UnPost';
        
        $qaidType = match($type) {
            'deposit' => 'BnkReceipt',
            'withdrawal' => 'BnkPayment',
            'transfer' => 'BnkTransfer',
        };

        $details = $transaction->notes ?: $transaction->reference;

        $this->ensureOpenFiscalPeriod($transaction->transaction_date);
        $header = JournalEntry::where('reference', $code)
            ->where('entry_type', $qaidType)
            ->first();

        if ($header) {
            $header->update([
                'date' => $transaction->transaction_date,
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
                'date' => $transaction->transaction_date,
                'description' => $details,
                'total_amount' => $amount,
                'status' => $qaidStatus,
                'company_id' => $transaction->company_id,
            ]);
        }

        $lines = $this->prepareJournalLines($transaction);

        foreach ($lines as $line) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $line['account_id'],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'related_id_name' => $qaidType,
                'related_name_details' => $code,
                'description' => $line['description'] ?? $details,
            ]);
        }
    }

    protected function prepareJournalLines(TreasuryTransaction $transaction): array
    {
        $amount = (float) $transaction->amount;
        $lines = [];

        if ($transaction->transaction_type === 'transfer') {
            $sourceAccount = $this->resolveTreasuryAccount($transaction->source_account_type, $transaction->source_account_id);
            $destAccount = $this->resolveTreasuryAccount($transaction->destination_account_type, $transaction->destination_account_id);

            $lines[] = [
                'account_id' => $sourceAccount->gl_account_id,
                'debit' => 0,
                'credit' => $amount,
            ];
            $lines[] = [
                'account_id' => $destAccount->gl_account_id,
                'debit' => $amount,
                'credit' => 0,
            ];
        } elseif ($transaction->transaction_type === 'deposit') {
            $destAccount = $this->resolveTreasuryAccount($transaction->destination_account_type, $transaction->destination_account_id);
            $lines[] = [
                'account_id' => $destAccount->gl_account_id,
                'debit' => $amount,
                'credit' => 0,
            ];
            $lines[] = [
                'account_id' => $transaction->counterparty_id, // Assuming counterparty_id is GL account ID for 'other'
                'debit' => 0,
                'credit' => $amount,
            ];
        } elseif ($transaction->transaction_type === 'withdrawal') {
            $sourceAccount = $this->resolveTreasuryAccount($transaction->source_account_type, $transaction->source_account_id);
            $lines[] = [
                'account_id' => $transaction->counterparty_id, // Assuming counterparty_id is GL account ID for 'other'
                'debit' => $amount,
                'credit' => 0,
            ];
            $lines[] = [
                'account_id' => $sourceAccount->gl_account_id,
                'debit' => 0,
                'credit' => $amount,
            ];
        }

        return $lines;
    }

    public function deleteJournalEntry(TreasuryTransaction $transaction): void
    {
        $qaidType = match($transaction->transaction_type) {
            'deposit' => 'BnkReceipt',
            'withdrawal' => 'BnkPayment',
            'transfer' => 'BnkTransfer',
        };

        $header = JournalEntry::where('reference', $transaction->transaction_no)
            ->where('entry_type', $qaidType)
            ->first();

        if ($header) {
            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $header->delete();
        }
    }

    public function updateTreasuryBalance(TreasuryTransaction $transaction): void
    {
        $this->postingService->recalculatePostings($transaction->company_id);
    }

    public function generateNextTransactionCode(): string
    {
        $lastCode = TreasuryTransaction::orderByDesc('id')->value('transaction_no');
        $nextNumber = $this->nextNumericPart($lastCode, $this->transactionCodeStart);
        return $this->transactionCodePrefix . $nextNumber;
    }

    protected function generateNextEntryCode(): string
    {
        $nextNumber = 10001;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, $this->nextNumericPart($entryCode, 10001));
        }
        return 'QID-' . $nextNumber;
    }

    protected function nextNumericPart(?string $code, int $fallbackStart): int
    {
        if (! $code) return $fallbackStart;
        if (preg_match('/(\d+)\s*$/', $code, $matches)) {
            return (int) $matches[1] + 1;
        }
        return $fallbackStart;
    }
}
