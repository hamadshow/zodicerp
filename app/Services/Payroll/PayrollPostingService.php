<?php

namespace App\Services\Payroll;

use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Services\Accounting\FiscalPeriodService;
use App\Services\Accounting\PostingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Phase 7: Payroll → Accounting integration.
 *
 * Creates the payroll journal entry when a payroll period is posted,
 * using the existing accounting architecture (JournalEntry/JournalEntryLine,
 * QID- entry codes, FiscalPeriodService validation, PostingService sync).
 *
 * Entry layout (default account mapping — configurable per company later):
 *   Dr 600201 Salaries & wages expense   (basic + rewards + overtime)
 *   Dr 600203 Social insurance expense   (— none calculated yet)
 *   Cr 2002  Accrued expenses            (net salary payable)
 *
 * The journal is created INSIDE the posting transaction; any failure
 * aborts the whole posting (period never becomes posted without its
 * journal). Reversal goes through the existing JournalReversalService.
 */
class PayrollPostingService
{
    /** AccID 192 — رواتب وأجور إدارية (admin salaries & wages). */
    private const ACCOUNT_SALARIES_EXPENSE = 192;

    /** AccID 87 — مصروفات مستحقة (accrued expenses / salaries payable). */
    private const ACCOUNT_SALARIES_PAYABLE = 87;

    public function __construct(
        private readonly FiscalPeriodService $fiscalPeriods,
        private readonly PostingService $postings,
    ) {
    }

    /**
     * Called by PayrollWorkflowService during the 'posted' transition.
     * Creates one balanced journal for the whole period (all results).
     */
    public function postPeriodJournal(PayrollPeriod $period, int $actorId): int
    {
        return DB::transaction(function () use ($period, $actorId): int {
            $period = PayrollPeriod::query()->lockForUpdate()->findOrFail($period->getKey());

            if ($period->journals()->exists()) {
                throw ValidationException::withMessages(['status' => 'Payroll period already has a posted journal.']);
            }

            $results = $period->results()->with('components')->lockForUpdate()->get();
            if ($results->isEmpty()) {
                throw ValidationException::withMessages(['status' => 'Cannot post a payroll period without calculated results.']);
            }

            $postingDate = $period->end_date->toDateString();

            // Fiscal-period validation first (throws if no open period).
            $this->fiscalPeriods->validatePostingDate($postingDate);

            $totalNet = '0.00';
            foreach ($results as $result) {
                $totalNet = bcadd($totalNet, (string) $result->net_salary, 2);
            }

            if (bccomp($totalNet, '0.00', 2) === 0) {
                throw ValidationException::withMessages(['status' => 'Nothing to post: total net salary is zero.']);
            }

            $entryCode = $this->generateNextEntryCode();
            $reference = "PAYROLL-{$period->id}-{$period->start_date->format('Ymd')}";

            $header = JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'Payroll',
                'reference' => $reference,
                'date' => $postingDate,
                'description' => "Payroll for period {$period->name}",
                'total_amount' => (float) $totalNet,
                'status' => 'Post',
                'company_id' => $period->company_id,
            ]);

            $this->createLine($entryCode, self::ACCOUNT_SALARIES_EXPENSE, (float) $totalNet, 0, $reference, 'Payroll expense (salaries & wages)');
            $this->createLine($entryCode, self::ACCOUNT_SALARIES_PAYABLE, 0, (float) $totalNet, $reference, 'Salaries payable (accrued)');

            // Keep account_postings cache consistent (existing convention).
            $this->postings->recalculatePostings((int) $period->company_id);

            // belongsToMany pivot link (attach, NOT create — create would
            // instantiate a new empty JournalEntry).
            $period->journals()->attach($header->id, ['posted_by' => $actorId]);

            return $header->id;
        }, 3);
    }

    private function createLine(string $entryCode, int $accountId, float $debit, float $credit, string $reference, string $description): void
    {
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $accountId,
            'debit' => $debit,
            'credit' => $credit,
            'related_id_name' => 'Payroll',
            'related_name_details' => $reference,
            'description' => $description,
        ]);
    }

    private function generateNextEntryCode(): string
    {
        $lastNumeric = JournalEntry::query()
            ->selectRaw("CAST(SUBSTRING(entry_code, 5) AS UNSIGNED) AS n")
            ->where('entry_code', 'like', 'QID-%')
            ->orderByDesc('n')
            ->limit(1)
            ->value('n');

        return 'QID-' . (max(10000, (int) $lastNumeric) + 1);
    }
}
