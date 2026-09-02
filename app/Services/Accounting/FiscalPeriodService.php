<?php

namespace App\Services\Accounting;

use Illuminate\Support\Facades\DB;

class FiscalPeriodService
{
    /**
     * Create a fiscal year with monthly accounting periods.
     */
    public function createFiscalYear(array $data): array
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
     * Open a fiscal year (allow posting).
     */
    public function openFiscalYear(int $fiscalYearId): array
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
    public function closeFiscalYear(int $fiscalYearId): array
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
    public function closePeriod(int $periodId): array
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
    public function reopenPeriod(int $periodId): array
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
