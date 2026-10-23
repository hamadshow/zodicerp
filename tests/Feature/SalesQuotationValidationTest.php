<?php

namespace Tests\Feature;

use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Products;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Sales Quotations pricing contract.
 *
 * The React page filters price lists / products / units / prices client side,
 * but this suite proves the server independently validates every submitted
 * document against the existing architecture:
 *   customers.price_list_id + customer_groups.price_list_id -> eligible lists,
 *   price_list_items                                        -> priced units & tiers,
 *   ProductPriceResolver (explicit price_list_id)           -> authoritative price.
 */
class SalesQuotationValidationTest extends TestCase
{
    use DatabaseTransactions;

    private array $ctx = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::query()->whereIn('role', ['admin', 'superadmin', 'owner'])->firstOrFail());
        $this->ctx = $this->buildPricingContext();
    }

    public function test_index_exposes_customer_scoped_price_lists_and_pricing_payload(): void
    {
        $priceListId = $this->ctx['price_list_id'];
        $inactiveListId = $this->ctx['inactive_list_id'];
        $productPcs = $this->ctx['product_pcs'];
        $productOtherList = $this->ctx['product_other_list'];
        $variantParent = $this->ctx['variant_parent_id'];
        $variantChild = $this->ctx['variant_child_id'];

        $this->get(route('admin.client-sales.quotations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backend/05-Client_Sales/Sales_Quotations')
                ->has('priceLists')
                ->has('priceListPricing')
                ->has('salesAgents')
                ->has('customers')
                // The customer <-> price list linkage the page filters with:
                ->where('customers', function ($customers) {
                    $withList = collect($customers)->firstWhere(
                        'id',
                        $this->ctx['customer_id']
                    );

                    return (int) ($withList['price_list_id'] ?? 0) === $this->ctx['price_list_id'];
                })
                ->where('priceLists', function ($lists) use ($priceListId, $inactiveListId) {
                    $ids = collect($lists)->pluck('id')->map(fn ($id) => (int) $id);

                    // Active lists are offered; inactive lists never are.
                    return $ids->contains($priceListId) && ! $ids->contains($inactiveListId);
                })
                ->where('priceListPricing', function ($pricing) use ($priceListId, $productPcs, $productOtherList, $variantParent, $variantChild) {
                    $entry = collect($pricing)->firstWhere('price_list_id', $priceListId);
                    if (! $entry) {
                        return false;
                    }

                    $rows = collect($entry['products']);
                    $ids = $rows->pluck('id')->map(fn ($id) => (int) $id);

                    // Sellable priced products only: variant children yes,
                    // the variable parent template never, other-list products never.
                    if (! $ids->contains($productPcs) || ! $ids->contains($variantChild)) {
                        return false;
                    }
                    if ($ids->contains($variantParent) || $ids->contains($productOtherList)) {
                        return false;
                    }

                    $variantRow = $rows->firstWhere('id', $variantChild);

                    return str_contains((string) $variantRow['display_name'], 'Shirt Parent')
                        && str_contains((string) $variantRow['display_name'], 'Black');
                })
            );
    }

    public function test_store_rejects_price_list_not_eligible_for_customer(): void
    {
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'price_list_id' => $this->ctx['other_customer_list_id'],
        ]));

        $response->assertSessionHasErrors('price_list_id');
    }

    public function test_store_rejects_customer_without_eligible_price_list(): void
    {
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'customer_id' => $this->ctx['customer_no_list_id'],
            'price_list_id' => $this->ctx['price_list_id'],
        ]));

        $response->assertSessionHasErrors('price_list_id');
    }

    public function test_store_rejects_inactive_price_list(): void
    {
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'price_list_id' => $this->ctx['inactive_list_id'],
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 1, '500.0000')],
        ]));

        $response->assertSessionHasErrors('price_list_id');
    }

    public function test_store_rejects_variable_parent_product(): void
    {
        // Even a tampered price row on the parent cannot make it sellable.
        DB::table('price_list_items')->insert([
            'id' => $this->nextId('price_list_items'),
            'price_list_id' => $this->ctx['price_list_id'],
            'product_id' => $this->ctx['variant_parent_id'],
            'unit_id' => $this->ctx['unit_pcs'],
            'min_quantity' => 1,
            'unit_price' => 250,
            'discount_percentage' => 0,
            'discount_amount' => 0,
            'effective_date' => null,
            'expiry_date' => null,
            'notes' => null,
        ]);

        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['variant_parent_id'], $this->ctx['unit_pcs'], 1, '250.0000')],
        ]));

        $response->assertSessionHasErrors('items.0.product_id');
    }

    public function test_store_rejects_product_without_valid_price_in_selected_list(): void
    {
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_other_list'], $this->ctx['unit_pcs'], 1, '100.0000')],
        ]));

        $response->assertSessionHasErrors('items.0.product_id');
    }

    public function test_store_rejects_unit_not_priced_for_product_in_list(): void
    {
        // product_pcs is priced in PCS only; LOT is priced for product_lot.
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_lot'], 1, '900.0000')],
        ]));

        $response->assertSessionHasErrors('items.0.unit_id');
    }

    public function test_store_rejects_price_that_does_not_match_the_price_list(): void
    {
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 1, '999.0000')],
        ]));

        $response->assertSessionHasErrors('items.0.unit_price');
    }

    public function test_store_rejects_negative_price_fractional_and_zero_quantities(): void
    {
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 1, '-5')],
        ]))->assertSessionHasErrors('items.0.unit_price');

        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], '1.5', '500.0000')],
        ]))->assertSessionHasErrors('items.0.quantity');

        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 0, '500.0000')],
        ]))->assertSessionHasErrors('items.0.quantity');
    }

    public function test_store_creates_quotation_with_server_computed_totals_and_price_list(): void
    {
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [
                $this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 2, '500.0000', ['tax_amount' => 10]),
                $this->line($this->ctx['product_lot'], $this->ctx['unit_lot'], 12, '850.0000'),
            ],
            'discount_amount' => 50,
            'shipping_cost' => 25,
        ]))->assertRedirect();

        $quotation = DB::table('sales_quotations')->latest('id')->first();

        $this->assertNotNull($quotation);
        $this->assertSame($this->ctx['price_list_id'], (int) $quotation->price_list_id);
        $this->assertSame($this->ctx['customer_id'], (int) $quotation->customer_id);
        $this->assertSame(1, (int) $quotation->company_id);

        // subtotal = 2*500 + 12*850 = 11200; tax 10; discount 50; shipping 25
        // total   = 11200 - 0 + 10 - 50 + 25 = 11185
        $this->assertSame('11200.00', number_format((float) $quotation->subtotal, 2, '.', ''));
        $this->assertSame('10.00', number_format((float) $quotation->tax_amount, 2, '.', ''));
        $this->assertSame('50.00', number_format((float) $quotation->discount_amount, 2, '.', ''));
        $this->assertSame('11185.00', number_format((float) $quotation->total_amount, 2, '.', ''));

        $lines = DB::table('sales_quotation_details')
            ->where('quotation_id', $quotation->id)
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $lines);
        $this->assertSame('500.0000', number_format((float) $lines[0]->unit_price, 4, '.', ''));
        $this->assertSame('2.0000', number_format((float) $lines[0]->quantity, 4, '.', ''));
        $this->assertSame('850.0000', number_format((float) $lines[1]->unit_price, 4, '.', ''));
    }

    public function test_store_uses_quantity_tiers_and_variant_children(): void
    {
        // Variant child: tier 1-9 -> 100, tier 10+ -> 80 (final prices).
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [
                $this->line($this->ctx['variant_child_id'], $this->ctx['unit_pcs'], 10, '80.0000'),
            ],
        ]))->assertRedirect();

        $line = DB::table('sales_quotation_details')->latest('id')->first();
        $this->assertSame($this->ctx['variant_child_id'], (int) $line->product_id);
        $this->assertSame('80.0000', number_format((float) $line->unit_price, 4, '.', ''));

        // Below the minimum tier the price list provides -> rejected on quantity.
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [
                $this->line($this->ctx['variant_child_id'], $this->ctx['unit_pcs'], 1, '80.0000'),
            ],
        ]))->assertSessionHasErrors('items.0.unit_price');
    }

    public function test_store_prices_a_dozen_from_quantity_one_without_conversion_factor_minimum(): void
    {
        // SQ LOT has conversion factor 12; its min_quantity 12 tier means
        // "from 12 base pieces" (= 1 dozen), so quantity 1 must be valid at
        // the per-dozen price. The conversion factor is never a minimum the
        // user has to enter.
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($this->ctx['product_lot'], $this->ctx['unit_lot'], 1, '850.0000')],
        ]))->assertRedirect();

        $quotation = DB::table('sales_quotations')->latest('id')->first();
        $line = DB::table('sales_quotation_details')->where('quotation_id', $quotation->id)->first();

        $this->assertSame('850.0000', number_format((float) $line->unit_price, 4, '.', ''));
        $this->assertSame('1.0000', number_format((float) $line->quantity, 4, '.', ''));
        // Line amount = entered quantity x price per dozen (1 x 850): the
        // conversion factor is applied once, for tier matching only.
        $this->assertSame('850.00', number_format((float) $quotation->subtotal, 2, '.', ''));

        // 2 dozen likewise: no minimum-quantity error, no double conversion.
        $updateResponse = $this->put(
            route('admin.client-sales.quotations.update', ['quotation' => $quotation->id]),
            $this->payload([
                'items' => [$this->line($this->ctx['product_lot'], $this->ctx['unit_lot'], 2, '850.0000')],
            ])
        );
        $updateResponse->assertRedirect();
        $this->assertNull(session('error'), 'The update must not fail server side.');

        $line = DB::table('sales_quotation_details')
            ->where('quotation_id', $quotation->id)
            ->whereNull('deleted_at')
            ->first();
        $this->assertSame('850.0000', number_format((float) $line->unit_price, 4, '.', ''));
        $this->assertSame('2.0000', number_format((float) $line->quantity, 4, '.', ''));
        // 2 x 850 = 1700: editing revalidates the converted-unit quantity
        // through the same corrected rule as creating.
        $this->assertSame('1700.00', number_format((float) DB::table('sales_quotations')->where('id', $quotation->id)->value('subtotal'), 2, '.', ''));
    }

    public function test_store_rejects_quantity_below_a_genuine_priced_minimum_in_selected_units(): void
    {
        // A product priced ONLY from 24 base pieces in a dozen unit: the
        // genuine minimum is 2 dozen, stated in the selected unit.
        $productId = $this->insertProduct('SQ Dozen Min Product', $this->ctx['unit_pcs']);
        $this->insertPriceItem($this->ctx['price_list_id'], $productId, $this->ctx['unit_lot'], 24, '800');

        // 1 dozen = 12 base pieces < 24: rejected on quantity, and the
        // message names the minimum as 2 (dozens), not as 12 or 24.
        $response = $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($productId, $this->ctx['unit_lot'], 1, '800.0000')],
        ]));
        $response->assertSessionHasErrors('items.0.quantity');
        $this->assertStringContainsString(
            '(2)',
            (string) session('errors')->first('items.0.quantity')
        );

        // 2 dozen = 24 base pieces: the tier applies and the quotation saves.
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'items' => [$this->line($productId, $this->ctx['unit_lot'], 2, '800.0000')],
        ]))->assertRedirect();

        $line = DB::table('sales_quotation_details')->latest('id')->first();
        $this->assertSame('800.0000', number_format((float) $line->unit_price, 4, '.', ''));
        $this->assertSame('2.0000', number_format((float) $line->quantity, 4, '.', ''));
    }

    public function test_store_accepts_group_assigned_price_list_and_under_review_status(): void
    {
        $this->post(route('admin.client-sales.quotations.store'), $this->payload([
            'customer_id' => $this->ctx['customer_group_list_id'],
            'status' => 'under_review',
            'items' => [$this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 1, '500.0000')],
        ]))->assertRedirect();

        $quotation = DB::table('sales_quotations')->latest('id')->first();
        $this->assertSame('under_review', $quotation->status);
        $this->assertSame($this->ctx['price_list_id'], (int) $quotation->price_list_id);
    }

    public function test_update_revalidates_items_and_rejects_tampered_prices(): void
    {
        $quotationId = $this->createQuotation();

        // Legitimate update: quantity tier change resolves the new price.
        $updateResponse = $this->put(route('admin.client-sales.quotations.update', ['quotation' => $quotationId]), $this->payload([
            'items' => [$this->line($this->ctx['product_lot'], $this->ctx['unit_lot'], 12, '850.0000')],
        ]));
        $updateResponse->assertRedirect();
        $this->assertNull(session('error'), 'The update must not fail server side.');

        $line = DB::table('sales_quotation_details')
            ->where('quotation_id', $quotationId)
            ->whereNull('deleted_at')
            ->first();
        $this->assertSame('850.0000', number_format((float) $line->unit_price, 4, '.', ''));

        // Tampered price cannot slip through the update either.
        $this->put(route('admin.client-sales.quotations.update', ['quotation' => $quotationId]), $this->payload([
            'items' => [$this->line($this->ctx['product_lot'], $this->ctx['unit_lot'], 12, '1.0000')],
        ]))->assertSessionHasErrors('items.0.unit_price');

        // A price list of another customer cannot be attached on update.
        $this->put(route('admin.client-sales.quotations.update', ['quotation' => $quotationId]), $this->payload([
            'price_list_id' => $this->ctx['other_customer_list_id'],
            'items' => [$this->line($this->ctx['product_lot'], $this->ctx['unit_lot'], 12, '850.0000')],
        ]))->assertSessionHasErrors('price_list_id');
    }

    /* ------------------------------------------------------------------ */

    /**
     * Isolated pricing context:
     *   price list A (customer + group assigned, active),
     *   price list B (assigned to another customer only),
     *   an inactive list,
     *   products: PCS-only simple, LOT-multi-unit simple, priced variant
     *   child under an unpriced variable parent, and a service product.
     */
    private function buildPricingContext(): array
    {
        $now = now();
        $currencyId = (int) DB::table('currencies')->value('id');
        $groupId = $this->ensureTestCustomerGroup();

        // Units: head + PCS/LOT subunits.
        $baseUnitId = $this->nextId('item_units');
        $unitPcs = $baseUnitId + 1;
        $unitLot = $baseUnitId + 2;
        DB::table('item_units')->insert([
            ['id' => $baseUnitId, 'name' => 'SQ Test Piece', 'unit_type' => 1, 'base_unit' => null, 'conversion_factor' => 1, 'active' => 1, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => $unitPcs, 'name' => 'SQ PCS', 'unit_type' => 2, 'base_unit' => $baseUnitId, 'conversion_factor' => 1, 'active' => 1, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => $unitLot, 'name' => 'SQ LOT', 'unit_type' => 2, 'base_unit' => $baseUnitId, 'conversion_factor' => 12, 'active' => 1, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Products.
        $productPcs = $this->insertProduct('SQ Product PCS', $baseUnitId);
        $productLot = $this->insertProduct('SQ Product LOT', $baseUnitId);
        $productOtherList = $this->insertProduct('SQ Product Other List', $baseUnitId);
        $productService = $this->insertProduct('SQ Service', $baseUnitId, Products::PRODUCT_TYPE_SERVICE);

        $variantParent = $this->insertProduct('Shirt Parent', $baseUnitId, Products::PRODUCT_TYPE_VARIATION);
        $variantChild = $this->insertProduct('Shirt Child', $baseUnitId, Products::PRODUCT_TYPE_SIMPLE, $variantParent);

        $attributeId = $this->nextId('item_attributes');
        DB::table('item_attributes')->insert([
            'id' => $attributeId,
            'title' => 'Color',
            'slug' => 'color',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $detailId = $this->nextId('item_attributes_details');
        DB::table('item_attributes_details')->insert([
            'id' => $detailId,
            'attribute_set_id' => $attributeId,
            'title' => 'Black',
            'slug' => 'black',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $variationLinkId = $this->nextId('product_variations');
        DB::table('product_variations')->insert([
            'id' => $variationLinkId,
            'product_id' => $variantChild,
            'configurable_product_id' => $variantParent,
            'is_default' => 1,
        ]);
        DB::table('product_variation_items')->insert([
            'id' => $this->nextId('product_variation_items'),
            'variation_id' => $variationLinkId,
            'attribute_id' => $attributeId,
            'attribute_value' => $detailId,
        ]);

        // Price lists.
        $priceListId = $this->insertPriceList('SQ-LIST-A', $currencyId, true);
        $otherCustomerList = $this->insertPriceList('SQ-LIST-B', $currencyId, true);
        $inactiveList = $this->insertPriceList('SQ-LIST-OFF', $currencyId, false);

        // Price list A catalog: PCS-only, LOT tiers, variant child tiers, service.
        $this->insertPriceItem($priceListId, $productPcs, $unitPcs, 1, '500');
        $this->insertPriceItem($priceListId, $productLot, $unitPcs, 1, '900');
        $this->insertPriceItem($priceListId, $productLot, $unitLot, 1, '900');
        $this->insertPriceItem($priceListId, $productLot, $unitLot, 12, '850');
        $this->insertPriceItem($priceListId, $variantChild, $unitPcs, 1, '100');
        $this->insertPriceItem($priceListId, $variantChild, $unitPcs, 10, '80');
        $this->insertPriceItem($priceListId, $productService, $unitPcs, 1, '200');
        // List B catalog.
        $this->insertPriceItem($otherCustomerList, $productOtherList, $unitPcs, 1, '100');

        // Customers.
        $customerA = $this->insertCustomer('SQ-CUST-A', $groupId, $currencyId, $priceListId);
        $customerNoList = $this->insertCustomer('SQ-CUST-NO', $groupId, $currencyId, null);
        $customerOtherList = $this->insertCustomer('SQ-CUST-B', $groupId, $currencyId, $otherCustomerList);
        $customerGroupList = $this->insertCustomer('SQ-CUST-GRP', $this->groupWithList($priceListId), $currencyId, null);

        return [
            'unit_pcs' => $unitPcs,
            'unit_lot' => $unitLot,
            'product_pcs' => $productPcs,
            'product_lot' => $productLot,
            'product_other_list' => $productOtherList,
            'product_service' => $productService,
            'variant_parent_id' => $variantParent,
            'variant_child_id' => $variantChild,
            'price_list_id' => $priceListId,
            'other_customer_list_id' => $otherCustomerList,
            'inactive_list_id' => $inactiveList,
            'customer_id' => $customerA,
            'customer_no_list_id' => $customerNoList,
            'customer_other_list_id' => $customerOtherList,
            'customer_group_list_id' => $customerGroupList,
        ];
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'quotation_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'customer_id' => $this->ctx['customer_id'],
            'price_list_id' => $this->ctx['price_list_id'],
            'currency_id' => (int) DB::table('currencies')->value('id'),
            'exchange_rate' => 1,
            'status' => 'draft',
            'discount_percentage' => 0,
            'discount_amount' => 0,
            'shipping_cost' => 0,
            'items' => [
                $this->line($this->ctx['product_pcs'], $this->ctx['unit_pcs'], 1, '500.0000'),
            ],
        ], $overrides);
    }

    private function line(int $productId, int $unitId, $quantity, string $price, array $overrides = []): array
    {
        return array_merge([
            'product_id' => $productId,
            'quantity' => $quantity,
            'unit_id' => $unitId,
            'unit_price' => $price,
            'discount_percentage' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
        ], $overrides);
    }

    private function createQuotation(): int
    {
        $this->post(route('admin.client-sales.quotations.store'), $this->payload())->assertRedirect();

        return (int) DB::table('sales_quotations')->latest('id')->value('id');
    }

    private function insertProduct(string $name, int $unitId, string $type = Products::PRODUCT_TYPE_SIMPLE, ?int $parentId = null): int
    {
        $id = $this->nextId('products');

        DB::table('products')->insert([
            'id' => $id,
            'product_code' => 'SQ-PRD-'.$id,
            'name' => $name,
            'slug' => 'sq-prd-'.$id,
            'status' => 'active',
            'sku' => 'SQ-SKU-'.$id,
            'unit_id' => $unitId,
            'price' => 300,
            'sale_price' => 280,
            'product_type' => $type,
            'parent_id' => $parentId,
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function insertPriceList(string $code, int $currencyId, bool $active): int
    {
        $id = $this->nextId('price_lists');

        DB::table('price_lists')->insert([
            'id' => $id,
            'code' => $code,
            'name_ar' => 'قائمة اختبار',
            'name_en' => $code,
            'currency_id' => $currencyId,
            'valid_from' => now()->subMonth()->format('Y-m-d'),
            'valid_to' => null,
            'is_default' => 0,
            'price_type' => 'retail',
            'rounding_method' => 'none',
            'rounding_factor' => 0.05,
            'is_active' => $active ? 1 : 0,
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function insertPriceItem(int $priceListId, int $productId, int $unitId, int $minQty, string $price): int
    {
        $id = $this->nextId('price_list_items');

        DB::table('price_list_items')->insert([
            'id' => $id,
            'price_list_id' => $priceListId,
            'product_id' => $productId,
            'unit_id' => $unitId,
            'min_quantity' => $minQty,
            'unit_price' => $price,
            'discount_percentage' => 0,
            'discount_amount' => 0,
            'effective_date' => null,
            'expiry_date' => null,
            'notes' => null,
        ]);

        return $id;
    }

    private function insertCustomer(string $code, int $groupId, int $currencyId, ?int $priceListId): int
    {
        $id = $this->nextId('customers');

        DB::table('customers')->insert([
            'id' => $id,
            'customer_code' => $code,
            'name_ar' => 'عميل اختبار',
            'name_en' => $code,
            'customer_group_id' => $groupId,
            'currency_id' => $currencyId,
            'price_list_id' => $priceListId,
            'is_active' => 1,
            'company_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function groupWithList(int $priceListId): int
    {
        $id = $this->nextId('customer_groups');

        DB::table('customer_groups')->insert([
            'id' => $id,
            'code' => 'SQ-GRP-'.$id,
            'name_ar' => 'مجموعة اختبار',
            'name_en' => 'SQ Test Group',
            'price_list_id' => $priceListId,
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function nextId(string $table): int
    {
        return ((int) DB::table($table)->max('id')) + 1;
    }
}
