<?php

namespace Tests\Feature;

use App\Models\Client_Sales\Customer;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\ProductPriceResolver;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Inventory -> Price Lists administration screen.
 *
 * Verifies the screen maintains the existing price_lists / price_list_items
 * architecture and that the data it writes is what ProductPriceResolver reads.
 * No pricing resolution logic lives in the controller under test.
 */
class PriceListManagementTest extends TestCase
{
    use DatabaseTransactions;

    public function test_index_renders_the_price_list_screen_with_list_props(): void
    {
        $this->actingAs($this->admin());

        $this->get(route('admin.inventory.price-lists.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backend/03-Inventory/PriceLists')
                ->where('mode', 'list')
                ->has('priceLists.data')
                ->has('priceLists.current_page')
                ->has('currencies')
                ->has('priceTypes')
                ->has('roundingMethods')
                ->has('stats.total')
                ->has('nextCode')
                ->has('filters.per_page')
            );
    }

    public function test_price_list_can_be_created_from_the_screen_and_opens_its_items(): void
    {
        $this->guardWritablePriceListTables();
        $this->actingAs($this->admin());
        $currencyId = (int) Currency::query()->value('id');

        $response = $this->post(route('admin.inventory.price-lists.store'), [
            'name_ar' => 'قائمة اختبار',
            'name_en' => 'Test Price List',
            'currency_id' => $currencyId,
            'price_type' => 'wholesale',
            'valid_from' => '2026-01-01',
            'valid_to' => null,
            'is_active' => true,
        ]);

        $created = DB::table('price_lists')->orderByDesc('id')->first();

        $this->assertNotNull($created);
        $this->assertSame('Test Price List', $created->name_en);
        $this->assertSame('wholesale', $created->price_type);
        $this->assertNotEmpty($created->code);
        $this->assertNull($created->deleted_at);
        $response->assertRedirect(route('admin.inventory.price-lists.index'));

        $this->get(route('admin.inventory.price-lists.show', ['price_list' => $created->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backend/03-Inventory/PriceLists')
                ->where('mode', 'detail')
                ->where('priceList.id', $created->id)
                ->has('items.data')
                ->has('units')
                ->has('tierProducts')
                ->has('stats.tiers')
            );
    }

    public function test_create_and_edit_render_dedicated_pages_with_the_header_form_props(): void
    {
        $this->actingAs($this->admin());

        $this->get(route('admin.inventory.price-lists.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backend/03-Inventory/PriceLists')
                ->where('mode', 'create')
                ->has('currencies')
                ->has('priceTypes')
                ->has('roundingMethods')
                ->has('nextCode')
            );

        $this->guardWritablePriceListTables();
        $priceListId = $this->fixturePriceList();

        $this->get(route('admin.inventory.price-lists.edit', ['price_list' => $priceListId]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backend/03-Inventory/PriceLists')
                ->where('mode', 'edit')
                ->where('priceList.id', $priceListId)
                ->has('currencies')
                ->has('priceTypes')
                ->has('roundingMethods')
            );
    }

    public function test_price_list_header_can_be_updated_and_returns_to_the_list(): void
    {
        $this->guardWritablePriceListTables();
        $priceListId = $this->fixturePriceList();

        $this->actingAs($this->admin());

        $response = $this->put(route('admin.inventory.price-lists.update', ['price_list' => $priceListId]), [
            'code' => 'TPL-UPDATED',
            'name_ar' => 'قائمة محدثة',
            'name_en' => 'Updated Price List',
            'currency_id' => (int) Currency::query()->value('id'),
            'price_type' => 'contract',
            'valid_from' => '2026-02-01',
            'valid_to' => '2026-12-31',
            'rounding_method' => 'up',
            'rounding_factor' => 0.5,
            'is_default' => false,
            'is_active' => false,
            'notes' => 'Updated from the dedicated edit page',
        ]);

        $response->assertRedirect(route('admin.inventory.price-lists.index'));

        $updated = DB::table('price_lists')->where('id', $priceListId)->first();

        $this->assertSame('TPL-UPDATED', $updated->code);
        $this->assertSame('Updated Price List', $updated->name_en);
        $this->assertSame('contract', $updated->price_type);
        $this->assertSame(0, (int) $updated->is_active);
        $this->assertSame('Updated from the dedicated edit page', $updated->notes);
    }

    public function test_server_validation_errors_are_returned_for_invalid_price_lists(): void
    {
        $this->actingAs($this->admin());

        $this->from(route('admin.inventory.price-lists.index'))
            ->post(route('admin.inventory.price-lists.store'), [
                'name_ar' => '',
                'currency_id' => null,
                'price_type' => 'not-a-type',
                'valid_from' => '',
            ])
            ->assertRedirect(route('admin.inventory.price-lists.index'))
            ->assertSessionHasErrors(['name_ar', 'currency_id', 'price_type', 'valid_from']);
    }

    public function test_quantity_tier_items_are_managed_and_generated_final_price_comes_from_the_database(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $priceListId = $this->fixturePriceList();

        $this->actingAs($this->admin());

        $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => 1,
            'unit_price' => 100,
            'discount_percentage' => 0,
            'discount_amount' => 0,
        ])->assertRedirect();

        $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => 10,
            'unit_price' => 100,
            'discount_percentage' => 10,
            'discount_amount' => 0,
        ])->assertRedirect();

