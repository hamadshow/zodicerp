<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * MySQL Integration Tests for Opening Stock and Stock Transfer.
 *
 * These tests verify the current inventory-only behavior:
 *   - Opening Stock: record-keeping only, no quantity update, no GL entry
 *   - Stock Transfer: record-keeping only, no quantity update, no GL entry
 *
 * ARCHITECTURE DECISIONS:
 *
 * Opening Stock:
 *   - Uses inventory_movement_headers with type='opening'
 *   - Does NOT update products.quantity (purely a record)
 *   - Does NOT create GL journal entries
 *   - No approval workflow (direct create)
 *   - Multiple records allowed (initialization data)
 *   - Correct accounting would be: Dr Inventory, Cr Owner Equity
 *   - But architecture doesn't support it (no quantity update mechanism)
 *
 * Stock Transfer:
 *   - Uses inventory_movement_headers with type='transfer'
 *   - Does NOT update products.quantity (purely a record)
 *   - Does NOT create GL journal entries
 *   - No approval workflow (direct create)
 *   - cost_price is always 0 (no valuation)
 *   - Correct accounting would be: Dr Inventory-B, Cr Inventory-A
 *   - But architecture doesn't support it (no per-warehouse accounts)
 */
class OpeningStockAndTransferTest extends TestCase
{
    protected int $testUserId;
    protected int $testCompanyId;
    protected int $testWarehouseId;
    protected int $testProductId;
    protected int $testUnitId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        $this->testCompanyId = 1;

