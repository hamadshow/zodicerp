<?php

namespace Tests\Feature;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\OpeningStockService;
use App\Services\Inventory\StockAdjustmentService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 4 — Stock Adjustment lifecycle (D2).
 *
 * Positive adjustments apply inbound at the entered unit cost; negative
 * adjustments consume at the current WAC; approval writes per-direction
 * movements + derived quantity + a GL entry valued from the applied cost
 * transactions; approval is idempotent; cancelling an approved adjustment
 * reverses the WAC, quantity, and journal exactly via WAC::reverse().
 */
class StockAdjustmentLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $productId;

    protected int $unitId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'SAL Co',
            'company_code' => 'SAL',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('company')->insertOrIgnore([
            'id' => 2,
            'company_name' => 'Other Co',
            'company_code' => 'OTH',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'sal_'.$suffix,
            'fullname' => 'Adjustment Tester',
            'email' => 'sal_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'SAL-BR-'.$suffix,
            'branch_name' => 'SAL Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'SAL-WH-'.$suffix,
            'name' => 'SAL Warehouse',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'SAL Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'SAL-PRD-'.$suffix,
            'name' => 'SAL Product',
            'slug' => 'sal-product-'.$suffix,
            'sku' => 'SAL-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 10,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

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

    /* =====================================================================
     | Creation + approval (D2)
     ===================================================================== */

    /** @test */
    public function draft_creation_writes_no_ledger_effects()
    {
        $adjustment = app(StockAdjustmentService::class)->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'found',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 5, 'unit_cost' => 3],
            ],
        ]);

        $this->assertSame('draft', $adjustment->status);
        $this->assertSame(0, DB::table('inventory_movement_headers')->where('reference_id', $adjustment->id)->where('reference_type', 'stock_adjustment')->count());
        $this->assertSame(0, DB::table('inventory_cost_transactions')->where('source_type', 'stock_adjustment_line')->count());
        $this->assertSame(0.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function positive_adjustment_applies_inbound_at_entered_cost_through_wac()
    {
        $service = app(StockAdjustmentService::class);

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'found',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 5, 'unit_cost' => 3],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $adjustment->id)
            ->first();
        $this->assertNotNull($header);
        $this->assertSame('in', $header->direction);
        $this->assertSame('adjustment', $header->type);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(5.0, (float) $line->quantity);
        $this->assertEqualsWithDelta(3.0, (float) $line->cost_price, 0.000001);

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertNotNull($balance, 'D2: positive adjustments must seed WAC.');
        $this->assertSame(5.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(15.0, (float) $balance->inventory_value, 0.000001);
        $this->assertEqualsWithDelta(3.0, (float) $balance->average_cost, 0.000001);

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'stock_adjustment_line')
            ->first();
        $this->assertSame(5.0, (float) $ict->quantity_delta);
        $this->assertSame((int) $header->id, (int) $ict->movement_header_id);

        $this->assertSame(5.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function negative_adjustment_consumes_at_current_wac_and_rejects_insufficient_stock()
    {
        $service = app(StockAdjustmentService::class);

        // Seed 10 @ 4 via opening stock, then write off 3 => cost at 4.
        $this->seedOpening(10, '4');

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'damage',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -3, 'unit_cost' => 0],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $adjustment->id)
            ->first();
        $this->assertSame('out', $header->direction);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertEqualsWithDelta(4.0, (float) $line->cost_price, 0.000001, 'Outbound must cost at the current WAC.');

        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(7.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(28.0, (float) $balance->inventory_value, 0.000001);
        $this->assertEqualsWithDelta(4.0, (float) $balance->average_cost, 0.000001);

        $this->assertSame(7.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // Insufficient stock must fail the whole approval.
        $badAdjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'damage',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -99, 'unit_cost' => 0],
            ],
        ]);

        $headersBefore = DB::table('inventory_movement_headers')->count();
        try {
            $service->approveAdjustment((int) $badAdjustment->id);
            $this->fail('Insufficient stock must reject the approval.');
        } catch (\RuntimeException) {
            // expected
        }

        $this->assertSame(
            $headersBefore,
            DB::table('inventory_movement_headers')->count(),
            'Failed approval must roll back completely.'
        );
        $this->assertSame(
            7.0,
            (float) DB::table('products')->where('id', $this->productId)->value('quantity'),
            'Derived quantity must roll back.'
        );
    }

    /** @test */
    public function mixed_adjustment_gets_per_direction_headers_and_blended_quantity()
    {
        $service = app(StockAdjustmentService::class);
        $this->seedOpening(10, '5');

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'count',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 4, 'unit_cost' => 8],
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -2, 'unit_cost' => 0],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);

        $headers = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $adjustment->id)
            ->get();
        $this->assertCount(2, $headers);
        $this->assertEqualsCanonicalizing(['in', 'out'], $headers->pluck('direction')->all());

        // Within a mixed adjustment, positives apply BEFORE negatives, so the
        // write-off prices at the post-inbound WAC: 10@5 + 4@8 = 14 @ 5.857142,
        // then -2 @ 5.857142 => 12 units, value 82 - 11.714285 = 70.285715.
        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(12.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(70.285715, (float) $balance->inventory_value, 0.001);

        $this->assertSame(12.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function approval_is_idempotent_and_journal_valuation_uses_applied_costs()
    {
        $service = app(StockAdjustmentService::class);

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'theft',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -4, 'unit_cost' => 999],
            ],
        ]);
        $this->seedOpening(10, '6');

        $service->approveAdjustment((int) $adjustment->id);
        $service->approveAdjustment((int) $adjustment->id); // second call = no-op

        $this->assertSame(
            1,
            DB::table('inventory_movement_headers')->where('reference_type', 'stock_adjustment')->where('reference_id', $adjustment->id)->count(),
            'Repeated approval must not duplicate movements.'
        );
        $this->assertSame(
            1,
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_adjustment_line')->count(),
            'Repeated approval must not duplicate cost transactions.'
        );

        // The GL entry must value the write-off at the APPLIED WAC (4 x 6 = 24),
        // NOT the raw document arithmetic (-4 x 999).
        $entry = DB::table('journal_entries')
            ->where('entry_type', 'StockAdjustment')
            ->where('reference', $adjustment->adjustment_number)
            ->first();
        $this->assertNotNull($entry, 'Adjustment approval must post a journal.');
        $this->assertEqualsWithDelta(24.0, (float) $entry->total_amount, 0.01, 'Journal must use the applied WAC value.');
    }

    /* =====================================================================
     | Cancellation / reversal
     ===================================================================== */

    /** @test */
    public function cancelling_an_approved_adjustment_reverses_wac_quantity_and_journal()
    {
        $service = app(StockAdjustmentService::class);
        $this->seedOpening(10, '5');

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'found',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 5, 'unit_cost' => 7],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);

        $this->assertSame(15.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        $service->cancelAdjustment((int) $adjustment->id);

        // WAC back to exactly the opening state.
        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(10.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(50.0, (float) $balance->inventory_value, 0.000001);
        $this->assertEqualsWithDelta(5.0, (float) $balance->average_cost, 0.000001);

        $this->assertSame(10.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // Reversal movement exists; nothing deleted.
        $this->assertSame(
            1,
            DB::table('inventory_movement_headers')->where('reference_type', 'stock_adjustment_reversal')->where('reference_id', $adjustment->id)->count()
        );
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'stock_adjustment_reversal')->count());
        $this->assertNotNull(
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_adjustment_reversal')->value('reversal_of_id')
        );
        $this->assertSame('cancelled', DB::table('stock_adjustments')->where('id', $adjustment->id)->value('status'));

        // GL: original entry preserved, a reversal entry created.
        $this->assertGreaterThan(
            0,
            DB::table('journal_entries')->where('reference', 'like', $adjustment->adjustment_number.'%')->count()
        );
    }

    /** @test */
    public function cancelling_consumed_stock_is_refused_and_rolls_back()
    {
        $service = app(StockAdjustmentService::class);
        $this->seedOpening(5, '4');

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'found',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 5, 'unit_cost' => 6],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id); // 10 @ avg 5

        // Consume all 10 through the WAC engine.
        app(\App\Services\Inventory\WeightedAverageCostService::class)->applyOutbound(
            $this->productId,
            $this->warehouseId,
            '10',
            'lifecycle_consume_test',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        $statusBefore = DB::table('stock_adjustments')->where('id', $adjustment->id)->value('status');
        try {
            $service->cancelAdjustment((int) $adjustment->id);
            $this->fail('Cancelling consumed stock must be refused.');
        } catch (\RuntimeException) {
            // expected
        }

        $this->assertSame(
            $statusBefore,
            DB::table('stock_adjustments')->where('id', $adjustment->id)->value('status'),
            'Refused cancellation must not change status.'
        );
        $this->assertSame(
            0,
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_adjustment_reversal')->count(),
            'Refused cancellation must not write reversal ICTs.'
        );
    }

    /* =====================================================================
     | Validation, isolation, decimals, unit conversion
     ===================================================================== */

    /** @test */
    public function duplicate_approval_rejected_after_cancellation_flow()
    {
        $service = app(StockAdjustmentService::class);

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'other',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 2, 'unit_cost' => 1],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);
        $service->cancelAdjustment((int) $adjustment->id);

        $this->expectException(\RuntimeException::class);
        $service->approveAdjustment((int) $adjustment->id);
    }

    /** @test */
    public function invalid_warehouse_or_product_is_rejected()
    {
        $service = app(StockAdjustmentService::class);
        $suffix = uniqid();

        $foreignBranch = DB::table('branches')->insertGetId([
            'branch_code' => 'SAL-FB-'.$suffix,
            'branch_name' => 'Foreign Branch',
            'company_id' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $foreignWarehouse = Warehouses::query()->insertGetId([
            'warehouse_code' => 'SAL-FW-'.$suffix,
            'name' => 'Foreign Warehouse',
            'branch_id' => $foreignBranch,
            'company_id' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->createAdjustment([
            'warehouse_id' => $foreignWarehouse,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'other',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 2, 'unit_cost' => 1],
            ],
        ]);
    }

    /** @test */
    public function decimal_and_child_unit_quantities_convert_correctly()
    {
        $suffix = uniqid();
        $dozenUnitId = ItemUnit::query()->insertGetId([
            'name' => 'SAL Dozen '.$suffix,
            'unit_type' => 2,
            'base_unit' => $this->unitId,
            'conversion_factor' => 12,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(StockAdjustmentService::class);
        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'found',
            'items' => [
                // 0.5 dozen = 6 base units; 24/dozen / 12 = 2 per base unit
                ['product_id' => $this->productId, 'unit_id' => $dozenUnitId, 'adjustment_quantity' => 0.5, 'unit_cost' => 24],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);

        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertEqualsWithDelta(6.0, (float) $balance->quantity, 0.000001);
        // 24 per dozen / 12 = 2 per base unit; 6 base x 2 = 12 value.
        $this->assertEqualsWithDelta(12.0, (float) $balance->inventory_value, 0.000001);
        $this->assertEqualsWithDelta(2.0, (float) $balance->average_cost, 0.000001);

        $this->assertEqualsWithDelta(6.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'), 0.000001);
    }

    /** @test */
    public function cross_company_adjustment_is_refused_end_to_end()
    {
        [$userA, $userB] = $this->users();
        $service = app(StockAdjustmentService::class);

        $suffix = uniqid();
        $foreignBranch = DB::table('branches')->insertGetId([
            'branch_code' => 'SAL-XB-'.$suffix,
            'branch_name' => 'X Branch',
            'company_id' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $foreignWarehouse = Warehouses::query()->insertGetId([
            'warehouse_code' => 'SAL-XW-'.$suffix,
            'name' => 'X Warehouse',
            'branch_id' => $foreignBranch,
            'company_id' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Company B user: a draft referencing a Company A product is refused
        // at creation time (boundary is at the draft, not just at approval).
        $this->actingAs($userB);
        try {
            $service->createAdjustment([
                'warehouse_id' => $foreignWarehouse,
                'adjustment_date' => now()->toDateString(),
                'reason' => 'found',
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 3, 'unit_cost' => 2],
                ],
            ]);
            $this->fail('Cross-company draft creation must be refused.');
        } catch (\Illuminate\Validation\ValidationException) {
            // expected
        }

        // And a Company A draft must be invisible/approvable to Company B
        // (404 semantics via ModelNotFoundException).
        $this->actingAs($userA);
        $aAdjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'found',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 3, 'unit_cost' => 2],
            ],
        ]);

        $this->actingAs($userB);
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        $service->approveAdjustment((int) $aAdjustment->id);
    }

    /* =====================================================================
     | Helpers
     ===================================================================== */

    /** @return array{0: User, 1: User} */
    protected function users(): array
    {
        $mk = function (int $companyId): User {
            $suffix = uniqid();

            return User::create([
                'username' => 'salx_'.$suffix,
                'fullname' => 'X Tester',
                'email' => 'salx_'.$suffix.'@zodicerp-test.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'active',
                'company_id' => $companyId,
            ]);
        };

        return [$mk($this->companyId), $mk(2)];
    }

    /**
     * Seed opening stock through the REAL Phase 3 engine so the WAC layer
     * starts from an authentic state.
     */
    protected function seedOpening(float $quantity, string $unitCost, ?int $warehouseId = null): object
    {
        return app(OpeningStockService::class)->create([
            'warehouse_id' => $warehouseId ?? $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => $quantity, 'cost_price' => (float) $unitCost],
            ],
        ]);
    }
}
