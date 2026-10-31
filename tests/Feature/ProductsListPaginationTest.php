<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductsListPaginationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('Products list pagination tests require the configured MySQL database.');
        }

        $user = User::query()->whereIn('role', ['admin', 'superadmin', 'owner'])->first();
        if (! $user) {
            $this->markTestSkipped('An existing admin account is required for products list pagination tests.');
        }

        $this->actingAs($user);
    }

    public function test_products_list_honors_each_supported_page_size_and_reports_actual_pagination_metadata(): void
    {
        $expectedTotal = Products::query()->whereNull('parent_id')->count();

        foreach ([10, 25, 50, 100] as $perPage) {
            $response = $this->getJson(route('admin.inventory.products.index', [
                'per_page' => $perPage,
                'page' => 1,
            ]))->assertOk();

            $response->assertJsonPath('products.per_page', $perPage);
            $response->assertJsonPath('products.current_page', 1);
            $response->assertJsonPath('products.total', $expectedTotal);
            $response->assertJsonPath(
                'products.last_page',
                max(1, (int) ceil($expectedTotal / $perPage))
            );
            $this->assertCount(min($perPage, $expectedTotal), $response->json('products.data'));
        }
    }

    public function test_products_list_keeps_page_size_and_filters_while_navigating_and_resets_invalid_page_sizes(): void
    {
        $activeTotal = Products::query()->whereNull('parent_id')->where('status', 'active')->count();
        $filters = [
            'search' => '',
            'status' => 'active',
            'brand_id' => '',
            'category_id' => '',
            'unit_id' => '',
            'per_page' => 10,
        ];

        $firstPage = $this->getJson(route('admin.inventory.products.index', $filters + ['page' => 1]))
            ->assertOk()
            ->assertJsonPath('products.per_page', 10)
            ->assertJsonPath('products.current_page', 1);

        if ($activeTotal > 10) {
            $secondPage = $this->getJson(route('admin.inventory.products.index', $filters + ['page' => 2]))
                ->assertOk()
                ->assertJsonPath('products.per_page', 10)
                ->assertJsonPath('products.current_page', 2);

            $firstPageIds = collect($firstPage->json('products.data'))->pluck('id');
            $secondPageIds = collect($secondPage->json('products.data'))->pluck('id');
            $this->assertSame([], $firstPageIds->intersect($secondPageIds)->values()->all());
        }

        $this->getJson(route('admin.inventory.products.index', [
            'per_page' => 20,
            'page' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('products.per_page', 10);
    }
}