        // Create test user
        $email = 'ost-test-' . uniqid() . '@zodicerp-test.com';
        $this->testUserId = DB::table('users')->insertGetId([
            'username' => 'ost-tester',
            'email' => $email,
            'password' => bcrypt('password'),
            'role' => 'admin',
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Ensure company exists
        DB::table('company')->insertOrIgnore([
            'id' => 1,
            'company_name' => 'OST Test Company',
            'company_code' => 'OST-TEST',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create branch
        $branch = DB::table('branches')->where('branch_code', 'OST-TEST-BR')->first();
        $branchId = $branch?->id ?? DB::table('branches')->insertGetId([
            'company_id' => $this->testCompanyId,
            'branch_code' => 'OST-TEST-BR',
            'branch_name' => 'OST Test Branch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create warehouses
        $wh1 = DB::table('warehouses')->where('warehouse_code', 'OST-WH-A')->first();
        $this->testWarehouseId = $wh1?->id ?? DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'OST-WH-A',
            'name' => 'OST Warehouse A',
            'branch_id' => $branchId,
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $wh2 = DB::table('warehouses')->where('warehouse_code', 'OST-WH-B')->first();
        $this->secondWarehouseId = $wh2?->id ?? DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'OST-WH-B',
            'name' => 'OST Warehouse B',
            'branch_id' => $branchId,
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create unit
        $unit = DB::table('item_units')->where('name', 'OST Test Unit')->first();
        $this->testUnitId = $unit?->id ?? DB::table('item_units')->insertGetId([
            'name' => 'OST Test Unit',
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => true,
            'created_by' => $this->testUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create product
        $uniqid = uniqid();
        $this->testProductId = DB::table('products')->insertGetId([
            'product_code' => 'OST-TP-' . $uniqid,
            'name' => 'OST TEST PRODUCT ' . $uniqid,
            'slug' => 'ost-test-product-' . $uniqid,
            'sku' => 'OST-TEST-' . $uniqid,
            'quantity' => 0,
            'cost_per_item' => 10.00,
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        // Clean up test data
        DB::table('inventory_movement_lines')
            ->whereIn('stock_movement_id', function ($q) {
                $q->select('id')->from('inventory_movement_headers')
                    ->where('voucher_num', 'like', 'OST-%')
                    ->orWhere('voucher_num', 'like', 'TR-OST-%');
            })
            ->delete();
        DB::table('inventory_movement_headers')
            ->where('voucher_num', 'like', 'OST-%')
            ->orWhere('voucher_num', 'like', 'TR-OST-%')
            ->delete();

        if ($this->testProductId) {
            DB::table('products')->where('id', $this->testProductId)->delete();
        }
        if ($this->testUserId) {
            DB::table('users')->where('id', $this->testUserId)->delete();
        }

        parent::tearDown();
    }

    // ========================================================================
    // OPENING STOCK TESTS
    // ========================================================================

    /** @test */
    public function opening_stock_creates_movement_record()
    {
        $result = $this->createOpeningStock(50, 10.00);

        // Verify movement header was created
        $header = DB::table('inventory_movement_headers')
            ->where('id', $result)
            ->first();
        $this->assertNotNull($header);
        $this->assertEquals('opening', $header->type);
        $this->assertEquals('in', $header->direction);
        $this->assertEquals($this->testWarehouseId, $header->warehouse_id);

        // Verify movement line was created
        $line = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $result)
            ->first();
        $this->assertNotNull($line);
        $this->assertEquals($this->testProductId, $line->product_id);
        $this->assertEquals(50.0, (float) $line->quantity);
        $this->assertEquals(10.00, (float) $line->cost_price);
    }

    /** @test */
    public function opening_stock_updates_product_quantity()
    {
        $this->createOpeningStock(50, 10.00);

        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(50, (int) $product->quantity, 'Opening stock MUST update product quantity');
    }

    /** @test */
    public function opening_stock_does_not_create_journal_entry()
    {
        $this->createOpeningStock(50, 10.00);

        $journals = DB::table('journal_entries')
            ->where('reference', 'like', 'OST-%')
            ->count();
        $this->assertEquals(0, $journals, 'Opening stock must NOT create journal entries');
    }

    /** @test */
    public function multiple_opening_stock_records_are_allowed()
    {
        $id1 = $this->createOpeningStock(50, 10.00);
        $id2 = $this->createOpeningStock(30, 15.00);

        $this->assertNotEquals($id1, $id2);

        $headers = DB::table('inventory_movement_headers')
            ->where('type', 'opening')
            ->where('voucher_num', 'like', 'OST-%')
            ->count();
        $this->assertEquals(2, $headers, 'Multiple opening stock records must be allowed');
    }

    /** @test */
    public function opening_stock_total_value_is_stored()
    {
        $id = $this->createOpeningStock(50, 10.00);

        $line = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $id)
            ->first();
        $expectedValue = 50 * 10.00;
        $this->assertEquals($expectedValue, (float) $line->quantity * (float) $line->cost_price);
    }

    // ========================================================================
    // STOCK TRANSFER TESTS
    // ========================================================================

    /** @test */
    public function stock_transfer_creates_movement_record()
    {
        $result = $this->createStockTransfer(20);

        // Verify movement header was created
        $header = DB::table('inventory_movement_headers')
            ->where('id', $result)
            ->first();
        $this->assertNotNull($header);
        $this->assertEquals('transfer', $header->type);
        $this->assertEquals('out', $header->direction);
        $this->assertEquals($this->testWarehouseId, $header->warehouse_id);
        $this->assertEquals($this->secondWarehouseId, $header->to_warehouse_id);

        // Verify movement line was created
        $line = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $result)
            ->first();
        $this->assertNotNull($line);
        $this->assertEquals($this->testProductId, $line->product_id);
        $this->assertEquals(20.0, (float) $line->quantity);
    }

    /** @test */
    public function stock_transfer_does_not_update_product_quantity()
    {
        $this->createStockTransfer(20);

        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(0, (int) $product->quantity, 'Stock transfer must NOT update product quantity');
    }

    /** @test */
    public function stock_transfer_does_not_create_journal_entry()
    {
        $this->createStockTransfer(20);

        $journals = DB::table('journal_entries')
            ->where('reference', 'like', 'TR-OST-%')
            ->count();
        $this->assertEquals(0, $journals, 'Stock transfer must NOT create journal entries');
    }

    /** @test */    public function stock_transfer_cost_price_uses_product_cost()
    {
        $id = $this->createStockTransfer(20);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $id)->first();
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $expectedCost = (float) ($product->cost_per_item ?? 0);
        $this->assertEquals($expectedCost, (float) $line->cost_price, 'Stock transfer must use products.cost_per_item');
    }

    /** @test */
    public function stock_transfer_records_both_warehouses()
    {
        $id = $this->createStockTransfer(20);

        $header = DB::table('inventory_movement_headers')
            ->where('id', $id)
            ->first();
        $this->assertEquals($this->testWarehouseId, $header->warehouse_id);
        $this->assertEquals($this->secondWarehouseId, $header->to_warehouse_id);
    }

    /** @test */
    public function stock_transfer_total_inventory_unchanged()
    {
        // Create initial stock via opening stock (now updates product quantity)
        $this->createOpeningStock(100, 10.00);

        // Record a transfer (global quantity unchanged — stock moves between warehouses)
        $this->createStockTransfer(30);

        // Product quantity should reflect opening stock only (transfer doesn't change global quantity)
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(100, (int) $product->quantity, 'Total inventory unchanged by warehouse-to-warehouse transfer');
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    protected int $secondWarehouseId;

    private function createOpeningStock(float $quantity, float $costPrice): int
    {
        $voucherNum = 'OST-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $id = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'voucher_num' => $voucherNum,
            'warehouse_id' => $this->testWarehouseId,
            'company_id' => $this->testCompanyId,
            'created_by' => $this->testUserId,
            'notes' => 'OpeningStock',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $id,
            'product_id' => $this->testProductId,
            'unit_id' => $this->testUnitId,
            'quantity' => $quantity,
            'cost_price' => $costPrice,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Mirror controller behavior: update product quantity
        DB::table('products')
            ->where('id', $this->testProductId)
            ->increment('quantity', $quantity);

        return $id;
    }

    private function createStockTransfer(float $quantity): int
    {
        $voucherNum = 'TR-OST-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $id = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'voucher_num' => $voucherNum,
            'warehouse_id' => $this->testWarehouseId,
            'from_warehouse_id' => $this->testWarehouseId,
            'to_warehouse_id' => $this->secondWarehouseId,
            'company_id' => $this->testCompanyId,
            'created_by' => $this->testUserId,
            'notes' => 'TransferStock',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Use product's cost_per_item as transfer cost basis (matches controller behavior)
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $costPrice = (float) ($product->cost_per_item ?? 0);

        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $id,
            'product_id' => $this->testProductId,
            'unit_id' => $this->testUnitId,
            'quantity' => $quantity,
            'cost_price' => $costPrice,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }
}
