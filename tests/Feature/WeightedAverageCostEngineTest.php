<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WeightedAverageCostEngineTest extends TestCase
{
    private int $companyId = 1;
    private int $otherCompanyId;
    private int $userId;
    private int $productId;
    private int $warehouseId;
    private int $unitId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('Weighted Average verification requires MySQL/MariaDB.');
        }

        $this->userId = DB::table('users')->insertGetId([
            'username' => 'wa-test-'.uniqid(),
            'email' => 'wa-test-'.uniqid().'@zodicerp-test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->otherCompanyId = DB::table('company')->insertGetId([
            'company_code' => 'WA-OTHER-'.uniqid(),
            'company_name' => 'WA Other Company',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::findOrFail($this->userId));

        $branchId = DB::table('branches')->insertGetId([
            'company_id' => $this->companyId,
            'branch_code' => 'WA-BR-'.uniqid(),
            'branch_name' => 'WA Test Branch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->warehouseId = DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'WA-WH-'.uniqid(),
            'name' => 'WA Test Warehouse',
            'branch_id' => $branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->unitId = DB::table('item_units')->insertGetId([
            'name' => 'WA Test Unit '.uniqid(),
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => true,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->productId = DB::table('products')->insertGetId([
            'product_code' => 'WA-PR-'.uniqid(),
            'name' => 'WA Test Product',
            'slug' => 'wa-test-'.uniqid(),
            'sku' => 'WA-SKU-'.uniqid(),
            'quantity' => 0,
            'cost_per_item' => 999,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        DB::table('inventory_cost_transactions')->where('product_id', $this->productId ?? 0)->delete();
        DB::table('inventory_cost_balances')->where('product_id', $this->productId ?? 0)->delete();
        DB::table('products')->where('id', $this->productId ?? 0)->delete();
        DB::table('item_units')->where('id', $this->unitId ?? 0)->delete();
        DB::table('warehouses')->where('id', $this->warehouseId ?? 0)->delete();
        DB::table('branches')->where('branch_code', 'like', 'WA-BR-%')->delete();
        DB::table('users')->where('id', $this->userId ?? 0)->delete();
        DB::table('company')->where('id', $this->otherCompanyId ?? 0)->delete();

        parent::tearDown();
    }

    public function test_weighted_average_receipts_sales_returns_and_purchase_returns(): void
    {
        $service = app(WeightedAverageCostService::class);
        $today = now()->toDateString();

        $service->applyInbound($this->productId, $this->warehouseId, '100', '100', 'wa_receipt', 1, $today);
        $service->applyInbound($this->productId, $this->warehouseId, '100', '120', 'wa_receipt', 2, $today);
        $service->applyInbound($this->productId, $this->warehouseId, '50', '140', 'wa_receipt', 3, $today);

        $balance = $service->current($this->productId, $this->warehouseId);
        $this->assertSame('250.0000', (string) $balance->quantity);
        $this->assertSame('29000.000000', (string) $balance->inventory_value);
        $this->assertSame('116.000000', (string) $balance->average_cost);

        $sale = $service->applyOutbound($this->productId, $this->warehouseId, '50', 'sales_invoice_detail', 10, $today);
        $this->assertSame('-5800.000000', (string) $sale->value_delta);

        $return = $service->applyInbound($this->productId, $this->warehouseId, '10', '116', 'sales_return_detail', 11, $today);
        $this->assertSame('116.000000', (string) $return->unit_cost);

        $service->applyOutbound($this->productId, $this->warehouseId, '20', 'purchase_return_detail', 12, $today);
        $balance = $service->current($this->productId, $this->warehouseId);
        $this->assertSame('190.0000', (string) $balance->quantity);
        $this->assertSame('22040.000000', (string) $balance->inventory_value);
        $this->assertSame('116.000000', (string) $balance->average_cost);
    }

    public function test_negative_backdated_and_duplicate_events_are_blocked_or_idempotent(): void
    {
        $service = app(WeightedAverageCostService::class);
        $today = now()->toDateString();
        $service->applyInbound($this->productId, $this->warehouseId, '100', '100', 'wa_receipt', 20, $today);

        $duplicate = $service->applyInbound($this->productId, $this->warehouseId, '100', '100', 'wa_receipt', 20, $today);
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'wa_receipt')->where('source_id', 20)->count());
        $this->assertSame('100.0000', (string) $duplicate->new_quantity);

        $this->expectException(\RuntimeException::class);
        $service->applyOutbound($this->productId, $this->warehouseId, '101', 'sales_invoice_detail', 21, $today);
    }
    public function test_backdated_and_cross_company_events_are_rejected(): void
    {
        $service = app(WeightedAverageCostService::class);
        $today = now()->toDateString();
        $service->applyInbound($this->productId, $this->warehouseId, '1', '100', 'wa_receipt', 30, $today);

        try {
            $service->applyInbound($this->productId, $this->warehouseId, '1', '100', 'wa_receipt', 31, now()->subDay()->toDateString());
            $this->fail('Backdated costing should be rejected.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Backdated', $exception->getMessage());
        }

        DB::table('products')->where('id', $this->productId)->update(['company_id' => $this->otherCompanyId]);
        try {
            $service->applyInbound($this->productId, $this->warehouseId, '1', '100', 'wa_receipt', 32, $today);
            $this->fail('Cross-company costing should be rejected.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('active company', $exception->getMessage());
        }
     }
 }