        $rows = DB::table('price_list_items')
            ->where('price_list_id', $priceListId)
            ->orderBy('min_quantity')
            ->get();

        $this->assertCount(2, $rows);
        $this->assertSame('1.0000', number_format((float) $rows[0]->min_quantity, 4, '.', ''));
        $this->assertSame('100.0000', number_format((float) $rows[0]->final_price, 4, '.', ''));
        // 100 - (100 * 10 / 100) - 0
        $this->assertSame('90.0000', number_format((float) $rows[1]->final_price, 4, '.', ''));

        $itemId = (int) $rows[1]->id;

        // Duplicate tier (same product + unit + min_quantity) is rejected server-side.
        $this->from(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
                'product_id' => $productId,
                'unit_id' => $unitId,
                'min_quantity' => 10,
                'unit_price' => 50,
            ])
            ->assertRedirect(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->assertSessionHasErrors('min_quantity');

        $this->assertSame(2, DB::table('price_list_items')->where('price_list_id', $priceListId)->count());

        // Tier update
        $this->put(route('admin.inventory.price-lists.items.update', [
            'price_list' => $priceListId,
            'item' => $itemId,
        ]), [
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => 10,
            'unit_price' => 120,
            'discount_percentage' => 25,
            'discount_amount' => 5,
        ])->assertRedirect();

        $updated = DB::table('price_list_items')->where('id', $itemId)->first();
        $this->assertSame('120.0000', number_format((float) $updated->unit_price, 4, '.', ''));
        // 120 - (120 * 25 / 100) - 5
        $this->assertSame('85.0000', number_format((float) $updated->final_price, 4, '.', ''));

        // Tier delete
        $this->delete(route('admin.inventory.price-lists.items.destroy', [
            'price_list' => $priceListId,
            'item' => $itemId,
        ]))->assertRedirect();

        $this->assertSame(1, DB::table('price_list_items')->where('price_list_id', $priceListId)->count());
    }

    public function test_items_listing_exposes_server_derived_validity_status_and_filters_by_it(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $priceListId = $this->fixturePriceList();

        $this->actingAs($this->admin());

        $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => 1,
            'unit_price' => 30,
            'effective_date' => now()->addMonth()->toDateString(),
        ])->assertRedirect();

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'item_status' => 'scheduled',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('mode', 'detail')
                ->where('filters.item_status', 'scheduled')
                ->where('items.data.0.status', 'scheduled')
                ->has('tierProducts', 1)
            );

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'item_status' => 'active',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('items.data', 0));
    }

    public function test_tier_ladder_is_returned_for_the_filtered_product(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $priceListId = $this->fixturePriceList();

        foreach ([1, 10, 50] as $index => $minQuantity) {
            DB::table('price_list_items')->insert([
                'id' => $this->nextId('price_list_items'),
                'price_list_id' => $priceListId,
                'product_id' => $productId,
                'unit_id' => $unitId,
                'min_quantity' => $minQuantity,
                'unit_price' => 100 - ($index * 10),
                'discount_percentage' => 0,
                'discount_amount' => 0,
            ]);
        }

        $this->actingAs($this->admin());

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'product_id' => $productId,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('tierLadder', 3)
                ->where('tierLadder.0.min_quantity', '1.0000')
                ->where('tierLadder.1.min_quantity', '10.0000')
                ->where('tierLadder.2.min_quantity', '50.0000')
                ->where('tierLadder.2.final_price', '80.0000')
                ->has('tierProducts', 1)
            );
    }

    public function test_price_list_maintained_here_is_the_data_the_existing_resolver_consumes(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $priceListId = $this->fixturePriceList();

        $customer = Customer::query()->firstOrFail();
        $originalPriceListId = $customer->price_list_id;
        DB::table('customers')->where('id', $customer->id)->update(['price_list_id' => $priceListId]);

        $this->actingAs($this->admin());

        $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => 10,
            'unit_price' => 75,
            'discount_percentage' => 0,
            'discount_amount' => 0,
        ])->assertRedirect();

        $customer->refresh();

        $resolved = app(ProductPriceResolver::class)->resolve([
            'product' => Products::query()->findOrFail($productId),
            'customer' => $customer,
            'unit_id' => $unitId,
            'quantity' => '12',
            'transaction_date' => now()->toDateString(),
        ]);

        $this->assertSame('customer_price_list', $resolved['source']);
        $this->assertSame('75.0000', $resolved['final_price']);

        DB::table('customers')->where('id', $customer->id)->update(['price_list_id' => $originalPriceListId]);
    }

    public function test_delete_is_blocked_when_a_sales_document_references_the_price_list(): void
    {
        $this->guardWritablePriceListTables();
        $priceListId = $this->fixturePriceList();

        $currencyId = (int) Currency::query()->value('id');
        $customerId = (int) Customer::query()->value('id');
        $warehouseId = (int) Warehouses::query()->value('id');

        DB::table('sales_orders')->insert([
            'order_number' => 'TEST-PL-'.uniqid(),
            'customer_id' => $customerId,
            'currency_id' => $currencyId,
            'order_date' => now()->toDateString(),
            'warehouse_id' => $warehouseId,
            'price_list_id' => $priceListId,
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin());

        $this->from(route('admin.inventory.price-lists.index'))
            ->delete(route('admin.inventory.price-lists.destroy', ['price_list' => $priceListId]))
            ->assertRedirect(route('admin.inventory.price-lists.index'))
            ->assertSessionHasErrors('price_list');

        $this->assertNull(DB::table('price_lists')->where('id', $priceListId)->value('deleted_at'));
    }

    public function test_unreferenced_price_list_can_be_deleted(): void
    {
        $this->guardWritablePriceListTables();
        $priceListId = $this->fixturePriceList();

        $this->actingAs($this->admin());

        $this->delete(route('admin.inventory.price-lists.destroy', ['price_list' => $priceListId]))
            ->assertRedirect();

        $this->assertNotNull(DB::table('price_lists')->where('id', $priceListId)->value('deleted_at'));
    }

    /* ------------------------------------------------------------------ */

    private function admin(): User
    {
        return User::query()
            ->whereIn('role', ['admin', 'superadmin', 'owner'])
            ->firstOrFail();
    }

    /**
     * The price_lists / price_list_items migrations are pending in this database
     * and the tables were created outside the migrations without AUTO_INCREMENT,
     * so no row can be inserted. Report that blocker instead of a fake failure.
     */
    private function guardWritablePriceListTables(): void
    {
        foreach (['price_lists', 'price_list_items'] as $table) {
            $extra = (string) DB::table('information_schema.columns')
                ->where('table_schema', DB::getDatabaseName())
                ->where('table_name', $table)
                ->where('column_name', 'id')
                ->selectRaw('EXTRA as extra')
                ->value('extra');

            if (stripos($extra, 'auto_increment') === false) {
                $this->markTestSkipped(
                    "BLOCKER: {$table}.id has no AUTO_INCREMENT (migration pending, table created outside migrations), "
                    .'so price list rows cannot be inserted. Run the pending migration or add AUTO_INCREMENT to the column.'
                );
            }
        }
    }

    private function fixturePriceList(): int
    {
        $id = $this->nextId('price_lists');

        DB::table('price_lists')->insert([
            'id' => $id,
            'code' => 'TPL-'.substr(uniqid(), -8),
            'name_ar' => 'قائمة اختبار',
            'name_en' => 'Fixture Price List',
            'currency_id' => (int) Currency::query()->value('id'),
            'valid_from' => '2026-01-01',
            'valid_to' => null,
            'is_default' => 0,
            'price_type' => 'retail',
            'rounding_method' => 'none',
            'rounding_factor' => 0.05,
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    /**
     * @return array{0:int,1:int} product id, unit id
     */
    private function fixtureProductAndUnit(): array
    {
        $unitId = $this->nextId('item_units');
        $productId = $this->nextId('products');

        DB::table('item_units')->insert([
            'id' => $unitId,
            'name' => 'Test PL Piece',
            'unit_type' => 1,
            'base_unit' => null,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('products')->insert([
            'id' => $productId,
            'product_code' => 'TEST-PL-'.$productId,
            'name' => 'Price List Test Product',
            'slug' => 'price-list-test-product-'.$productId,
            'status' => 'active',
            'sku' => 'SKU-PL-'.$productId,
            'unit_id' => $unitId,
            'price' => 100,
            'sale_price' => null,
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$productId, $unitId];
    }

    private function nextId(string $table): int
    {
        return ((int) DB::table($table)->max('id')) + 1;
    }
}
