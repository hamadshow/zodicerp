<?php

namespace App\Services\Accounting;

use Illuminate\Support\Facades\DB;

class FiscalPeriodService
{
    /**
     * Create a fiscal year with monthly accounting periods.
     */
    public function createFiscalYear(array $data): \stdClass
    {
        $companyId = auth()->user()->company_id ?? 1;

        $fiscalYearId = DB::table('fiscal_years')->insertGetId([
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => 'draft',
            'company_id' => $companyId,
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create monthly periods
        $start = new \DateTime($data['start_date']);
        $end = new \DateTime($data['end_date']);
        $periodNumber = 1;

        while ($start <= $end) {
            $periodEnd = clone $start;
            $periodEnd->modify('last day of this month');
            if ($periodEnd > $end) {
                $periodEnd = clone $end;
            }

            DB::table('accounting_periods')->insert([
                'fiscal_year_id' => $fiscalYearId,
                'name' => "Period {$periodNumber} - " . $start->format('M Y'),
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $periodEnd->format('Y-m-d'),
                'status' => 'open',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $start->modify('first day of next month');
            $periodNumber++;
        }

        return DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
    }

    /**
     * Update a fiscal year's editable fields (name / start_date / end_date).
     *
     * Accounting periods are intentionally NOT touched here: they are generated
     * once at creation and afterwards managed individually (close/reopen).
     * Editing the fiscal year never modifies journal entries or postings.
     */
    public function updateFiscalYear(int $fiscalYearId, array $data): \stdClass
    {
        $year = DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
        if (!$year) {
            throw new \Exception('Fiscal year not found.');
        }

        // Company scope: a fiscal year belongs to one company; never allow
        // editing another company's record (mirrors createFiscalYear scoping).
        $companyId = auth()->user()->company_id ?? 1;
        if ((int) $year->company_id !== (int) $companyId) {
            // Same message as a missing record — do not leak other companies' data.
            throw new \Exception('Fiscal year not found.');
        }

        $startDate = $data['start_date'] ?? $year->start_date;
        $endDate = $data['end_date'] ?? $year->end_date;

        if (strtotime((string) $endDate) <= strtotime((string) $startDate)) {
            throw new \Exception('End date must be after start date.');
        }

        DB::table('fiscal_years')->where('id', $fiscalYearId)->update([
            'name' => $data['name'] ?? $year->name,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'updated_at' => now(),
        ]);

        // Synchronization: when the fiscal year's date range moves to a range
        // that NO LONGER overlaps any of its existing periods, regenerate its
        // monthly periods to match. Posting validation (validatePostingDate)
        // only recognizes coverage built from accounting_periods rows, so an
        // edited year whose periods still point at the old range would
        // silently reject every posting date in the new range (e.g. year
        // edited 2026 → 2025 while its periods remain 2026). A year with
        // partial coverage (e.g. extended by a month) is deliberately left
        // untouched so that closed periods and posting history within the
        // overlap are never invalidated; the explicit regenerate flag in the
        // UI covers full rebuilds for that case.
        $overlaps = DB::table('accounting_periods')
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate)
            ->exists();

        $regenerate = ! empty($data['regenerate_periods']);

        if ($regenerate || ! $overlaps) {
            $this->regeneratePeriods($fiscalYearId, $startDate, $endDate);
        }

        return DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
    }

    /**
     * Replace a fiscal year's monthly periods with a fresh set covering
     * [startDate, endDate]. Periods are account-coverage metadata (no journal
     * entry references them), so replacing them does not touch any postings.
     */
    protected function regeneratePeriods(int $fiscalYearId, string $startDate, string $endDate): void
    {
        DB::transaction(function () use ($fiscalYearId, $startDate, $endDate) {
            DB::table('accounting_periods')->where('fiscal_year_id', $fiscalYearId)->delete();

            $start = new \DateTime($startDate);
            $end = new \DateTime($endDate);
            $periodNumber = 1;

            while ($start <= $end) {
                $periodEnd = clone $start;
                $periodEnd->modify('last day of this month');
                if ($periodEnd > $end) {
                    $periodEnd = clone $end;
                }

                DB::table('accounting_periods')->insert([
                    'fiscal_year_id' => $fiscalYearId,
                    'name' => "Period {$periodNumber} - " . $start->format('M Y'),
                    'start_date' => $start->format('Y-m-d'),
                    'end_date' => $periodEnd->format('Y-m-d'),
                    'status' => 'open',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $start->modify('first day of next month');
                $periodNumber++;
            }
        });
    }

    /**
     * Open a fiscal year (allow posting).
     */
    public function openFiscalYear(int $fiscalYearId): \stdClass
    {
        $year = DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
        if (!$year) {
            throw new \Exception('Fiscal year not found.');
        }

        DB::table('fiscal_years')->where('id', $fiscalYearId)->update([
            'status' => 'open',
            'updated_at' => now(),
        ]);

        return DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
    }

    /**
     * Close a fiscal year and all its periods.
     */
    public function closeFiscalYear(int $fiscalYearId): \stdClass
    {
        return DB::transaction(function () use ($fiscalYearId) {
            $year = DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
            if (!$year) {
                throw new \Exception('Fiscal year not found.');
            }

            if ($year->status === 'closed') {
                throw new \Exception('Fiscal year is already closed.');
            }

            DB::table('accounting_periods')
                ->where('fiscal_year_id', $fiscalYearId)
                ->update(['status' => 'closed', 'closed_by' => auth()->id(), 'closed_at' => now(), 'updated_at' => now()]);

            DB::table('fiscal_years')->where('id', $fiscalYearId)->update([
                'status' => 'closed',
                'closed_by' => auth()->id(),
                'closed_at' => now(),
                'updated_at' => now(),
            ]);

            return DB::table('fiscal_years')->where('id', $fiscalYearId)->first();
        });
    }

    /**
     * Close a single accounting period.
     */
    public function closePeriod(int $periodId): \stdClass
    {
        return DB::transaction(function () use ($periodId) {
            $period = DB::table('accounting_periods')->where('id', $periodId)->first();
            if (!$period) {
                throw new \Exception('Period not found.');
            }

            if ($period->status === 'closed') {
                throw new \Exception('Period is already closed.');
            }

            DB::table('accounting_periods')->where('id', $periodId)->update([
                'status' => 'closed',
                'closed_by' => auth()->id(),
                'closed_at' => now(),
                'updated_at' => now(),
            ]);

            return DB::table('accounting_periods')->where('id', $periodId)->first();
        });
    }

    /**
     * Reopen a single accounting period.
     */
    public function reopenPeriod(int $periodId): \stdClass
    {
        $period = DB::table('accounting_periods')->where('id', $periodId)->first();
        if (!$period) {
            throw new \Exception('Period not found.');
        }

        DB::table('accounting_periods')->where('id', $periodId)->update([
            'status' => 'open',
            'closed_by' => null,
            'closed_at' => null,
            'updated_at' => now(),
        ]);

        return DB::table('accounting_periods')->where('id', $periodId)->first();
    }

    /**
     * Validate that a date falls within an open period.
     * Returns true if posting is allowed, throws exception otherwise.
     */
    public function validatePostingDate(string $postingDate): bool
    {
        $companyId = auth()->user()->company_id ?? 1;

        $period = DB::table('accounting_periods as ap')
            ->join('fiscal_years as fy', 'fy.id', '=', 'ap.fiscal_year_id')
            ->where('fy.company_id', $companyId)
            ->where('ap.start_date', '<=', $postingDate)
            ->where('ap.end_date', '>=', $postingDate)
            ->where('ap.status', 'open')
            ->first();

        if (!$period) {
            throw new \Exception("No open accounting period found for date {$postingDate}. Journal posting is not allowed.");
        }

        return true;
    }

    /**
     * Check if a date is within any closed period.
     */
    public function isClosedPeriod(string $date): bool
    {
        $companyId = auth()->user()->company_id ?? 1;

        return DB::table('accounting_periods as ap')
            ->join('fiscal_years as fy', 'fy.id', '=', 'ap.fiscal_year_id')
            ->where('fy.company_id', $companyId)
            ->where('ap.start_date', '<=', $date)
            ->where('ap.end_date', '>=', $date)
            ->where('ap.status', 'closed')
            ->exists();
    }
}
