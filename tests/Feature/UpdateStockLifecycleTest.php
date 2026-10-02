<?php

namespace Tests\Feature;

use App\Models\Accounting\JournalEntry;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\ProductService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 10 — the updateStock hole is closed (docs §11 rule 3).
 *
 * ProductService::updateStock() and the /api/products/{id}/update-stock
 * route used to write products.quantity raw. Every mutation now routes
 * through the WAC-routed stock adjustment engine: a stock_adjustments
 * document (reason: correction), a movement header + line, an inventory
 * cost transaction, the derived products.quantity delta, and the GL entry
 * where accounts are configured — draft + approval committed atomically.
 * There is no code path left that mutates stock outside the movement engine.
 *
 * Residue note: the testing database carries committed seed/residue rows
 * (warehouses, balances, adjustments from earlier eras), so every ledger
 * assertion is scoped to THIS test's fixture rows (product / item ids),
 * never to bare table counts.
 */
class UpdateStockLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $otherCompanyId = 2;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseAId;

    protected int $warehouseBId;

    protected int $unitId;

    protected int $productId;

    protected int $otherWarehouseId;

    protected int $otherUnitId;

    protected int $otherProductId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'US2 Co',
            'company_code' => 'US2',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('company')->insertOrIgnore([
            'id' => $this->otherCompanyId,
            'company_name' => 'US2 Other Co',
            'company_code' => 'US2O',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'us2_'.$suffix,
            'fullname' => 'UpdateStock Tester',
            'email' => 'us2_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'US2-BR-'.$suffix,
            'branch_name' => 'US2 Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseAId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'US2-WHA-'.$suffix,
            'name' => 'US2 Warehouse A',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->warehouseBId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'US2-WHB-'.$suffix,
            'name' => 'US2 Warehouse B',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'US2 Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Legacy-shaped stock product: raw quantity 5 (never stocked through
        // the engine), unit + cost present so the engine can route it.
        $this->productId = Products::query()->insertGetId([
            'product_code' => 'US2-PRD-'.$suffix,
            'name' => 'US2 Product',
            'slug' => 'us2-product-'.$suffix,
            'sku' => 'US2-SKU-'.$suffix,
            'quantity' => 5,
            'unit_id' => $this->unitId,
            'cost_per_item' => 10,
            'product_type' => 'simple',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Other company for isolation tests.
        $otherBranchId = DB::table('branches')->insertGetId([
            'branch_code' => 'US2O-BR-'.$suffix,
            'branch_name' => 'US2O Branch',
            'company_id' => $this->otherCompanyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->otherWarehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'US2O-WH-'.$suffix,
            'name' => 'US2O Warehouse',
            'branch_id' => $otherBranchId,
            'company_id' => $this->otherCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->otherUnitId = ItemUnit::query()->insertGetId([
            'name' => 'US2O Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->otherCompanyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->otherProductId = Products::query()->insertGetId([
            'product_code' => 'US2O-PRD-'.$suffix,
            'name' => 'US2O Product',
            'slug' => 'us2o-product-'.$suffix,
            'sku' => 'US2O-SKU-'.$suffix,
            'quantity' => 9,
            'unit_id' => $this->otherUnitId,
            'cost_per_item' => 5,
            'product_type' => 'simple',
            'company_id' => $this->otherCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // GL accounts so the adjustment journal path runs (same seeds as the
        // ratified StockAdjustmentLifecycleTest battery). insertOrIgnore: the
        // committed seed rows may already exist.
        foreach ([['11401', 'Inventory Asset', 1], ['69999', 'Inventory Adjustment', 2]] as [$code, $name, $type]) {
            DB::table('accounts')->insertOrIgnore([
                'AccCode' => $code,
                'AccName' => $name,
                'AccType' => $type,
                'AccFinal' => 1,
                'company_id' => $this->companyId,
            ]);
        }
    }

    /* -----------------------------------------------------------------
     | Residue-safe assertion helpers (scoped to THIS test's fixtures)
     ----------------------------------------------------------------- */

    /** The single adjustment item created for a fixture product (or null). */
    private function itemFor(int $productId): ?object
    {
        return DB::table('stock_adjustment_items')
            ->where('product_id', $productId)
            ->orderBy('id')
            ->first();
    }

    private function itemIdsFor(int $productId): array
    {
        return DB::table('stock_adjustment_items')
            ->where('product_id', $productId)
            ->pluck('id')
            ->all();
    }

    private function ictsFor(array $itemIds): array
    {
        if ($itemIds === []) {
            return [];
        }

        return DB::table('inventory_cost_transactions')
            ->where('source_type', 'stock_adjustment_line')
            ->whereIn('source_id', $itemIds)
            ->orderBy('id')
            ->get()
            ->all();
    }

    /* =====================================================================
     |  Engine routing (the §11 rule-3 contract)
     ===================================================================== */

    /** @test */
    public function set_operation_routes_through_the_adjustment_engine()
    {
        app(ProductService::class)->updateStock($this->productId, 123, 'set');

        // Derived quantity: 5 (raw legacy) + 118 (engine delta) = 123.
        $this->assertSame(123.0, (float) Products::find($this->productId)->quantity);

        // Exactly one approved adjustment document (reason: correction).
        $item = $this->itemFor($this->productId);
        $this->assertNotNull($item, 'updateStock() must create an adjustment document.');
        $adjustment = DB::table('stock_adjustments')->where('id', $item->adjustment_id)->first();
        $this->assertSame('approved', $adjustment->status);
        $this->assertSame('correction', $adjustment->reason);
        $this->assertSame($this->companyId, (int) $adjustment->company_id);
        $this->assertSame(118.0, (float) $item->adjustment_quantity);

        // Movement document: one inbound adjustment header + line, and the
        // header/ICT/balance all agree on the SAME company warehouse.
        $headers = DB::table('inventory_movement_headers')
            ->where('reference_id', $adjustment->id)
            ->where('reference_type', 'stock_adjustment')
            ->get();
        $this->assertCount(1, $headers);
        $this->assertSame('adjustment', $headers[0]->type);
        $this->assertSame('in', $headers[0]->direction);

        [$tx] = $this->ictsFor([$item->id]);
        $this->assertSame(118.0, (float) $tx->quantity_delta);
        $this->assertSame(10.0, (float) $tx->unit_cost, 'Inbound must value at the entered cost (products.cost_per_item).');
        $this->assertSame($this->companyId, (int) $tx->company_id);
        $this->assertSame((int) $headers[0]->warehouse_id, (int) $tx->warehouse_id, 'Movement header and cost ledger must agree on the warehouse.');

        $warehouseCompanyId = (int) DB::table('warehouses')->where('id', $tx->warehouse_id)->value('company_id');
        $this->assertSame($this->companyId, $warehouseCompanyId, 'Resolved warehouse must belong to the caller\'s company.');

        $lines = DB::table('inventory_movement_lines')->where('stock_movement_id', $headers[0]->id)->get();
        $this->assertCount(1, $lines);
        $this->assertSame($this->productId, (int) $lines[0]->product_id);
        $this->assertSame(118.0, (float) $lines[0]->quantity);

        // WAC balance reflects the applied movement.
        $this->assertDatabaseHas('inventory_cost_balances', [
            'company_id' => $this->companyId,
            'product_id' => $this->productId,
            'warehouse_id' => $tx->warehouse_id,
            'quantity' => 118,
            'inventory_value' => 1180,
        ]);

        // GL entry valued from the applied cost transactions.
        $entry = JournalEntry::where('entry_type', 'StockAdjustment')
            ->where('reference', $adjustment->adjustment_number)
            ->first();
        $this->assertNotNull($entry, 'Adjustment journal must exist when GL accounts are configured.');
        $this->assertSame(1180.0, (float) $entry->total_amount);
        $debits = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $entry->entry_code)->sum('debit');
        $credits = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $entry->entry_code)->sum('credit');
        $this->assertEqualsWithDelta(1180.0, $debits, 0.01);
        $this->assertEqualsWithDelta($debits, $credits, 0.01);
    }

    /** @test */
    public function add_operation_applies_inbound_at_entered_cost()
    {
        app(ProductService::class)->updateStock($this->productId, 20, 'add');

        $this->assertSame(25.0, (float) Products::find($this->productId)->quantity);

        $item = $this->itemFor($this->productId);
        $header = DB::table('inventory_movement_headers')
            ->where('reference_id', $item->adjustment_id)
            ->where('reference_type', 'stock_adjustment')
            ->first();
        $this->assertSame('in', $header->direction);

        [$tx] = $this->ictsFor([$item->id]);
        $this->assertSame(20.0, (float) $tx->quantity_delta);
        $this->assertSame(10.0, (float) $tx->unit_cost);
    }

    /** @test */
    public function subtract_operation_consumes_at_current_wac()
    {
        // Establish WAC first: set 100 from raw 5 → inbound delta 95 at cost 10.
        app(ProductService::class)->updateStock($this->productId, 100, 'set');
        $this->assertSame(100.0, (float) Products::find($this->productId)->quantity);

        // Subtract 40 → outbound at the current WAC (10), not cost_per_item guesswork.
        app(ProductService::class)->updateStock($this->productId, 40, 'subtract');

        $this->assertSame(60.0, (float) Products::find($this->productId)->quantity);

        $itemIds = $this->itemIdsFor($this->productId);
        $this->assertCount(2, $itemIds, 'Two updateStock calls → two adjustment items.');

        $outTx = collect($this->ictsFor($itemIds))->first(fn ($tx) => (float) $tx->quantity_delta < 0);
        $this->assertNotNull($outTx, 'Negative delta must produce an outbound cost transaction.');
        $this->assertSame(-40.0, (float) $outTx->quantity_delta);
        $this->assertSame(10.0, (float) $outTx->unit_cost, 'Outbound must consume at the current WAC.');

        $outHeader = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('direction', 'out')
            ->whereIn('reference_id', DB::table('stock_adjustment_items')->whereIn('id', $itemIds)->pluck('adjustment_id'))
            ->first();
        $this->assertNotNull($outHeader, 'Negative delta must produce an outbound movement document.');

        $this->assertDatabaseHas('inventory_cost_balances', [
            'company_id' => $this->companyId,
            'product_id' => $this->productId,
            'warehouse_id' => $outTx->warehouse_id,
            'quantity' => 55,
            'inventory_value' => 550,
        ]);
    }

    /** @test */
    public function subtract_beyond_available_stock_is_refused_with_nothing_persisted()
    {
        // Raw quantity 5, but the engine's WAC balance is 0: the ledger must refuse.
        try {
            app(ProductService::class)->updateStock($this->productId, 3, 'subtract');
            $this->fail('Engine must refuse a negative delta that would drive the WAC balance negative.');
        } catch (\RuntimeException) {
            // expected — WeightedAverageCostService::applyOutbound refusal
        }

        // Whole transaction rolled back: no draft adjustment, no movement, no ICT.
        $this->assertSame(5.0, (float) Products::find($this->productId)->quantity, 'Refused mutation must not touch products.quantity.');
        $this->assertSame([], $this->itemIdsFor($this->productId), 'Refused mutation must not leave a draft adjustment behind.');
        $this->assertSame([], $this->ictsFor($this->itemIdsFor($this->productId)));
    }

    /** @test */
    public function noop_set_emits_nothing()
    {
        app(ProductService::class)->updateStock($this->productId, 5, 'set');

        $this->assertSame(5.0, (float) Products::find($this->productId)->quantity);
        $this->assertSame([], $this->itemIdsFor($this->productId));
        $this->assertSame([], $this->ictsFor($this->itemIdsFor($this->productId)));
    }

    /** @test */
    public function service_products_are_ignored()
    {
        $suffix = uniqid();
        $serviceId = Products::query()->insertGetId([
            'product_code' => 'US2-SVC-'.$suffix,
            'name' => 'US2 Service',
            'slug' => 'us2-service-'.$suffix,
            'sku' => 'US2-SVC-SKU-'.$suffix,
            'quantity' => 7,
            'unit_id' => $this->unitId,
            'cost_per_item' => 10,
            'product_type' => 'service',
            'with_storehouse_management' => 0,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(ProductService::class)->updateStock($serviceId, 99, 'set');

        $this->assertSame(7.0, (float) Products::find($serviceId)->quantity, 'updateStock() must never touch a service.');
        $this->assertSame([], $this->itemIdsFor($serviceId));
    }

    /** @test */
    public function cross_company_product_is_refused()
    {
        try {
            app(ProductService::class)->updateStock($this->otherProductId, 99, 'set');
            $this->fail('Cross-company updateStock must be refused.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            // expected
        }

        $this->assertSame(9.0, (float) Products::find($this->otherProductId)->quantity);
        $this->assertSame([], $this->itemIdsFor($this->otherProductId));
    }

    /** @test */
    public function warehouse_resolution_prefers_the_largest_wac_balance()
    {
        // Seed balances on both warehouses directly through the WAC ledger
        // (no movement documents needed for the resolution test itself).
        $wac = app(WeightedAverageCostService::class);
        $today = now()->toDateString();
        $wac->applyInbound($this->productId, $this->warehouseAId, '10', '8', 'warehouse_resolution_seed', 1, $today);
        $wac->applyInbound($this->productId, $this->warehouseBId, '50', '5', 'warehouse_resolution_seed', 2, $today);

        app(ProductService::class)->updateStock($this->productId, 70, 'add');

        // Derived quantity: raw 5 + delta 70 (the WAC seeds do not touch products.quantity).
        $this->assertSame(75.0, (float) Products::find($this->productId)->quantity);

        // Largest balance (50 @ WH B) wins: the delta must land there.
        [$tx] = $this->ictsFor($this->itemIdsFor($this->productId));
        $this->assertSame($this->warehouseBId, (int) $tx->warehouse_id);
        $this->assertSame(70.0, (float) $tx->quantity_delta);

        // Both warehouse balances intact: A untouched, B grown by the delta.
        $this->assertDatabaseHas('inventory_cost_balances', [
            'company_id' => $this->companyId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseAId,
            'quantity' => 10,
        ]);
        $this->assertDatabaseHas('inventory_cost_balances', [
            'company_id' => $this->companyId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseBId,
            'quantity' => 120,
        ]);
    }

    /* =====================================================================
     |  HTTP endpoint (thin wrapper over the same service contract)
     ===================================================================== */

    /** @test */
    public function http_update_stock_endpoint_routes_through_the_engine()
    {
        $response = $this->actingAs(User::find($this->userId))
            ->postJson("/api/products/{$this->productId}/update-stock", [
                'stock_quantity' => 77,
                'operation' => 'set',
            ]);

        $response->assertOk();
        $this->assertEqualsWithDelta(77.0, (float) $response->json('data.quantity'), 0.0001);
        $this->assertSame(77.0, (float) Products::find($this->productId)->quantity);

        $item = $this->itemFor($this->productId);
        $this->assertNotNull($item, 'HTTP update-stock must produce an adjustment document.');
        $adjustment = DB::table('stock_adjustments')->where('id', $item->adjustment_id)->first();
        $this->assertSame('approved', $adjustment->status);
        $this->assertSame(1, DB::table('inventory_movement_headers')
            ->where('reference_id', $adjustment->id)
            ->where('reference_type', 'stock_adjustment')
            ->count());
        $this->assertCount(1, $this->ictsFor([$item->id]));
    }

    /** @test */
    public function http_update_stock_endpoint_rejects_invalid_operation()
    {
        $this->actingAs(User::find($this->userId))
            ->postJson("/api/products/{$this->productId}/update-stock", [
                'stock_quantity' => 77,
                'operation' => 'multiply',
            ])
            ->assertStatus(422);

        $this->assertSame([], $this->itemIdsFor($this->productId));
        $this->assertSame(5.0, (float) Products::find($this->productId)->quantity);
    }
}
