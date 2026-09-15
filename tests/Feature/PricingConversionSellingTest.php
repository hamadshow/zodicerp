<?php

namespace Tests\Feature;

use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Products;
use App\Models\User;
use App\Models\ItemUnit;
use App\Models\Warehouses;
use App\Services\ProductPriceResolver;
use App\Services\ProductSellingGuard;
use App\Services\UnitConversionService;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PricingConversionSellingTest extends TestCase
{
    use DatabaseTransactions;

    private array $ids = [];

    public function test_price_list_tier_date_and_unit_resolution_is_server_side(): void
    {
        $productId = $this->nextId('products');
        $baseUnitId = $this->nextId('item_units');
        $otherUnitId = $baseUnitId + 1;
        $priceListId = $this->nextId('price_lists');

        DB::table('item_units')->insert([
            ['id' => $baseUnitId, 'name' => 'Test Piece', 'unit_type' => 1, 'base_unit' => null, 'conversion_factor' => 1, 'active' => 1, 'company_id' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['id' => $otherUnitId, 'name' => 'Test Box', 'unit_type' => 2, 'base_unit' => $baseUnitId, 'conversion_factor' => 10, 'active' => 1, 'company_id' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
        DB::table('products')->insert(['id' => $productId, 'product_code' => 'TEST-PRICE-'.$productId, 'name' => 'Price Test', 'slug' => 'price-test-'.$productId, 'status' => 'active', 'unit_id' => $baseUnitId, 'price' => 120, 'sale_price' => 100, 'company_id' => 1, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('price_lists')->insert(['id' => $priceListId, 'code' => 'TEST-'.$priceListId, 'name_ar' => 'اختبار', 'name_en' => 'Test', 'currency_id' => 1, 'valid_from' => '2026-01-01', 'valid_to' => null, 'is_default' => 0, 'price_type' => 'retail', 'rounding_method' => 'none', 'rounding_factor' => 0.05, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $firstPriceItemId = $this->nextId('price_list_items');
        DB::table('price_list_items')->insert([
            ['id' => $firstPriceItemId, 'price_list_id' => $priceListId, 'product_id' => $productId, 'unit_id' => $otherUnitId, 'min_quantity' => 1, 'unit_price' => 90, 'discount_percentage' => 0, 'discount_amount' => 0, 'effective_date' => '2026-01-01', 'expiry_date' => null, 'notes' => null],
            ['id' => $firstPriceItemId + 1, 'price_list_id' => $priceListId, 'product_id' => $productId, 'unit_id' => $otherUnitId, 'min_quantity' => 10, 'unit_price' => 80, 'discount_percentage' => 0, 'discount_amount' => 0, 'effective_date' => '2026-01-01', 'expiry_date' => null, 'notes' => null],
        ]);
        $customer = Customer::query()->firstOrFail();
        $customer->price_list_id = $priceListId;
        $customer->save();
        $this->actingAs(User::where('company_id', 1)->firstOrFail());

        $result = app(ProductPriceResolver::class)->resolve(['product' => Products::findOrFail($productId), 'customer' => $customer, 'unit_id' => $otherUnitId, 'quantity' => '10', 'transaction_date' => '2026-06-01']);
        $this->assertSame('80.0000', $result['final_price']);
        $this->assertSame('customer_price_list', $result['source']);

        $conversion = app(UnitConversionService::class)->toBase($productId, $otherUnitId, '10');
        $this->assertSame('100.000000', $conversion['base_quantity']);
        $this->assertSame('10.000000', $conversion['conversion_factor']);
    }

    public function test_parent_is_rejected(): void
    {
        $parentId = $this->nextId('products');
        $childId = $parentId + 1;
        $now = now();
        DB::table('products')->insert(['id' => $parentId, 'product_code' => 'TEST-PARENT-'.$parentId, 'name' => 'Parent', 'slug' => 'parent-'.$parentId, 'status' => 'active', 'price' => 10, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('products')->insert(['id' => $childId, 'product_code' => 'TEST-CHILD-'.$childId, 'name' => 'Child', 'slug' => 'child-'.$childId, 'status' => 'active', 'parent_id' => $parentId, 'price' => 10, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now]);

        $this->expectException(ValidationException::class);
        ProductSellingGuard::assertSellable($parentId);
    }

    public function test_child_is_sellable(): void
    {
        $parentId = $this->nextId('products');
        $childId = $parentId + 1;
        $now = now();
        DB::table('products')->insert(['id' => $parentId, 'product_code' => 'TEST-PARENT-'.$parentId, 'name' => 'Parent', 'slug' => 'parent-'.$parentId, 'status' => 'active', 'price' => 10, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('products')->insert(['id' => $childId, 'product_code' => 'TEST-CHILD-'.$childId, 'name' => 'Child', 'slug' => 'child-'.$childId, 'status' => 'active', 'parent_id' => $parentId, 'price' => 10, 'company_id' => 1, 'created_at' => $now, 'updated_at' => $now]);

        ProductSellingGuard::assertSellable($childId);
        $this->assertTrue(true);
    }

    public function test_stock_transfer_uses_one_base_quantity_for_source_and_destination(): void
    {
        $user = User::where('company_id', 1)->firstOrFail();
        $source = Warehouses::where('company_id', 1)->first();
        $destination = Warehouses::where('company_id', 1)->where('id', '!=', $source?->id)->first();
        $product = Products::where('company_id', 1)->whereNotNull('unit_id')->first();
        $subUnit = ItemUnit::where('company_id', 1)->where('unit_type', 2)->whereNotNull('base_unit')->first();

        if (! $source || ! $destination || ! $product || ! $subUnit || (int) $subUnit->base_unit !== (int) $product->unit_id) {
            $this->markTestSkipped('Existing isolated test fixtures do not contain compatible warehouses, product, and sub-unit.');
        }

        $this->actingAs($user);
        app(WeightedAverageCostService::class)->applyInbound(
            (int) $product->id,
            (int) $source->id,
            '10.000000',
            '5.000000',
            'test_transfer_seed',
            (int) $product->id,
            now()->toDateString(),
        );

        $response = $this->post(route('admin.inventory.stock-transfers.store', ['country' => 'sa', 'lang' => 'ar']), [
            'movement_date' => now()->toDateString(),
            'from_warehouse_id' => $source->id,
            'to_warehouse_id' => $destination->id,
            'items' => [[
                'product_id' => $product->id,
                'unit_id' => $subUnit->id,
                'quantity' => 1,
            ]],
        ]);
        $response->assertRedirect();

        $transfer = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer')
            ->where('from_warehouse_id', $source->id)
            ->where('to_warehouse_id', $destination->id)
            ->latest('id')
            ->first();
        $destinationMovement = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer_destination')
            ->where('reference_id', $transfer->id)
            ->first();

        $this->assertNotNull($transfer);
        $this->assertNotNull($destinationMovement);
        $sourceLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $transfer->id)->first();
        $destinationLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $destinationMovement->id)->first();
        $this->assertSame((string) $sourceLine->quantity, (string) $destinationLine->quantity);
        $this->assertSame('1.0000', number_format((float) $sourceLine->original_quantity, 4, '.', ''));
        $this->assertSame((string) $sourceLine->conversion_factor_snapshot, (string) $destinationLine->conversion_factor_snapshot);
    }

    private function nextId(string $table): int
    {
        return ((int) DB::table($table)->max('id')) + 1;
    }
}
