<?php

namespace App\Services\Accounting;

use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Traits\EnsuresFiscalPeriod;
use Illuminate\Support\Facades\DB;

/**
 * P0-06: Journal Reversal Service.
 *
 * Creates reversal journal entries for posted financial documents.
 * Preserves original accounting history — never deletes posted journals.
 *
 * Reversal entry_code convention: {original}-REV
 * Reversal status: Post (immediately posted)
 * Reversal lines: debit↔credit swapped, all other fields preserved.
 */
class JournalReversalService
{
    use EnsuresFiscalPeriod;

    protected string $journalCodePrefix = 'QID-';
    protected int $journalCodeStart = 10001;

    /**
     * Create a reversal journal for an existing posted journal entry.
     *
     * @param string $originalEntryCode The entry_code of the journal to reverse
     * @param string $reason Description of why the reversal is being created
     * @param string|null $reversalDate Override date (defaults to today)
     * @return JournalEntry|null The reversal journal, or null if no reversal needed
     */
    public function createReversal(
        string $originalEntryCode,
        string $reason = 'Cancellation reversal',
        ?string $reversalDate = null,
    ): ?JournalEntry {
        $original = JournalEntry::where('entry_code', $originalEntryCode)->first();

        if (!$original) {
            return null;
        }

        // Only reverse posted journals
        if (!in_array($original->status, ['Post', 'posted'])) {
            return null;
        }

        // Check if reversal already exists (idempotency)
        $reversalEntryCode = $original->entry_code . '-REV';
        $existing = JournalEntry::where('entry_code', $reversalEntryCode)->first();
        if ($existing) {
            return $existing; // Already reversed
        }

        // Validate fiscal period for the reversal
        $postingDate = $reversalDate ?? now()->toDateString();
        $this->ensureOpenFiscalPeriod($postingDate);

        // Create reversal journal
        $reversalDateObj = $reversalDate ? \Carbon\Carbon::parse($reversalDate) : now();

        $reversal = DB::transaction(function () use ($original, $reversalEntryCode, $reason, $postingDate, $reversalDateObj) {
            $reversal = JournalEntry::create([
                'entry_code' => $reversalEntryCode,
                'entry_type' => $original->entry_type,
                'reference' => $original->reference,
                'date' => $postingDate,
                'description' => $reason . ' (reversal of ' . $original->entry_code . ')',
                'total_amount' => $original->total_amount,
                'status' => 'Post',
                'company_id' => $original->company_id,
            ]);

            // Copy and swap debit↔credit for each line
            $originalLines = JournalEntryLine::where('journal_entry_code', $original->entry_code)->get();

            foreach ($originalLines as $line) {
                JournalEntryLine::create([
                    'journal_entry_code' => $reversalEntryCode,
                    'account_id' => $line->account_id,
                    'debit' => $line->credit,  // Swap
                    'credit' => $line->debit,  // Swap
                    'related_id_name' => $line->related_id_name,
                    'related_name_details' => $line->related_name_details,
                    'description' => $reason . ' (reversal of ' . $original->entry_code . ')',
                    'cost_center_code' => $line->cost_center_code,
                ]);
            }

            return $reversal;
        });

        // Recalculate postings if we have a company_id
        if ($reversal->company_id) {
            app(PostingService::class)->recalculatePostings($reversal->company_id);
        }

        return $reversal;
    }

    /**
     * Check if a journal already has a reversal.
     */
    public function hasReversal(string $entryCode): bool
    {
        return JournalEntry::where('entry_code', $entryCode . '-REV')->exists();
    }

    /**
     * Get the reversal journal for a given journal, if it exists.
     */
    public function getReversal(string $entryCode): ?JournalEntry
    {
        return JournalEntry::where('entry_code', $entryCode . '-REV')->first();
    }

    /**
     * Verify that original + reversal net to zero.
     */
    public function verifyReversalBalance(string $originalEntryCode): bool
    {
        $original = JournalEntry::where('entry_code', $originalEntryCode)->first();
        $reversal = JournalEntry::where('entry_code', $originalEntryCode . '-REV')->first();

        if (!$original || !$reversal) {
            return false;
        }

        $originalDebit = (float) JournalEntryLine::where('journal_entry_code', $originalEntryCode)->sum('debit');
        $originalCredit = (float) JournalEntryLine::where('journal_entry_code', $originalEntryCode)->sum('credit');

        $reversalDebit = (float) JournalEntryLine::where('journal_entry_code', $originalEntryCode . '-REV')->sum('debit');
        $reversalCredit = (float) JournalEntryLine::where('journal_entry_code', $originalEntryCode . '-REV')->sum('credit');

        // Net should be zero: original debit + reversal debit = original credit + reversal credit
        $netDebit = $originalDebit + $reversalDebit;
        $netCredit = $originalCredit + $reversalCredit;

        return abs($netDebit - $netCredit) < 0.01;
    }

    /**
     * Generate the next entry code for a reversal (uses the same convention).
     * This is a fallback — the primary convention is {original}-REV.
     */
    protected function generateNextEntryCode(): string
    {
        $nextNumber = $this->journalCodeStart;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, (int) $this->nextNumericPart($entryCode, $this->journalCodeStart));
        }

        return $this->journalCodePrefix . $nextNumber;
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
