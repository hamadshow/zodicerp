<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\CompanyContext;
use App\Services\Inventory\StockAdjustmentService;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\ProductService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 1 — Company isolation for the Inventory module.
 *
 * Contract under test (docs/inventory/inventory-source-of-truth.md, invariant 6):
 * every company-owned inventory read/write must be scoped to CompanyContext.
 *
 * Company A (id 1) must never read, update, delete, move stock against, or
 * price WAC for Company B (id 2) resources.
 */
class InventoryCompanyIsolationTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyA = 1;

    protected int $companyB = 2;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        $this->ensureCompanyExists($this->companyA);
        $this->ensureCompanyExists($this->companyB);
    }

    /* ---------------------------------------------------------------------
     | Company A cannot read Company B inventory
     --------------------------------------------------------------------- */

    /** @test */
    public function company_a_cannot_read_company_b_opening_stock_via_index()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'voucher_num' => 'OS-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'company_id' => $this->companyB,
            'created_by' => 1,
            'notes' => 'CompanyIsolationTest',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($userA)->get(
            route('admin.inventory.opening-stock.index', $this->routeParams())
        );

        $response->assertOk();

        $renderedIds = $this->inertiaProps($response, 'openingStocks')['data'];

        $this->assertNotContains($headerId, $renderedIds);
    }

    /** @test */
    public function company_a_cannot_view_company_b_opening_stock_record()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'voucher_num' => 'OS-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'company_id' => $this->companyB,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($userA)
            ->get(route('admin.inventory.opening-stock.show', array_merge(
                $this->routeParams(),
                ['openingStock' => $headerId]
            )))
            ->assertNotFound();
    }

    /** @test */
    public function company_a_cannot_read_company_b_stock_card()
    {
        [$userA, ] = $this->users();
        $productB = $this->product($this->companyB);

        $this->actingAs($userA)
            ->get(route('admin.inventory.stock-card', array_merge($this->routeParams(), [
                'product_id' => $productB->id,
            ])))
            ->assertNotFound();
    }

    /** @test */
    public function company_a_cannot_read_company_b_warehouse_stock_report()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $this->actingAs($userA)
            ->get(route('admin.inventory.warehouse-stock', array_merge($this->routeParams(), [
                'warehouse_id' => $warehouseB->id,
            ])))
            ->assertNotFound();
    }

    /** @test */
    public function company_a_cannot_view_company_b_warehouse()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $this->actingAs($userA)
            ->get(route('admin.inventory.warehouses.show', array_merge(
                $this->routeParams(),
                ['warehouse' => $warehouseB->id]
            )))
            ->assertNotFound();
    }

    /** @test */
    public function company_a_option_lists_exclude_company_b_master_data()
    {
        [$userA, ] = $this->users();
        $productA = $this->product($this->companyA);
        $warehouseA = $this->warehouse($this->companyA);
        $productB = $this->product($this->companyB);
        $warehouseB = $this->warehouse($this->companyB);

        $response = $this->actingAs($userA)->get(
            route('admin.inventory.opening-stock.index', $this->routeParams())
        );

        $response->assertOk();

        $props = $this->inertiaProps($response);
        $productIds = collect($props['products'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);
        $warehouseIds = collect($props['warehouses'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);

        $this->assertNotEmpty($productIds);
        $this->assertNotEmpty($warehouseIds);

        $foreignProducts = Products::where('company_id', $this->companyB)->pluck('id');
        $foreignWarehouses = Warehouses::where('company_id', $this->companyB)->pluck('id');

        $this->assertNotEmpty($productIds, 'Company A must see its own products.');
        $this->assertNotEmpty($warehouseIds, 'Company A must see its own warehouses.');
        $this->assertTrue($productIds->contains((int) $productA->id));
        $this->assertTrue($warehouseIds->contains((int) $warehouseA->id));
        $this->assertEquals(
            0,
            $productIds->intersect($foreignProducts)->count(),
            'Product picker leaked another company products.'
        );
        $this->assertEquals(
            0,
            $warehouseIds->intersect($foreignWarehouses)->count(),
            'Warehouse picker leaked another company warehouses.'
        );
    }

    /* ---------------------------------------------------------------------
     | Company A cannot update / delete Company B inventory
     --------------------------------------------------------------------- */

    /**
     * Phase 3: update IS routed now (reversal-and-replacement), but it must
     * refuse cross-company targets and never write replacement lines.
     *
     * @test
     */
    public function company_a_cannot_update_company_b_opening_stock()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);
        $productB = $this->product($this->companyB);
        $unitB = $this->unit($this->companyB);

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'voucher_num' => 'OS-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'company_id' => $this->companyB,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $lineCountBefore = DB::table('inventory_movement_lines')->where('stock_movement_id', $headerId)->count();

        $this->actingAs($userA)
            ->put(route('admin.inventory.opening-stock.update', array_merge(
                $this->routeParams(),
                ['openingStock' => $headerId]
            )), [
                'movement_date' => now()->toDateString(),
                'warehouse_id' => $warehouseB->id,
                'items' => [
                    ['product_id' => $productB->id, 'unit_id' => $unitB->id, 'quantity' => 7, 'cost_price' => 2],
                ],
            ])
            ->assertNotFound();

        $this->assertSame(
            $lineCountBefore,
            DB::table('inventory_movement_lines')->where('stock_movement_id', $headerId)->count(),
            'Cross-company opening stock update must not touch lines.'
        );
    }

    /** @test */
    public function company_a_cannot_delete_company_b_opening_stock()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'voucher_num' => 'OS-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'company_id' => $this->companyB,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($userA)
            ->delete(route('admin.inventory.opening-stock.destroy', array_merge(
                $this->routeParams(),
                ['openingStock' => $headerId]
            )))
            ->assertNotFound();

        $this->assertDatabaseHas('inventory_movement_headers', ['id' => $headerId]);
    }

    /** @test */
    public function company_a_cannot_edit_company_b_transfer()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);
        $productB = $this->product($this->companyB);
        $unitB = $this->unit($this->companyB);

        $transferId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'reference_type' => 'stock_transfer',
            'voucher_num' => 'TR-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'from_warehouse_id' => $warehouseB->id,
            'to_warehouse_id' => $warehouseB->id,
            'company_id' => $this->companyB,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($userA)
            ->put(route('admin.inventory.stock-transfers.update', array_merge(
                $this->routeParams(),
                ['stock_transfer' => $transferId]
            )), [
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $warehouseB->id,
                'to_warehouse_id' => $warehouseB->id,
                'items' => [
                    ['product_id' => $productB->id, 'unit_id' => $unitB->id, 'quantity' => 3],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasErrors();

        $this->assertDatabaseMissing('inventory_movement_lines', [
            'stock_movement_id' => $transferId,
        ]);
    }

    /** @test */
    public function company_a_cannot_delete_company_b_transfer()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $transferId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'reference_type' => 'stock_transfer',
            'voucher_num' => 'TR-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'from_warehouse_id' => $warehouseB->id,
            'to_warehouse_id' => $warehouseB->id,
            'company_id' => $this->companyB,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($userA)
            ->delete(route('admin.inventory.stock-transfers.destroy', array_merge(
                $this->routeParams(),
                ['stock_transfer' => $transferId]
            )))
            ->assertRedirect()
            ->assertSessionHasErrors();

        $this->assertDatabaseHas('inventory_movement_headers', ['id' => $transferId]);
    }

    /** @test */
    public function company_a_cannot_approve_or_cancel_company_b_stock_adjustment()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $adjustmentId = DB::table('stock_adjustments')->insertGetId([
            'adjustment_number' => 'ADJ-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'correction',
            'status' => 'draft',
            'company_id' => $this->companyB,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($userA)
            ->post(route('admin.inventory.stock-adjustments.approve', array_merge(
                $this->routeParams(),
                ['id' => $adjustmentId]
            )))
            ->assertSessionHas('error');

        $this->actingAs($userA)
            ->post(route('admin.inventory.stock-adjustments.cancel', array_merge(
                $this->routeParams(),
                ['id' => $adjustmentId]
            )))
            ->assertSessionHas('error');

        $this->assertSame(
            'draft',
            DB::table('stock_adjustments')->where('id', $adjustmentId)->value('status'),
            'Cross-company adjustment must remain untouched.'
        );
        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')->where('reference_id', $adjustmentId)->where('reference_type', 'stock_adjustment')->count(),
            'Cross-company approval must not create movements.'
        );
    }

    /** @test */
    public function company_a_cannot_delete_company_b_stock_adjustment()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $adjustmentId = DB::table('stock_adjustments')->insertGetId([
            'adjustment_number' => 'ADJ-ISO-'.strtoupper(substr(uniqid(), -6)),
            'warehouse_id' => $warehouseB->id,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'correction',
            'status' => 'draft',
            'company_id' => $this->companyB,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($userA)
            ->delete(route('admin.inventory.stock-adjustments.destroy', array_merge(
                $this->routeParams(),
                ['id' => $adjustmentId]
            )))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('stock_adjustments', ['id' => $adjustmentId]);
    }

    /** @test */
    public function company_a_cannot_update_or_delete_company_b_warehouse()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);

        $this->actingAs($userA)
            ->put(route('admin.inventory.warehouses.update', array_merge(
                $this->routeParams(),
                ['warehouse' => $warehouseB->id]
            )), [
                'name' => 'Hijacked Name',
                'branch_id' => $warehouseB->branch_id,
                'status' => 'active',
            ])
            ->assertNotFound();

        $this->actingAs($userA)
            ->delete(route('admin.inventory.warehouses.destroy', array_merge(
                $this->routeParams(),
                ['warehouse' => $warehouseB->id]
            )))
            ->assertNotFound();

        $this->assertDatabaseHas('warehouses', [
            'id' => $warehouseB->id,
            'name' => $warehouseB->name,
        ]);
    }

    /* -----------------------------------------------------------------
     | Cross-company stock movements and WAC
     ----------------------------------------------------------------- */

    /** @test */
    public function company_a_cannot_create_movement_against_company_b_warehouse()
    {
        [$userA, ] = $this->users();
        $warehouseB1 = $this->warehouse($this->companyB);
        $warehouseB2 = $this->warehouse($this->companyB);
        $productB = $this->product($this->companyB);
        $unitB = $this->unit($this->companyB);

        $this->actingAs($userA)
            ->post(route('admin.inventory.stock-transfers.store', $this->routeParams()), [
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $warehouseB1->id,
                'to_warehouse_id' => $warehouseB2->id,
                'items' => [
                    ['product_id' => $productB->id, 'unit_id' => $unitB->id, 'quantity' => 5],
                ],
            ])
            ->assertNotFound();

        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')
                ->where('company_id', $this->companyA)
                ->whereIn('warehouse_id', [$warehouseB1->id, $warehouseB2->id])
                ->count(),
            'A cross-company transfer attempt must not create a Company A movement.'
        );
    }

    /** @test */
    public function wac_service_refuses_cross_company_product_or_warehouse()
    {
        [, $userB] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);
        $productA = $this->product($this->companyA);

        $this->actingAs($userB);

        $this->expectException(\RuntimeException::class);
        app(WeightedAverageCostService::class)->applyInbound(
            $productA->id,
            $warehouseB->id,
            '10',
            '5',
            'inventory_isolation_test',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );
    }

    /** @test */
    public function wac_balances_stay_scoped_per_company_for_same_warehouse()
    {
        [$userA, $userB] = $this->users();
        $warehouseA = $this->warehouse($this->companyA);
        $productA = $this->product($this->companyA);

        // Company B session: product A belongs to company A, must be refused.
        $this->actingAs($userB);
        $refused = false;
        try {
            app(WeightedAverageCostService::class)->applyInbound(
                $productA->id,
                $warehouseA->id,
                '10',
                '5',
                'inventory_isolation_test_b',
                (int) (microtime(true) * 1000000),
                now()->toDateString(),
            );
        } catch (\RuntimeException) {
            $refused = true;
        }
        $this->assertTrue($refused, 'Company B WAC inbound against Company A product must be refused.');

        // Company A session: same product/warehouse is allowed.
        $this->actingAs($userA);
        app(WeightedAverageCostService::class)->applyInbound(
            $productA->id,
            $warehouseA->id,
            '10',
            '5',
            'inventory_isolation_test_a',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        $this->assertDatabaseHas('inventory_cost_balances', [
            'company_id' => $this->companyA,
            'product_id' => $productA->id,
            'warehouse_id' => $warehouseA->id,
            'quantity' => 10,
        ]);
        $this->assertSame(
            0,
            DB::table('inventory_cost_balances')->where('company_id', $this->companyB)->count()
        );
    }

    /* -----------------------------------------------------------------
     | API stock endpoint + Product CRUD ownership
     ----------------------------------------------------------------- */

    /** @test */
    public function api_stock_update_refuses_other_company_product()
    {
        [, $userB] = $this->users();
        $productA = $this->product($this->companyA);

        $this->actingAs($userB);

        $refused = false;
        try {
            app(ProductService::class)->updateStock($productA->id, 99, 'set');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            $refused = true;
        }

        $this->assertTrue($refused, 'Cross-company API stock mutation must be refused.');
        $this->assertSame(
            (float) $productA->quantity,
            (float) Products::find($productA->id)->quantity,
            'products.quantity must be untouched by the refused mutation.'
        );
    }

    /** @test */
    public function api_stock_update_applies_to_own_company_product()
    {
        [$userA, ] = $this->users();
        $productA = $this->product($this->companyA);

        $this->actingAs($userA);
        $this->warehouse($this->companyA); // Phase 10: engine-routed stock resolves an active company warehouse
        app(ProductService::class)->updateStock($productA->id, 123, 'set');

        $this->assertSame(123.0, (float) Products::find($productA->id)->quantity);
    }

    /** @test */
    public function product_crud_show_refuses_other_company_product()
    {
        [$userA, ] = $this->users();
        $productB = $this->product($this->companyB);

        $this->actingAs($userA)
            ->get(route('admin.inventory.products.show', array_merge(
                $this->routeParams(),
                ['product' => $productB->id]
            )))
            ->assertNotFound();
    }

    /* -----------------------------------------------------------------
     | Opening stock creation with foreign references
     ----------------------------------------------------------------- */

    /** @test */
    public function opening_stock_store_rejects_foreign_warehouse()
    {
        [$userA, ] = $this->users();
        $warehouseB = $this->warehouse($this->companyB);
        $productA = $this->product($this->companyA);
        $unitA = $this->unit($this->companyA);

        $before = DB::table('inventory_movement_headers')->where('type', 'opening')->count();

        $this->actingAs($userA)
            ->post(route('admin.inventory.opening-stock.store', $this->routeParams()), [
                'movement_date' => now()->toDateString(),
                'warehouse_id' => $warehouseB->id,
                'items' => [
                    ['product_id' => $productA->id, 'unit_id' => $unitA->id, 'quantity' => 4],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasErrors();

        $this->assertSame($before, DB::table('inventory_movement_headers')->where('type', 'opening')->count());
    }

    /** @test */
    public function opening_stock_store_rejects_foreign_product()
    {
        [$userA, ] = $this->users();
        $warehouseA = $this->warehouse($this->companyA);
        $productB = $this->product($this->companyB);
        $unitA = $this->unit($this->companyA);

        $before = DB::table('inventory_movement_headers')->where('type', 'opening')->count();

        $this->actingAs($userA)
            ->post(route('admin.inventory.opening-stock.store', $this->routeParams()), [
                'movement_date' => now()->toDateString(),
                'warehouse_id' => $warehouseA->id,
                'items' => [
                    ['product_id' => $productB->id, 'unit_id' => $unitA->id, 'quantity' => 4],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasErrors();

        $this->assertSame($before, DB::table('inventory_movement_headers')->where('type', 'opening')->count());
    }

    /* -----------------------------------------------------------------
     | Helpers
     ----------------------------------------------------------------- */

    protected function ensureCompanyExists(int $id): void
    {
        DB::table('company')->insertOrIgnore([
            'id' => $id,
            'company_name' => 'Isolation Company '.$id,
            'company_code' => 'ISO-'.$id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @return array{0: User, 1: User} [userOfCompanyA, userOfCompanyB] */
    protected function users(): array
    {
        $mk = function (int $companyId): User {
            $suffix = uniqid();

            return User::create([
                'username' => 'iso_'.$suffix,
                'fullname' => 'Iso Tester '.$suffix,
                'email' => 'iso_'.$suffix.'@zodicerp-test.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'active',
                'company_id' => $companyId,
            ]);
        };

        return [$mk($this->companyA), $mk($this->companyB)];
    }

    protected function warehouse(int $companyId): Warehouses
    {
        $suffix = substr(uniqid(), -6);
        $branch = Branch::query()->create([
            'branch_name' => 'Iso Branch '.$companyId.'-'.$suffix,
            'company_id' => $companyId,
        ]);

        return Warehouses::query()->create([
            'name' => 'Iso WH '.$companyId.'-'.$suffix,
            'warehouse_code' => 'ISO'.$companyId.'-'.$suffix,
            'status' => 'active',
            'company_id' => $companyId,
            'branch_id' => $branch->id,
        ]);
    }

    protected function product(int $companyId): Products
    {
        $suffix = uniqid();

        return Products::query()->create([
            'product_code' => 'ISO-'.$suffix,
            'name' => 'Iso Product '.$suffix,
            'slug' => 'iso-product-'.$suffix,
            'sku' => 'ISO-SKU-'.$suffix,
            'quantity' => 5,
            'unit_id' => $this->unit($companyId)->id, // Phase 10: engine-routed stock writes require a unit
            'cost_per_item' => 10,
            'company_id' => $companyId,
            'status' => 'active',
        ]);
    }

    protected function unit(int $companyId): ItemUnit
    {
        $suffix = uniqid();

        return ItemUnit::query()->create([
            'name' => 'Iso Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $companyId,
        ]);
    }

    /**
     * Extract Inertia page props from a full-page (non-partial) response.
     * Works regardless of asset-version handling because the props are
     * embedded in the rendered root view.
     */
    protected function inertiaProps($response, ?string $key = null): array
    {
        $content = $response->getOriginalContent();
        $page = is_object($content) && method_exists($content, 'getData')
            ? ($content->getData()['page'] ?? null)
            : null;

        if (is_string($page)) {
            $page = json_decode($page, true);
        }

        $props = $page['props'] ?? [];

        return $key === null ? $props : (array) ($props[$key] ?? []);
    }

    /** Locale route parameters required by the admin route group. */
    protected function routeParams(): array
    {
        return ['country' => 'sa', 'lang' => 'ar'];
    }
}
