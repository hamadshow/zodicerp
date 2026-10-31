<?php

namespace Tests\Feature;

use App\Models\Assets\Department;
use App\Models\Currency;
use App\Models\Products;
use App\Models\User;
use App\Models\Vendor_Purchases\PurchaseQuotation;
use App\Models\Vendor_Purchases\Supplier;
use App\Services\SellableProductCatalog;
use App\Services\UnitConversionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PurchaseQuotationCrudTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;

    private Supplier $vendor;

    private Currency $currency;

    private Products $product;

    private int $unitId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::query()
            ->whereIn('role', ['admin', 'superadmin', 'owner'])
            ->whereNotNull('company_id')
            ->firstOrFail();
        $this->actingAs($this->user);

        Department::query()->create([
            'name_ar' => 'قسم اختبار عروض الشراء',
            'name_en' => 'Quotation test department',
            'company_id' => $this->user->company_id,
            'is_active' => true,
        ]);

        $this->vendor = Supplier::query()
            ->where('company_id', $this->user->company_id)
            ->where('is_vendor', true)
            ->where('is_active', true)
            ->firstOrFail();
        $this->currency = Currency::query()->where('status', 'active')->firstOrFail();
        $unitConversion = app(UnitConversionService::class);
        $productCandidates = app(SellableProductCatalog::class)
            ->sellableQuery((int) $this->user->company_id)
            ->whereNotNull('products.unit_id')
            ->get();
        $baseUnits = $unitConversion->baseUnitIdsByProduct($productCandidates);
        $this->product = $productCandidates->first(
            fn (Products $candidate) => isset($baseUnits[(int) $candidate->id])
        );
        if ($this->product) {
            $this->unitId = $baseUnits[(int) $this->product->id];
        }

        $this->assertNotEmpty($this->product ?? null, 'A sellable product with a valid unit is required for this test.');
    }

    public function test_index_exposes_pagination_and_sellable_product_unit_options(): void
    {
        $this->get(route('admin.purchases.quotations.index', ['per_page' => 25]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backend/04-Purchases/Purchase_quotations')
                ->where('quotations.per_page', 25)
                ->has('products')
                ->where('products', function ($products) {
                    $rows = collect($products);
                    $this->assertNotEmpty($rows);
                    $this->assertTrue($rows->every(fn ($product) => ! empty($product['units'])));
                    $this->assertTrue($rows->contains(fn ($product) => (int) $product['id'] === (int) $this->product->id));

                    return true;
                })
            );
    }

    public function test_store_update_view_and_delete_preserve_quotation_line_identity(): void
    {
        $response = $this->post(route('admin.purchases.quotations.store'), $this->payload());

        $response->assertRedirect(route('admin.purchases.quotations.index'));
        $quotation = PurchaseQuotation::query()
            ->where('company_id', $this->user->company_id)
            ->where('created_by', $this->user->id)
            ->latest('created_at')
            ->firstOrFail();
        $line = $quotation->items()->firstOrFail();

        $this->assertNotEmpty($quotation->quotation_number);
        $this->assertSame((int) $this->user->company_id, (int) $quotation->company_id);
        $this->assertSame(180.0, (float) $quotation->subtotal);
        $this->assertSame(9.0, (float) $quotation->tax_amount);
        $this->assertSame(188.0, (float) $quotation->grand_total);
        $this->assertSame((int) $this->product->id, (int) $line->product_id);
        $this->assertSame($this->unitId, (int) $line->unit_id);

        $lineId = (int) $line->id;
        $this->put(route('admin.purchases.quotations.update', ['quotation' => $quotation->id]), $this->payload([
            'items' => [[
                ...$this->payload()['items'][0],
                'id' => $lineId,
                'quantity' => 3,
                'unit_price' => 110,
                'discount_amount' => 10,
                'discount_percent' => 9.09,
                'tax_amount' => 10,
            ]],
            'discount_amount' => 5,
            'shipping_charges' => 7,
            'other_charges' => 2,
        ]))->assertRedirect(route('admin.purchases.quotations.index'));

        $quotation->refresh();
        $updatedLine = $quotation->items()->firstOrFail();
        $this->assertSame($lineId, (int) $updatedLine->id);
        $this->assertSame(300.0, (float) $quotation->subtotal);
        $this->assertSame(30.0, (float) $quotation->tax_amount);
        $this->assertSame(334.0, (float) $quotation->grand_total);
        $this->assertSame(1, $quotation->items()->count());

        $this->get(route('admin.purchases.quotations.show', ['quotation' => $quotation->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('initialMode', 'view')
                ->where('selectedQuotation.id', $quotation->id)
                ->where('selectedQuotation.items.0.id', $lineId)
            );

        $this->delete(route('admin.purchases.quotations.destroy', ['quotation' => $quotation->id]))
            ->assertRedirect(route('admin.purchases.quotations.index'));

        $this->assertSoftDeleted('purchase_quotations', ['id' => $quotation->id]);
    }

    public function test_store_rejects_a_product_outside_the_sellable_catalog(): void
    {
        $this->post(route('admin.purchases.quotations.store'), $this->payload([
            'items' => [[
                ...$this->payload()['items'][0],
                'product_id' => PHP_INT_MAX,
            ]],
        ]))->assertSessionHasErrors('items.0.product_id');
    }

    private function payload(array $overrides = []): array
    {
        $productName = (string) $this->product->name;
        $item = [
            'item_type' => $this->product->product_type === Products::PRODUCT_TYPE_SERVICE ? 'service' : 'product',
            'product_id' => $this->product->id,
            'item_name_ar' => $productName,
            'item_name_en' => $productName,
            'description_ar' => '',
            'description_en' => '',
            'quantity' => 2,
            'unit_id' => $this->unitId,
            'unit_price' => 100,
            'discount_percent' => 10,
            'discount_amount' => 10,
            'tax_amount' => 5,
        ];

        return array_replace([
            'quotation_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
            'vendor_id' => $this->vendor->id,
            'currency_id' => $this->currency->id,
            'exchange_rate' => 1,
            'status' => 'draft',
            'priority' => 'medium',
            'discount_amount' => 9,
            'shipping_charges' => 5,
            'other_charges' => 3,
            'subtotal' => 999999,
            'tax_amount' => 999999,
            'grand_total' => 999999,
            'items' => [$item],
        ], $overrides);
    }
}
