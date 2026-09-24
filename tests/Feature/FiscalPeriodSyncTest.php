<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Fiscal-year ↔ accounting-period synchronization when editing a fiscal
 * year (the root cause of "No open accounting period found" for dates in
 * the edited year's new range).
 *
 * Runs against the shared app database (no RefreshDatabase); all fixtures
 * are uniquely named and removed in tearDown().
 */
class FiscalPeriodSyncTest extends TestCase
{
    private array $testFiscalYearIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }
    }

    protected function tearDown(): void
    {
        if (! empty($this->testFiscalYearIds)) {
            DB::table('accounting_periods')->whereIn('fiscal_year_id', $this->testFiscalYearIds)->delete();
            DB::table('fiscal_years')->whereIn('id', $this->testFiscalYearIds)->delete();
        }

        parent::tearDown();
    }

    private function actingAsAdmin(): User
    {
        $user = User::firstOrCreate(
            ['email' => 'admin-erp-test@zodicerp-test.com'],
            [
                'username' => 'admin-erp-test',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'company_id' => 1,
            ]
        );

        $this->actingAs($user, 'web');
        return $user;
    }

    private function makeYear(string $name, string $start, string $end): object
    {
        $year = (new \App\Services\Accounting\FiscalPeriodService())->createFiscalYear([
            'name' => $name,
            'start_date' => $start,
            'end_date' => $end,
        ]);
        $this->testFiscalYearIds[] = $year->id;

        return $year;
    }

    private function periodCount(int $fiscalYearId): int
    {
        return DB::table('accounting_periods')->where('fiscal_year_id', $fiscalYearId)->count();
    }

    /** @test */
    public function editing_year_to_a_disjoint_range_regenerates_periods()
    {
        $this->actingAsAdmin();

        $year = $this->makeYear('FY SyncTest 2026A', '2026-01-01', '2026-12-31');
        $this->assertEquals(12, $this->periodCount($year->id));

        // Edit the year to 2025 — a range disjoint from its 2026 periods.
        (new \App\Services\Accounting\FiscalPeriodService())->updateFiscalYear($year->id, [
            'name' => 'FY SyncTest 2025A',
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
        ]);

        $year = DB::table('fiscal_years')->where('id', $year->id)->first();
        $this->assertEquals('2025-01-01', $year->start_date);
        $this->assertEquals('2025-12-31', $year->end_date);

        // Periods must now cover 2025, all open.
        $periods = DB::table('accounting_periods')
            ->where('fiscal_year_id', $year->id)
            ->orderBy('start_date')
            ->get();
        $this->assertEquals(12, $periods->count());
        $this->assertEquals('2025-01-01', $periods->first()->start_date);
        $this->assertEquals('2025-12-31', $periods->last()->end_date);
        $this->assertEquals('open', $periods->last()->status);

        // Posting validation must now recognize dates in the new range.
        $this->assertTrue(
            (new \App\Services\Accounting\FiscalPeriodService())->validatePostingDate('2025-12-20 00:00:00')
        );
    }

    /** @test */
    public function editing_year_with_overlapping_range_preserves_existing_periods()
    {
        $this->actingAsAdmin();

        $service = new \App\Services\Accounting\FiscalPeriodService();
        $year = $this->makeYear('FY SyncTest 2026B-H1', '2026-01-01', '2026-06-30');

        // Close one period to prove it survives a partial-overlap edit.
        $firstPeriod = DB::table('accounting_periods')->where('fiscal_year_id', $year->id)->orderBy('id')->first();
        $service->closePeriod($firstPeriod->id);

        // Extend the year to full 2026 — overlapping the existing periods.
        $service->updateFiscalYear($year->id, [
            'name' => 'FY SyncTest 2026B-H1',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        $periods = DB::table('accounting_periods')->where('fiscal_year_id', $year->id)->get();
        $this->assertEquals(6, $periods->count(), 'Overlapping edit must not regenerate periods');

        $stillClosed = DB::table('accounting_periods')->where('id', $firstPeriod->id)->first();
        $this->assertEquals('closed', $stillClosed->status, 'Closed period must be preserved');
    }

    /** @test */
    public function explicit_regenerate_flag_rebuilds_all_periods_open()
    {
        $this->actingAsAdmin();

        $service = new \App\Services\Accounting\FiscalPeriodService();
        $year = $this->makeYear('FY SyncTest 2026C-H1', '2026-01-01', '2026-06-30');
        $firstPeriod = DB::table('accounting_periods')->where('fiscal_year_id', $year->id)->orderBy('id')->first();
        $service->closePeriod($firstPeriod->id);

        // Same overlapping edit, but with the explicit regenerate flag.
        $service->updateFiscalYear($year->id, [
            'name' => 'FY SyncTest 2026C-H1',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'regenerate_periods' => true,
        ]);

        $periods = DB::table('accounting_periods')
            ->where('fiscal_year_id', $year->id)
            ->orderBy('start_date')
            ->get();
        $this->assertEquals(12, $periods->count(), 'Flag must rebuild full monthly coverage');
        $this->assertEquals('2026-01-01', $periods->first()->start_date);
        $this->assertEquals('2026-12-31', $periods->last()->end_date);
        $this->assertEquals(0, $periods->where('status', 'closed')->count(), 'Rebuilt periods are all open');
    }

    /** @test */
    public function fiscal_period_ui_update_endpoint_persists_synchronization()
    {
        $this->actingAsAdmin();

        $year = $this->makeYear('FY SyncTest 2026D', '2026-01-01', '2026-12-31');

        // The exact path the Fiscal Periods UI uses: PUT /admin/fiscal-periods/{id}.
        $response = $this->put(route('admin.fiscal-periods.update', $year->id), [
            'name' => 'FY SyncTest 2025D',
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $periods = DB::table('accounting_periods')->where('fiscal_year_id', $year->id)->get();
        $this->assertEquals(12, $periods->count());
        $this->assertEquals('2025-01-01', $periods->min('start_date'));
        $this->assertEquals('2025-12-31', $periods->max('end_date'));
    }

    /** @test */
    public function posting_is_rejected_inside_a_closed_period()
    {
        $this->actingAsAdmin();

        $service = new \App\Services\Accounting\FiscalPeriodService();
        $year = $this->makeYear('FY SyncTest 2025E', '2025-01-01', '2025-12-31');

        $decPeriod = DB::table('accounting_periods')
            ->where('fiscal_year_id', $year->id)
            ->where('start_date', '<=', '2025-12-20')
            ->where('end_date', '>=', '2025-12-20')
            ->first();
        $this->assertNotNull($decPeriod);

        $service->closePeriod($decPeriod->id);

        $this->expectException(\Exception::class);
        $service->validatePostingDate('2025-12-20 00:00:00');
    }

    /** @test */
    public function posting_is_rejected_outside_all_periods()
    {
        $this->actingAsAdmin();

        $service = new \App\Services\Accounting\FiscalPeriodService();

        // 2031 is covered by no fiscal year in this database.
        $existing = DB::table('accounting_periods as ap')
            ->join('fiscal_years as fy', 'fy.id', '=', 'ap.fiscal_year_id')
            ->where('ap.start_date', '<=', '2031-06-15')
            ->where('ap.end_date', '>=', '2031-06-15')
            ->exists();
        $this->assertFalse($existing, 'Test premise: no period covers 2031-06-15');

        $this->expectException(\Exception::class);
        $service->validatePostingDate('2031-06-15 00:00:00');
    }

    /** @test */
    public function posting_is_rejected_for_another_companys_period()
    {
        $this->actingAsAdmin(); // company_id = 1

        // A period covering the date but belonging to company 2.
        $fyId = DB::table('fiscal_years')->insertGetId([
            'name' => 'FY SyncTest OtherCo',
            'start_date' => '2032-01-01',
            'end_date' => '2032-12-31',
            'status' => 'open',
            'company_id' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->testFiscalYearIds[] = $fyId;

        DB::table('accounting_periods')->insert([
            'fiscal_year_id' => $fyId,
            'name' => 'Period 6 - Jun 2032',
            'start_date' => '2032-06-01',
            'end_date' => '2032-06-30',
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Exception::class);
        (new \App\Services\Accounting\FiscalPeriodService())->validatePostingDate('2032-06-15 00:00:00');
    }

    /** @test */
    public function posting_accepts_period_boundary_dates()
    {
        $this->actingAsAdmin();

        $this->makeYear('FY SyncTest 2027F', '2027-01-01', '2027-12-31');
        $service = new \App\Services\Accounting\FiscalPeriodService();

        $this->assertTrue($service->validatePostingDate('2027-01-01'));
        $this->assertTrue($service->validatePostingDate('2027-06-15'));
        $this->assertTrue($service->validatePostingDate('2027-12-31'));
    }
}
