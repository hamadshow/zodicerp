<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql' || config('database.connections.mysql.database') === 'u244683233_zodic') {
            throw new RuntimeException('HARD STOP — TEST ENVIRONMENT IS NOT ISOLATED');
        }

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
    protected function ensureTestFiscalPeriods(int $companyId): void
    {
        $existingYear = DB::table('fiscal_years')
            ->where('company_id', $companyId)
            ->where('name', '2026')
            ->first();

        if ($existingYear) {
            return;
        }

        $fiscalYearId = DB::table('fiscal_years')->insertGetId([
            'name' => '2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'open',
            'company_id' => $companyId,
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
        $existingAccountId = DB::table('accounts')
            ->where('AccCode', $code)
            ->value('AccID');

        if ($existingAccountId) {
            return (int) $existingAccountId;
        }

        return DB::table('accounts')->insertGetId([
            'AccCode' => $code,
            'AccName' => $name,
            'AccType' => $type,
            'AccFinal' => 1,
            'AccGroup' => $code[0] === '1' ? 'Assets' : ($code[0] === '2' ? 'Liabilities' : ($code[0] === '4' ? 'Revenue' : 'Expenses')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Invoke the SalesInvoiceController journal-posting method via reflection.
     *
     * The method is intentionally protected in the controller (not part of the
     * public routing contract); the project's accounting tests treat it as a
     * directly-testable journal contract, so we reach it through reflection
     * rather than changing production visibility.
     */
    protected function postSalesInvoiceJournal(\App\Models\Client_Sales\SalesInvoice $invoice): void
    {
        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $method = (new \ReflectionClass($controller))->getMethod('upsertJournalEntryForInvoice');
        $method->setAccessible(true);
        $method->invoke($controller, $invoice);
    }

    /**
     * Establish on-hand weighted-average inventory for a product/warehouse pair.
     *
     * The perpetual-inventory engine rejects sales out of stock, so tests that
     * post a sale must first stock the product through the real WA service.
     * Product/warehouse rows are created fresh per test, so each call applies
     * exactly once to its own scope.
     */
    protected function seedInventory(int $productId, int $warehouseId, string $quantity, string $unitCost): void
    {
        app(\App\Services\Inventory\WeightedAverageCostService::class)->applyInbound(
            $productId,
            $warehouseId,
            $quantity,
            $unitCost,
            'test_inventory_setup',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );
    }
}
