<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        \Illuminate\Support\Facades\URL::defaults([
            'country' => 'sa',
            'lang' => 'ar',
        ]);
    }

    /**
     * Creates the application.
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }

    /**
     * Ensure a fiscal year and open accounting periods exist for testing.
     *
     * Creates a 2026 fiscal year (Jan 1 – Dec 31) with 12 open monthly
     * periods if none exist for the given company.
     *
     * This is a TEST-ONLY helper. It must NOT be used in production seeders.
     */
    protected function ensureTestFiscalPeriods(int $companyId = 1): void
    {
        $existingYear = DB::table('fiscal_years')
            ->where('company_id', $companyId)
            ->where('name', '2026')
            ->first();

        if ($existingYear) {
            return; // already set up
        }

        $fiscalYearId = DB::table('fiscal_years')->insertGetId([
            'name' => '2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'open',
            'company_id' => $companyId,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $start = new \DateTime('2026-01-01');
        $periodNumber = 1;

        for ($i = 0; $i < 12; $i++) {
            $periodEnd = (clone $start)->modify('last day of this month');

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
    }

    /**
     * Create a test account in the database.
     * Returns the AccID.
     */
    protected function createTestAccount(string $code, string $name, int $type = 1): int
    {
        return DB::table('accounts')->insertGetId([
            'AccCode' => $code,
            'AccName' => $name,
            'AccType' => $type,
            'AccGroup' => $code[0] === '1' ? 'Assets' : ($code[0] === '2' ? 'Liabilities' : ($code[0] === '4' ? 'Revenue' : 'Expenses')),
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
