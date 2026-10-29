<?php

namespace Tests\Feature;

use App\Models\Client_Sales\Customer;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Exports\PriceListItemsExport;
use App\Services\ProductPriceResolver;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
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

    public function test_price_list_detail_renders_one_unified_product_list_without_legacy_price_columns(): void
    {
        $this->guardWritablePriceListTables();
        [$productId] = $this->fixtureProductAndUnit();
        $priceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        $this->get(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('mode', 'detail')
                ->has('products.data')
                ->missing('items')
                ->where('products.data.0.total_pricing_records_count', 0)
                ->missing('products.data.0.pricing_items')
                ->where('products.data', fn ($rows) => collect($rows)->every(
                    fn ($row) => ! array_key_exists('price', $row)
                        && ! array_key_exists('sale_price', $row)
                ))
            );
    }

    public function test_product_pricing_records_endpoint_returns_all_records_for_the_selected_product(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $subunitId = $this->fixtureSubunitFor($unitId);
        $priceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        foreach ([10, 20] as $quantity) {
            $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
                'product_id' => $productId,
                'unit_id' => $subunitId,
                'min_quantity' => $quantity,
                'unit_price' => 100,
                'effective_date' => $quantity === 10 ? '2026-01-01' : '2027-01-01',
            ])->assertRedirect();
        }

        $response = $this->getJson(route('admin.inventory.price-lists.products.items', [
            'price_list' => $priceListId,
            'product' => $productId,
            'unit_id' => $subunitId,
            'item_status' => 'active',
        ]))->assertOk();

        $this->assertCount(2, $response->json('items'));
        $this->assertSame(
            [10.0, 20.0],
            array_map('floatval', array_column($response->json('items'), 'min_quantity'))
        );
        $this->assertArrayHasKey('status', $response->json('items.0'));
        $this->assertArrayHasKey('unit', $response->json('items.0'));
    }

    public function test_product_pricing_records_endpoint_rejects_products_outside_the_sellable_catalog(): void
    {
        $this->guardWritablePriceListTables();
        [$productId] = $this->fixtureProductAndUnit();
        $priceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        $this->getJson(route('admin.inventory.price-lists.products.items', [
            'price_list' => $priceListId,
            'product' => $productId + 99999,
        ]))->assertNotFound();
    }

    public function test_price_list_import_creates_only_valid_records_for_the_selected_list(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $baseUnitId] = $this->fixtureProductAndUnit();
        $unitId = $this->fixtureSubunitFor($baseUnitId);
        $priceListId = $this->fixturePriceList();
        $otherPriceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        $this->postJson(route('admin.inventory.price-lists.items.import', [
            'price_list' => $priceListId,
        ]), [
            'rows' => [[
                'product_id' => $productId,
                'unit_id' => $unitId,
                'min_quantity' => 5,
                'unit_price' => 125.50,
                'discount_percentage' => 5,
                'discount_amount' => 1,
                'effective_date' => '2026-01-01',
                'expiry_date' => null,
                'notes' => 'Imported tier',
            ]],
        ])
            ->assertOk()
            ->assertJsonPath('imported', 1);

        $this->assertSame(1, DB::table('price_list_items')->where('price_list_id', $priceListId)->count());
        $this->assertSame(0, DB::table('price_list_items')->where('price_list_id', $otherPriceListId)->count());
        $this->assertSame(
            '125.5000',
            number_format((float) DB::table('price_list_items')->where('price_list_id', $priceListId)->value('unit_price'), 4, '.', '')
        );
    }

    public function test_price_list_import_rejects_duplicate_rows_without_partial_writes(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $baseUnitId] = $this->fixtureProductAndUnit();
        $unitId = $this->fixtureSubunitFor($baseUnitId);
        $priceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        $row = [
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => 3,
            'unit_price' => 50,
        ];

        $this->postJson(route('admin.inventory.price-lists.items.import', [
            'price_list' => $priceListId,
        ]), ['rows' => [$row, $row]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rows');

        $this->assertSame(0, DB::table('price_list_items')->where('price_list_id', $priceListId)->count());

        $this->post(route('admin.inventory.price-lists.items.store', [
            'price_list' => $priceListId,
        ]), $row)->assertRedirect();

        $this->postJson(route('admin.inventory.price-lists.items.import', [
            'price_list' => $priceListId,
        ]), ['rows' => [$row]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rows');

        $this->assertSame(1, DB::table('price_list_items')->where('price_list_id', $priceListId)->count());
    }

    public function test_price_list_import_rejects_invalid_products_units_and_numeric_values_atomically(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $baseUnitId] = $this->fixtureProductAndUnit();
        $unitId = $this->fixtureSubunitFor($baseUnitId);
        $priceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        $response = $this->postJson(route('admin.inventory.price-lists.items.import', [
            'price_list' => $priceListId,
        ]), [
            'rows' => [
                [
                    'product_id' => $productId + 99999,
                    'unit_id' => $unitId,
                    'min_quantity' => 1,
                    'unit_price' => 25,
                ],
                [
                    'product_id' => $productId,
                    'unit_id' => $unitId + 99999,
                    'min_quantity' => 1,
                    'unit_price' => 25,
                ],
                [
                    'product_id' => $productId,
                    'unit_id' => $unitId,
                    'min_quantity' => 1,
                    'unit_price' => -1,
                ],
            ],
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('rows');
        $this->assertSame(0, DB::table('price_list_items')->where('price_list_id', $priceListId)->count());
    }

    public function test_price_list_export_is_limited_to_the_selected_price_list_and_includes_all_records(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $baseUnitId] = $this->fixtureProductAndUnit();
        $unitId = $this->fixtureSubunitFor($baseUnitId);
        $priceListId = $this->fixturePriceList();
        $otherPriceListId = $this->fixturePriceList();
        $this->actingAs($this->admin());

        foreach ([$priceListId, $otherPriceListId] as $listId) {
            foreach ([1, 10] as $quantity) {
                $this->post(route('admin.inventory.price-lists.items.store', [
                    'price_list' => $listId,
                ]), [
                    'product_id' => $productId,
                    'unit_id' => $unitId,
                    'min_quantity' => $quantity,
                    'unit_price' => 100 + $quantity,
                ])->assertRedirect();
            }
        }

        Excel::fake();

        $this->get(route('admin.inventory.price-lists.items.export', [
            'price_list' => $priceListId,
        ]))->assertOk();

        Excel::assertDownloaded("price-list-{$priceListId}.xlsx", function (PriceListItemsExport $export) use ($productId, $priceListId) {
            $rows = $export->query()->get();

            return $rows->count() === 2
                && $rows->every(fn ($row) => (int) $row->price_list_id === $priceListId)
                && $rows->pluck('product_id')->every(fn ($id) => (int) $id === $productId);
        });
    }

    public function test_product_lookup_returns_actual_variations_with_composite_names(): void
    {
        [$parentId, $unitId] = $this->fixtureProductAndUnit();
        $subunitId = $this->fixtureSubunitFor($unitId);

        DB::table('products')->where('id', $parentId)->update([
            'name' => 'Shirt Adidas',
            'sku' => 'SHIRT-PARENT',
            'product_type' => Products::PRODUCT_TYPE_VARIATION,
            'parent_id' => null,
            'is_variation' => 0,
        ]);

        $simpleId = $this->nextId('products');
        DB::table('products')->insert([
            'id' => $simpleId,
            'product_code' => 'TEST-PL-SIMPLE-'.$simpleId,
            'name' => 'Shirt Basic',
            'slug' => 'shirt-basic-'.$simpleId,
            'status' => 'active',
            'sku' => 'SHIRT-BASIC',
            'unit_id' => $unitId,
            'company_id' => 1,
            'product_type' => Products::PRODUCT_TYPE_SIMPLE,
            'is_variation' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $attributeIds = [];
        foreach (['Color' => 1, 'Size' => 2, 'Brand' => 3] as $title => $order) {
            $attributeIds[$title] = $this->nextId('item_attributes');
            DB::table('item_attributes')->insert([
                'id' => $attributeIds[$title],
                'title' => $title,
                'slug' => strtolower($title),
                'order' => $order,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $detailIds = [];
        foreach ([
            'Black' => $attributeIds['Color'],
            'White' => $attributeIds['Color'],
            'XL' => $attributeIds['Size'],
            'L' => $attributeIds['Size'],
            'Adidas' => $attributeIds['Brand'],
        ] as $title => $attributeId) {
            $detailId = $this->nextId('item_attributes_details');
            $detailIds[$title] = $detailId;
            DB::table('item_attributes_details')->insert([
                'id' => $detailId,
                'attribute_set_id' => $attributeId,
                'title' => $title,
                'slug' => strtolower($title),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $variantIds = [];
        foreach ([
            ['Black', 'XL'],
            ['White', 'L'],
        ] as $index => [$color, $size]) {
            $childId = $this->nextId('products');
            $variantIds[] = $childId;
            DB::table('products')->insert([
                'id' => $childId,
                'product_code' => 'TEST-PL-VARIANT-'.$childId,
                'name' => 'Child SKU '.$index,
                'slug' => 'child-sku-'.$childId,
                'status' => 'active',
                'sku' => 'SHIRT-'.$index,
                'unit_id' => $unitId,
                'company_id' => 1,
                'product_type' => Products::PRODUCT_TYPE_SIMPLE,
                'parent_id' => $parentId,
                'is_variation' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $variationId = $this->nextId('product_variations');
            DB::table('product_variations')->insert([
                'id' => $variationId,
                'product_id' => $childId,
                'configurable_product_id' => $parentId,
                'is_default' => $index === 0,
            ]);

            foreach ([
                $attributeIds['Color'] => $detailIds[$color],
                $attributeIds['Size'] => $detailIds[$size],
                $attributeIds['Brand'] => $detailIds['Adidas'],
            ] as $attributeId => $detailId) {
                DB::table('product_variation_items')->insert([
                    'id' => $this->nextId('product_variation_items'),
                    'variation_id' => $variationId,
                    'attribute_id' => $attributeId,
                    'attribute_value' => (string) $detailId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->actingAs($this->admin());

        $lookupResponse = $this->getJson(route('admin.inventory.price-lists.search-products', [
            'query' => 'Shirt',
        ]))->assertOk();

        $options = collect($lookupResponse->json('products'))->keyBy('id');
        $this->assertCount(3, $options);
        $this->assertArrayNotHasKey($parentId, $options->all());
        $this->assertSame('Shirt Adidas, Black, XL', $options[$variantIds[0]]['display_name']);
        $this->assertSame('Shirt Adidas, White, L', $options[$variantIds[1]]['display_name']);
        $this->assertSame('Shirt Basic', $options[$simpleId]['display_name']);
        $this->assertSame('Child SKU 0', $options[$variantIds[0]]['name']);
        $this->assertSame([$subunitId], array_column($options[$simpleId]['unit_options'], 'id'));
        $this->assertSame([$subunitId], array_column($options[$variantIds[0]]['unit_options'], 'id'));

        $whiteOptions = $this->getJson(route('admin.inventory.price-lists.search-products', [
            'query' => 'White',
        ]))->assertOk()->json('products');
        $this->assertSame([$variantIds[1]], array_column($whiteOptions, 'id'));

        $this->guardWritablePriceListTables();
        $priceListId = $this->fixturePriceList();
        foreach ($variantIds as $variantId) {
            $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
                'product_id' => $variantId,
                'unit_id' => $subunitId,
                'min_quantity' => 1,
                'unit_price' => 75,
                'discount_percentage' => 0,
                'discount_amount' => 0,
            ])->assertRedirect();
        }

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'product_id' => $variantIds[0],
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.data', fn ($rows) => collect($rows)->contains(
                    fn ($row) => (int) $row['id'] === $variantIds[0]
                        && $row['display_name'] === 'Shirt Adidas, Black, XL'
                        && (int) $row['unit_options'][0]['id'] === $subunitId
                        && $row['total_pricing_records_count'] === 1
                ))
            );
        $this->getJson(route('admin.inventory.price-lists.products.items', [
            'price_list' => $priceListId,
            'product' => $variantIds[0],
        ]))->assertOk()->assertJsonPath('items.0.unit_id', $subunitId);

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'White',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.data', fn ($rows) => collect($rows)->contains(
                    fn ($row) => (int) $row['id'] === $variantIds[1]
                        && $row['display_name'] === 'Shirt Adidas, White, L'
                        && $row['total_pricing_records_count'] === 1
                ))
            );

        $this->assertSame('Child SKU 0', DB::table('products')->where('id', $variantIds[0])->value('name'));
        $this->assertSame($variantIds, DB::table('price_list_items')
            ->where('price_list_id', $priceListId)
            ->orderBy('product_id')
            ->pluck('product_id')
            ->map(fn ($productId) => (int) $productId)
            ->all());

        foreach ([$simpleId, ...$variantIds] as $sellableId) {
            $this->get(route('admin.inventory.price-lists.show', [
                'price_list' => $priceListId,
                'product_id' => $sellableId,
            ]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                ->has('products.data', 1)
                ->where('products.total', 1)
                ->where('products.data.0.id', $sellableId));
        }

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'product_id' => $parentId,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('products.total', 0));
    }

    public function test_product_unit_families_are_returned_for_catalog_and_reject_foreign_units(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $baseUnitId] = $this->fixtureProductAndUnit();
        $baseSubunitId = $this->fixtureSubunitFor($baseUnitId);
        $extraSubunitId = $this->nextId('item_units');
        $extraSubunitIdTwo = $extraSubunitId + 1;
        $secondBaseUnitId = $extraSubunitId + 2;
        $secondSubunitId = $extraSubunitId + 3;
        $secondSubunitIdTwo = $extraSubunitId + 4;
        $emptyBaseUnitId = $extraSubunitId + 5;
        $otherProductId = $this->nextId('products');
        $unitlessProductId = $otherProductId + 1;

        DB::table('products')->where('id', $productId)->update([
            'name' => 'Unit Family Primary Product',
        ]);

        DB::table('item_units')->insert([
            [
                'id' => $extraSubunitId,
                'name' => 'Test PL Dozen',
                'unit_type' => 2,
                'base_unit' => $baseUnitId,
                'conversion_factor' => 24,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $extraSubunitIdTwo,
                'name' => 'Test PL Pallet',
                'unit_type' => 2,
                'base_unit' => $baseUnitId,
                'conversion_factor' => 48,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $secondBaseUnitId,
                'name' => 'Test PL Pair',
                'unit_type' => 1,
                'base_unit' => null,
                'conversion_factor' => 1,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $secondSubunitId,
                'name' => 'Test PL Pack',
                'unit_type' => 2,
                'base_unit' => $secondBaseUnitId,
                'conversion_factor' => 6,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $secondSubunitIdTwo,
                'name' => 'Test PL Case',
                'unit_type' => 2,
                'base_unit' => $secondBaseUnitId,
                'conversion_factor' => 12,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $emptyBaseUnitId,
                'name' => 'Test PL Single',
                'unit_type' => 1,
                'base_unit' => null,
                'conversion_factor' => 1,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        foreach ([
            [
                'id' => $otherProductId,
                'product_code' => 'TEST-PL-OTHER-UNIT-'.$otherProductId,
                'name' => 'Unit Family Other Product',
                'slug' => 'unit-family-other-'.$otherProductId,
                'sku' => 'UNIT-OTHER-'.$otherProductId,
                'unit_id' => $secondBaseUnitId,
            ],
            [
                'id' => $unitlessProductId,
                'product_code' => 'TEST-PL-UNITLESS-'.$unitlessProductId,
                'name' => 'Unit Family Unitless Product',
                'slug' => 'unit-family-unitless-'.$unitlessProductId,
                'sku' => 'UNIT-EMPTY-'.$unitlessProductId,
                'unit_id' => $emptyBaseUnitId,
            ],
        ] as $product) {
            DB::table('products')->insert(array_merge($product, [
                'status' => 'active',
                'company_id' => 1,
                'product_type' => Products::PRODUCT_TYPE_SIMPLE,
                'is_variation' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $this->actingAs($this->admin());
        $lookup = $this->getJson(route('admin.inventory.price-lists.search-products', [
            'query' => 'Unit Family',
        ]))->assertOk()->json('products');
        $lookupById = collect($lookup)->keyBy('id');

        $this->assertSame(
            [$baseSubunitId, $extraSubunitId, $extraSubunitIdTwo],
            array_column($lookupById[$productId]['unit_options'], 'id')
        );
        $this->assertNotContains($baseUnitId, array_column($lookupById[$productId]['unit_options'], 'id'));
        $this->assertSame(
            [$secondSubunitIdTwo, $secondSubunitId],
            array_column($lookupById[$otherProductId]['unit_options'], 'id')
        );
        $this->assertSame([], $lookupById[$unitlessProductId]['unit_options']);

        $priceListId = $this->fixturePriceList();
        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'Unit Family',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.data', fn ($rows) => collect($rows)
                    ->keyBy('id')
                    ->get($productId)['unit_options'][0]['id'] === $baseSubunitId
                    && count(collect($rows)->keyBy('id')->get($productId)['unit_options']) === 3
                    && collect($rows)->keyBy('id')->get($productId)['unit_options'][0]['name'] === 'Test PL Box'));

        $this->from(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
                'product_id' => $productId,
                'unit_id' => $baseUnitId,
                'min_quantity' => 1,
                'unit_price' => 10,
            ])
            ->assertRedirect(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->assertSessionHasErrors('unit_id');

        $this->from(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
                'product_id' => $productId,
                'unit_id' => $secondSubunitId,
                'min_quantity' => 6,
                'unit_price' => 10,
            ])
            ->assertRedirect(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->assertSessionHasErrors('unit_id');

        $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
            'product_id' => $productId,
            'unit_id' => $baseSubunitId,
            'min_quantity' => 12,
            'unit_price' => 10,
            'discount_percentage' => 10,
            'effective_date' => '2026-01-01',
            'expiry_date' => '2026-12-31',
        ])->assertRedirect();

        $savedItemId = (int) DB::table('price_list_items')
            ->where('price_list_id', $priceListId)
            ->where('product_id', $productId)
            ->value('id');
        $this->assertSame($baseSubunitId, (int) DB::table('price_list_items')->where('id', $savedItemId)->value('unit_id'));

        $this->put(route('admin.inventory.price-lists.items.update', [
            'price_list' => $priceListId,
            'item' => $savedItemId,
        ]), [
            'product_id' => $productId,
            'unit_id' => $baseSubunitId,
            'min_quantity' => 12,
            'unit_price' => 10,
            'discount_percentage' => 10,
            'effective_date' => '2026-01-01',
            'expiry_date' => '2026-12-31',
        ])->assertRedirect();

        $this->assertSame($baseSubunitId, (int) DB::table('price_list_items')->where('id', $savedItemId)->value('unit_id'));
        $this->assertSame('9.0000', DB::table('price_list_items')->where('id', $savedItemId)->value('final_price'));
    }

    public function test_catalog_price_status_is_scoped_to_the_current_list_and_sellable_product(): void
    {
        $this->guardWritablePriceListTables();
        [$pricedProductId, $unitId] = $this->fixtureProductAndUnit();
        $subunitId = $this->fixtureSubunitFor($unitId);
        DB::table('products')->where('id', $pricedProductId)->update([
            'name' => 'CatalogStatusTest priced',
        ]);
        $otherListProductId = $this->nextId('products');
        $serviceProductId = $otherListProductId + 1;
        $foreignProductId = $serviceProductId + 1;
        $inactiveProductId = $foreignProductId + 1;

        foreach ([
            [
                'id' => $otherListProductId,
                'product_code' => 'TEST-PL-OTHER-'.$otherListProductId,
                'name' => 'CatalogStatusTest other',
                'slug' => 'other-list-only-'.$otherListProductId,
                'sku' => 'OTHER-LIST-'.$otherListProductId,
                'product_type' => Products::PRODUCT_TYPE_SIMPLE,
                'company_id' => 1,
            ],
            [
                'id' => $serviceProductId,
                'product_code' => 'TEST-PL-SERVICE-'.$serviceProductId,
                'name' => 'CatalogStatusTest service',
                'slug' => 'unpriced-service-'.$serviceProductId,
                'sku' => 'SERVICE-'.$serviceProductId,
                'product_type' => Products::PRODUCT_TYPE_SERVICE,
                'company_id' => 1,
            ],
            [
                'id' => $foreignProductId,
                'product_code' => 'TEST-PL-FOREIGN-'.$foreignProductId,
                'name' => 'Unscoped product',
                'slug' => 'unscoped-product-'.$foreignProductId,
                'sku' => 'FOREIGN-'.$foreignProductId,
                'product_type' => Products::PRODUCT_TYPE_SIMPLE,
                'company_id' => null,
            ],
            [
                'id' => $inactiveProductId,
                'product_code' => 'TEST-PL-INACTIVE-'.$inactiveProductId,
                'name' => 'CatalogStatusTest inactive',
                'slug' => 'inactive-product-'.$inactiveProductId,
                'sku' => 'INACTIVE-'.$inactiveProductId,
                'product_type' => Products::PRODUCT_TYPE_SIMPLE,
                'company_id' => 1,
                'status' => 'inactive',
            ],
        ] as $product) {
            DB::table('products')->insert(array_merge($product, [
                'status' => $product['status'] ?? 'active',
                'unit_id' => $unitId,
                'is_variation' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $priceListId = $this->fixturePriceList();
        $otherPriceListId = $this->fixturePriceList();
        DB::table('price_list_items')->insert([
            'id' => $this->nextId('price_list_items'),
            'price_list_id' => $otherPriceListId,
            'product_id' => $otherListProductId,
            'unit_id' => $subunitId,
            'min_quantity' => 1,
            'unit_price' => 45,
            'discount_percentage' => 0,
            'discount_amount' => 0,
        ]);

        $this->actingAs($this->admin());
        $this->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
            'product_id' => $pricedProductId,
            'unit_id' => $subunitId,
            'min_quantity' => 1,
            'unit_price' => 30,
        ])->assertRedirect();

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'CatalogStatusTest',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.total', 3)
                ->where('products.data', fn ($rows) => collect($rows)->keyBy('id')->get($pricedProductId)['price_status'] === 'with_price'
                    && collect($rows)->keyBy('id')->get($otherListProductId)['price_status'] === 'without_price')
                ->where('products.data', fn ($rows) => collect($rows)->keyBy('id')->get($pricedProductId)['total_pricing_records_count'] === 1));

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'price_status' => 'without_price',
            'per_page' => 5,
            'page' => 2,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.current_page', 2)
                ->where('products.total', fn ($total) => $total >= 5)
                ->where('products.data', fn ($rows) => count($rows) === 5
                    && collect($rows)->pluck('id')->unique()->count() === 5));

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'CatalogStatusTest',
            'price_status' => 'with_price',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.price_status', 'with_price')
                ->where('products.total', 1)
                ->where('products.data.0.id', $pricedProductId)
                ->where('products.data.0.total_pricing_records_count', 1));

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'CatalogStatusTest',
            'price_status' => 'without_price',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.price_status', 'without_price')
                ->where('products.total', 2)
                ->where('products.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
                    === collect([$otherListProductId, $serviceProductId])->sort()->values()->all())
                ->where('products.data', fn ($rows) => collect($rows)->every(
                    fn ($row) => $row['price_status'] === 'without_price'
                        && $row['total_pricing_records_count'] === 0
                )));

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'CatalogStatusTest',
            'product_id' => $pricedProductId,
            'price_status' => 'with_price',
            'unit_id' => $subunitId,
            'item_status' => 'active',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.total', 1)
                ->where('products.data.0.id', $pricedProductId)
                ->where('products.data.0.total_pricing_records_count', 1));

        $currentItemId = (int) DB::table('price_list_items')
            ->where('price_list_id', $priceListId)
            ->where('product_id', $pricedProductId)
            ->value('id');
        $this->delete(route('admin.inventory.price-lists.items.destroy', [
            'price_list' => $priceListId,
            'item' => $currentItemId,
        ]))->assertRedirect();

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'search' => 'CatalogStatusTest priced',
            'price_status' => 'without_price',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.total', 1)
                ->where('products.data.0.price_status', 'without_price')
                ->where('products.data.0.total_pricing_records_count', 0));

        $this->from(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->post(route('admin.inventory.price-lists.items.store', ['price_list' => $priceListId]), [
                'product_id' => $foreignProductId,
                'unit_id' => $subunitId,
                'min_quantity' => 1,
                'unit_price' => 10,
            ])
            ->assertRedirect(route('admin.inventory.price-lists.show', ['price_list' => $priceListId]))
            ->assertSessionHasErrors('product_id');
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
                ->has('products.data')
                ->has('units')
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
        $unitId = $this->fixtureSubunitFor($unitId);
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
        $unitId = $this->fixtureSubunitFor($unitId);
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
                ->where('products.data.0.total_pricing_records_count', 1)
            );

        $this->getJson(route('admin.inventory.price-lists.products.items', [
            'price_list' => $priceListId,
            'product' => $productId,
        ]))->assertOk()->assertJsonPath('items.0.status', 'scheduled');

        $this->get(route('admin.inventory.price-lists.show', [
            'price_list' => $priceListId,
            'item_status' => 'active',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    }

    public function test_manage_prices_endpoint_returns_all_tiers_for_the_selected_product(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $unitId = $this->fixtureSubunitFor($unitId);
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
            ->has('products.data', 1)
            ->where('products.data.0.id', $productId)
            ->where('products.data.0.total_pricing_records_count', 3)
        );

        $this->getJson(route('admin.inventory.price-lists.products.items', [
            'price_list' => $priceListId,
            'product' => $productId,
        ]))
            ->assertOk()
            ->assertJsonCount(3, 'items')
            ->assertJsonPath('items.0.min_quantity', '1.0000')
            ->assertJsonPath('items.1.min_quantity', '10.0000')
            ->assertJsonPath('items.2.min_quantity', '50.0000')
            ->assertJsonPath('items.2.final_price', '80.0000');
    }

    public function test_price_list_maintained_here_is_the_data_the_existing_resolver_consumes(): void
    {
        $this->guardWritablePriceListTables();
        [$productId, $unitId] = $this->fixtureProductAndUnit();
        $unitId = $this->fixtureSubunitFor($unitId);
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
        $subunitId = $unitId + 1;
        $productId = $this->nextId('products');

        DB::table('item_units')->insert([
            [
                'id' => $unitId,
                'name' => 'Test PL Piece',
                'unit_type' => 1,
                'base_unit' => null,
                'conversion_factor' => 1,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $subunitId,
                'name' => 'Test PL Box',
                'unit_type' => 2,
                'base_unit' => $unitId,
                'conversion_factor' => 10,
                'active' => 1,
                'company_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::table('products')->insert([
            'id' => $productId,
            'product_code' => 'TEST-PL-'.$productId,
            'name' => 'Price List Test Product',
            'slug' => 'price-list-test-product-'.$productId,
            'status' => 'active',
            'sku' => 'SKU-PL-'.$productId,
            'unit_id' => $unitId,
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$productId, $unitId];
    }

    private function fixtureSubunitFor(int $baseUnitId): int
    {
        return (int) DB::table('item_units')
            ->where('base_unit', $baseUnitId)
            ->where('unit_type', 2)
            ->orderBy('id')
            ->value('id');
    }

    private function nextId(string $table): int
    {
        return ((int) DB::table($table)->max('id')) + 1;
    }
}
