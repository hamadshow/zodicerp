<?php

namespace App\Services\Accounting;

use App\Models\Accounting\AccountPosting;
use Illuminate\Support\Facades\DB;

/**
 * P0-05: Shared posting recalculation service.
 *
 * Extracted from JournalController::recalculatePostings() and
 * TreasuryService::recalculatePostings() which were near-duplicates.
 *
 * This service recalculates account_postings from journal_entry_lines
 * for all posted journals of a given company.
 */
class PostingService
{
    /**
     * Recalculate all account_postings for a company from posted journal entry lines.
     *
     * This resets current_debit/current_credit to 0, then re-aggregates
     * from all posted journal entries for the company.
     *
     * Called after: journal creation (if posted), journal update, postAll, unpostAll,
     * treasury transaction create/update/delete.
     *
     * Note: opening_debit/opening_credit are NOT set by this method (remain 0).
     * The current system does not use stored opening balances.
     */
    public function recalculatePostings(int $companyId): void
    {
        // Reset current debits/credits for this company
        AccountPosting::where('company_id', $companyId)->update([
            'current_debit' => 0,
            'current_credit' => 0,
        ]);

        // Aggregate from posted journal lines
        $lines = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_code', '=', 'journal_entries.entry_code')
            ->where('journal_entries.company_id', $companyId)
            ->whereIn('journal_entries.status', ['Post', 'posted'])
            ->select(
                'journal_entry_lines.account_id',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('journal_entry_lines.account_id')
            ->get();

        foreach ($lines as $line) {
            if (! $line->account_id) {
                continue;
            }

            AccountPosting::updateOrCreate(
                [
                    'account_id' => $line->account_id,
                    'company_id' => $companyId,
                ],
                [
                    'current_debit' => $line->total_debit,
                    'current_credit' => $line->total_credit,
                    'period_start' => now()->startOfYear()->toDateString(),
                    'period_end' => now()->endOfYear()->toDateString(),
                ]
            );
        }
    }
}
