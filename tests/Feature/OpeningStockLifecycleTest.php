<?php

namespace Tests\Feature;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\OpeningStockService;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 3 — Opening Stock lifecycle (D1 + D3 + D4).
 *
 * Opening stock now:
 *  - converts document quantities to base units (movement contract),
 *  - seeds WAC via applyInbound at the entered cost (D1),
 *  - updates products.quantity as a derived cache (D3),
 *  - is fully transactional (any failure rolls back everything),
 *  - allows exactly one active record per (company, warehouse, product),
 *  - edits via exact reversal-and-replacement, deletes via exact reversal,
 *    never destroying history.
 */
class OpeningStockLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $productId;

    protected int $baseUnitId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'OSL Co',
            'company_code' => 'OSL',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'osl_'.$suffix,
            'fullname' => 'OSL Tester',
            'email' => 'osl_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'OSL-BR-'.$suffix,
            'branch_name' => 'OSL Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'OSL-WH-'.$suffix,
            'name' => 'OSL Warehouse',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->baseUnitId = ItemUnit::query()->insertGetId([
            'name' => 'OSL Base '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'OSL-PRD-'.$suffix,
            'name' => 'OSL Product',
            'slug' => 'osl-product-'.$suffix,
            'sku' => 'OSL-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->baseUnitId,
            'cost_per_item' => 10,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /* =====================================================================
     | Creation + conversion + WAC (D1/D3)
     ===================================================================== */

    /** @test */
    public function creation_persists_movement_wac_and_derived_quantity()
    {
        $header = app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'movement_date' => '2026-01-15',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 25, 'cost_price' => 4],
            ],
        ]);

        $this->assertSame('2026-01-15', (string) $header->movement_date);
        $this->assertSame('opening', $header->type);
        $this->assertSame('in', $header->direction);
        $this->assertNotNull($header->reference_type);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(25.0, (float) $line->quantity);
        $this->assertSame(4.0, (float) $line->cost_price);
        $this->assertNotNull($line->conversion_factor_snapshot);
        $this->assertNotNull($line->original_quantity);

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertNotNull($balance, 'D1: opening stock must seed WAC.');
        $this->assertSame(25.0, (float) $balance->quantity);
        $this->assertSame(100.0, (float) $balance->inventory_value);
        $this->assertEqualsWithDelta(4.0, (float) $balance->average_cost, 0.000001);

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'opening_stock_line')
            ->where('movement_header_id', $header->id)
            ->first();
        $this->assertNotNull($ict);
        $this->assertSame(25.0, (float) $ict->quantity_delta);
        $this->assertSame((int) $line->id, (int) $ict->movement_line_id, 'ICT must link to its movement line.');

        $this->assertSame(25.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function document_units_are_converted_to_base_units_across_all_ledgers()
    {
        $suffix = uniqid();
        $boxUnitId = ItemUnit::query()->insertGetId([
            'name' => 'OSL Box '.$suffix,
            'unit_type' => 2,
            'base_unit' => $this->baseUnitId,
            'conversion_factor' => 12,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                // 3 boxes @ 24/box => 36 base @ 2/base
                ['product_id' => $this->productId, 'unit_id' => $boxUnitId, 'quantity' => 3, 'cost_price' => 24],
            ],
        ]);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', DB::table('inventory_movement_headers')->where('type', 'opening')->latest('id')->value('id'))->first();
        $this->assertSame(36.0, (float) $line->quantity, 'Movement line must store the BASE quantity.');
        $this->assertSame(3.0, (float) $line->original_quantity);
        $this->assertEqualsWithDelta(12.0, (float) $line->conversion_factor_snapshot, 0.000001);
        $this->assertEqualsWithDelta(2.0, (float) $line->cost_price, 0.000001, 'Line cost must be per BASE unit.');

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(36.0, (float) $balance->quantity);
        $this->assertSame(72.0, (float) $balance->inventory_value, 'WAC value must be 36 x 2, not 3 x 24.');

        $this->assertSame(36.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function decimal_quantities_are_handled_without_precision_loss()
    {
        app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 12.345, 'cost_price' => 3.33],
            ],
        ]);

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->first();
        $this->assertEqualsWithDelta(12.345, (float) $balance->quantity, 0.000001);
        // 12.345 x 3.33 = 41.10885 exactly (bcmath, scale 6).
        $this->assertEqualsWithDelta(41.10885, (float) $balance->inventory_value, 0.001);

        $this->assertEqualsWithDelta(
            12.345,
            (float) DB::table('products')->where('id', $this->productId)->value('quantity'),
            0.000001
        );
    }

    /** @test */
    public function multiple_warehouses_get_independent_balances()
    {
        $suffix = uniqid();
        $warehouseB = Warehouses::query()->insertGetId([
            'warehouse_code' => 'OSL-WHB-'.$suffix,
            'name' => 'OSL Warehouse B',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);
        app(OpeningStockService::class)->create([
            'warehouse_id' => $warehouseB,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 7, 'cost_price' => 9],
            ],
        ]);

        $balanceA = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseId)->first();
        $balanceB = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $warehouseB)->first();

        $this->assertSame(10.0, (float) $balanceA->quantity);
        $this->assertEqualsWithDelta(5.0, (float) $balanceA->average_cost, 0.000001);
        $this->assertSame(7.0, (float) $balanceB->quantity);
        $this->assertEqualsWithDelta(9.0, (float) $balanceB->average_cost, 0.000001);

        $this->assertSame(17.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /* =====================================================================
     | Duplicate submission guards (D7)
     ===================================================================== */

    /** @test */
    public function duplicate_submission_for_same_product_and_warehouse_is_rejected()
    {
        $service = app(OpeningStockService::class);

        $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 5, 'cost_price' => 5],
            ],
        ]);
    }

    /** @test */
    public function duplicate_products_within_one_submission_are_rejected()
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 5, 'cost_price' => 5],
            ],
        ]);
    }

    /** @test */
    public function the_same_product_may_open_in_different_warehouses()
    {
        $suffix = uniqid();
        $warehouseB = Warehouses::query()->insertGetId([
            'warehouse_code' => 'OSL-WHC-'.$suffix,
            'name' => 'OSL Warehouse C',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(OpeningStockService::class);

        $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);

        $header = $service->create([
            'warehouse_id' => $warehouseB,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 4, 'cost_price' => 8],
            ],
        ]);

        $this->assertNotNull($header->id);
    }

    /* =====================================================================
     | Rollback
     ===================================================================== */

    /** @test */
    public function failure_mid_application_rolls_back_everything()
    {
        // Unit conversion fails on the SECOND item (unknown unit => conversion
        // exception) after the first item already wrote movement + WAC + qty.
        $suffix = uniqid();
        $goodUnitId = $this->baseUnitId;
        $brokenUnitId = ItemUnit::query()->insertGetId([
            'name' => 'OSL Orphan '.$suffix,
            'unit_type' => 2,
            'base_unit' => $this->baseUnitId,
            'conversion_factor' => 3,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // A second product whose unit has NO conversion path => toBase() throws.
        $orphanBaseUnitId = ItemUnit::query()->insertGetId([
            'name' => 'OSL Other Base '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $brokenProductId = Products::query()->insertGetId([
            'product_code' => 'OSL-BROKEN-'.$suffix,
            'name' => 'OSL Broken Product',
            'slug' => 'osl-broken-'.$suffix,
            'sku' => 'OSL-BROKEN-'.$suffix,
            'quantity' => 0,
            'unit_id' => $orphanBaseUnitId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headersBefore = DB::table('inventory_movement_headers')->where('type', 'opening')->count();
        $balancesBefore = DB::table('inventory_cost_balances')->count();
        $qtyBefore = (float) DB::table('products')->where('id', $this->productId)->value('quantity');

        try {
            app(OpeningStockService::class)->create([
                'warehouse_id' => $this->warehouseId,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $goodUnitId, 'quantity' => 10, 'cost_price' => 5],
                    ['product_id' => $brokenProductId, 'unit_id' => $brokenUnitId, 'quantity' => 5, 'cost_price' => 5],
                ],
            ]);
            $this->fail('Expected the broken conversion to fail the whole submission.');
        } catch (\RuntimeException) {
            // expected
        }

        $this->assertSame($headersBefore, DB::table('inventory_movement_headers')->where('type', 'opening')->count(), 'Header must roll back.');
        $this->assertSame($balancesBefore, DB::table('inventory_cost_balances')->count(), 'WAC balance must roll back.');
        $this->assertSame(
            $qtyBefore,
            (float) DB::table('products')->where('id', $this->productId)->value('quantity'),
            'Derived quantity must roll back.'
        );
        $this->assertSame(0, DB::table('inventory_cost_transactions')->where('source_type', 'opening_stock_line')->count());
    }

    /* =====================================================================
     | Update: reversal-and-replacement (D4)
     ===================================================================== */

    /** @test */
    public function update_supersedes_the_old_document_and_creates_a_new_one()
    {
        $service = app(OpeningStockService::class);

        $header = $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);

        $newHeader = $service->update((int) $header->id, [
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 20, 'cost_price' => 7],
            ],
        ]);

        // Old document kept as a superseded audit row; new document created.
        $this->assertSame('out', DB::table('inventory_movement_headers')->where('id', $header->id)->value('direction'));
        $this->assertStringContainsString('[SUPERSEDED', (string) DB::table('inventory_movement_headers')->where('id', $header->id)->value('notes'));
        $this->assertNotSame((int) $header->id, (int) $newHeader->id);
        $this->assertSame('in', $newHeader->direction);

        // New document carries the replacement line.
        $lines = DB::table('inventory_movement_lines')->where('stock_movement_id', $newHeader->id)->get();
        $this->assertCount(1, $lines);
        $this->assertSame(20.0, (float) $lines->first()->quantity);
        $this->assertEqualsWithDelta(7.0, (float) $lines->first()->cost_price, 0.000001);

        // WAC: original +10@5, reversal -10@5, new +20@7 => 20 @ 7.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->first();
        $this->assertSame(20.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(7.0, (float) $balance->average_cost, 0.000001);
        $this->assertEqualsWithDelta(140.0, (float) $balance->inventory_value, 0.000001);

        $reversals = DB::table('inventory_cost_transactions')
            ->where('source_type', 'opening_stock_reversal')
            ->count();
        $this->assertSame(1, $reversals, 'The original ICT must be reversed, not deleted.');
        $this->assertNotNull(
            DB::table('inventory_cost_transactions')->where('source_type', 'opening_stock_reversal')->value('reversal_of_id'),
            'Reversal must reference the original transaction.'
        );

        $this->assertSame(20.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function update_fails_cleanly_when_it_would_create_a_duplicate_elsewhere()
    {
        $service = app(OpeningStockService::class);
        $suffix = uniqid();

        $warehouseB = Warehouses::query()->insertGetId([
            'warehouse_code' => 'OSL-WHD-'.$suffix,
            'name' => 'OSL Warehouse D',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headerA = $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);
        $service->create([
            'warehouse_id' => $warehouseB,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 4, 'cost_price' => 8],
            ],
        ]);

        // Moving the first record's product to warehouse B would collide.
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->update((int) $headerA->id, [
            'warehouse_id' => $warehouseB,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);
    }

    /** @test */
    public function reversed_records_cannot_be_edited_again()
    {
        $service = app(OpeningStockService::class);

        $header = $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);

        $service->delete((int) $header->id);

        $this->expectException(\RuntimeException::class);
        $service->update((int) $header->id, [
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 3, 'cost_price' => 2],
            ],
        ]);

        // The failed edit must not have produced a replacement document.
        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')
                ->where('type', 'opening')->where('direction', 'in')->count(),
            'No active opening document may exist after a failed edit of a reversed record.'
        );
    }

    /* =====================================================================
     | Delete: exact reversal, history preserved (D4)
     ===================================================================== */

    /** @test */
    public function delete_reverses_cost_and_quantity_but_keeps_the_audit_row()
    {
        $service = app(OpeningStockService::class);

        $header = $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);

        $service->delete((int) $header->id);

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->first();
        $this->assertSame(0.0, (float) $balance->quantity);
        $this->assertSame(0.0, (float) $balance->inventory_value);

        $this->assertSame(0.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        $this->assertSame(
            'out',
            DB::table('inventory_movement_headers')->where('id', $header->id)->value('direction'),
            'The header must remain as a reversed audit row, not be deleted.'
        );
        $this->assertGreaterThan(0, DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->count());
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'opening_stock_reversal')->count());

        // And the product can be re-opened afterwards (the record is inactive).
        $newHeader = $service->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 6, 'cost_price' => 5],
            ],
        ]);
        $this->assertNotNull($newHeader->id);
    }

    /** @test */
    public function legacy_lines_without_cost_transactions_reverse_quantity_only()
    {
        // Simulate pre-Phase 3 data: opening header + line, NO ICT.
        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'reference_type' => 'opening',
            'voucher_num' => 'OS-LEGACY-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $this->warehouseId,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $headerId,
            'product_id' => $this->productId,
            'unit_id' => $this->baseUnitId,
            'quantity' => 8,
            'cost_price' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('products')->where('id', $this->productId)->increment('quantity', 8);

        app(OpeningStockService::class)->delete($headerId);

        $this->assertSame(0.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
        $this->assertSame('out', DB::table('inventory_movement_headers')->where('id', $headerId)->value('direction'));
        $this->assertSame(0, DB::table('inventory_cost_transactions')->where('source_type', 'opening_stock_reversal')->count(), 'No ICT existed, so none is reversed.');
    }

    /* =====================================================================
     | WAC integration after opening
     ===================================================================== */

    /** @test */
    public function downstream_flows_cost_against_the_seeded_wac()
    {
        app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->baseUnitId, 'quantity' => 10, 'cost_price' => 5],
            ],
        ]);

        // GRN at a different cost blends the average (perpetual WAC).
        app(WeightedAverageCostService::class)->applyInbound(
            $this->productId,
            $this->warehouseId,
            '10',
            '15',
            'osl_blend_test',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(20.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(10.0, (float) $balance->average_cost, 0.000001, '(10x5 + 10x15)/20 = 10');
    }
}
