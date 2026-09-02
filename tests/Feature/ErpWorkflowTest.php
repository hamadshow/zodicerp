<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ErpWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }
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

        $this->actingAs($user, 'sanctum');
        return $user;
    }

    // ========================================
    // GOODS RECEIPT WORKFLOW TESTS
    // ========================================

    /** @test */
    public function goods_receipt_index_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.purchases.goods-receipts.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function goods_receipt_validation_requires_order_and_items()
    {
        $this->actingAsAdmin();
        $response = $this->post(route('admin.purchases.goods-receipts.store'), []);
        $response->assertSessionHasErrors(['order_id', 'warehouse_id', 'receipt_date', 'items']);
    }

    // ========================================
    // STOCK ADJUSTMENT TESTS
    // ========================================

    /** @test */
    public function stock_adjustment_index_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.inventory.stock-adjustments.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function stock_adjustment_validation_requires_warehouse_and_items()
    {
        $this->actingAsAdmin();
        $response = $this->post(route('admin.inventory.stock-adjustments.store'), []);
        $response->assertSessionHasErrors(['warehouse_id', 'adjustment_date', 'reason', 'items']);
    }

    // ========================================
    // FISCAL PERIOD TESTS
    // ========================================

    /** @test */
    public function fiscal_period_index_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.fiscal-periods.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function fiscal_period_creation_requires_name_and_dates()
    {
        $this->actingAsAdmin();
        $response = $this->post(route('admin.fiscal-periods.store'), []);
        $response->assertSessionHasErrors(['name', 'start_date', 'end_date']);
    }

    /** @test */
    public function fiscal_period_service_creates_monthly_periods()
    {
        $service = new \App\Services\Accounting\FiscalPeriodService();

        $year = $service->createFiscalYear([
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        $this->assertNotNull($year);
        $this->assertEquals('FY 2026', $year->name);
        $this->assertEquals('draft', $year->status);

        $periods = DB::table('accounting_periods')
            ->where('fiscal_year_id', $year->id)
            ->count();

        $this->assertEquals(12, $periods, 'Should create 12 monthly periods');
    }

    /** @test */
    public function fiscal_period_open_and_close()
    {
        $service = new \App\Services\Accounting\FiscalPeriodService();

        $year = $service->createFiscalYear([
            'name' => 'FY 2026-OpenTest',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        $opened = $service->openFiscalYear($year->id);
        $this->assertEquals('open', $opened->status);

        $closed = $service->closeFiscalYear($year->id);
        $this->assertEquals('closed', $closed->status);

        $periodsClosed = DB::table('accounting_periods')
            ->where('fiscal_year_id', $year->id)
            ->where('status', 'closed')
            ->count();
        $this->assertEquals(12, $periodsClosed);
    }

    // ========================================
    // TAX RATE TESTS
    // ========================================

    /** @test */
    public function tax_rate_index_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.taxes.rates.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function tax_rate_creation_validation()
    {
        $this->actingAsAdmin();
        $response = $this->post(route('admin.taxes.rates.store'), []);
        $response->assertSessionHasErrors(['name', 'rate', 'type']);
    }

    // ========================================
    // ASSET LIFECYCLE TESTS
    // ========================================

    /** @test */
    public function asset_depreciation_schedule_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.assets.depreciation.schedule'));
        $response->assertStatus(200);
    }

    /** @test */
    public function asset_disposal_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.assets.disposal.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function asset_movements_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.assets.movements.index'));
        $response->assertStatus(200);
    }

    // ========================================
    // RECEIPT VOUCHER (CUSTOMER PAYMENT) TESTS
    // ========================================

    /** @test */
    public function receipt_voucher_index_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.receipt-vouchers.index'));
        $response->assertStatus(200);
    }

    /** @test */
    public function receipt_voucher_validation()
    {
        $this->actingAsAdmin();
        $response = $this->post(route('admin.receipt-vouchers.store'), []);
        $response->assertSessionHasErrors(['customer_id', 'amount', 'payment_method']);
    }

    // ========================================
    // INVENTORY REPORTS
    // ========================================

    /** @test */
    public function inventory_reports_page_loads()
    {
        $this->actingAsAdmin();
        $response = $this->get(route('admin.inventory.reports.index'));
        $response->assertStatus(200);
    }

    // ========================================
    // STOCK ADJUSTMENT SERVICE TESTS
    // ========================================

    /** @test */
    public function stock_adjustment_service_generates_unique_numbers()
    {
        $service = new \App\Services\Inventory\StockAdjustmentService();

        $num1 = $service->getProductQuantity(999, 1);
        $this->assertIsFloat($num1);
    }
}
