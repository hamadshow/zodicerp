<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use App\Services\ProductService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 1 final fix — Bulk delete integrity + API Product Domain alignment.
 *
 * Database policy: same as ProductDomainTest (MySQL, unique "PDOM-" fixtures,
 * hard cleanup in tearDown, never RefreshDatabase).
 */
class ProductBulkDeleteAndApiTest extends TestCase
{
    private const FIXTURE_PREFIX = 'PDOM-';

    /** @var array<int|string> product ids created during a test */
    private array $createdProductIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('Product domain tests require a MySQL database.');
        }

        // One admin (system role) passes both the web admin middleware and
        // ApiAuth/ApiAdminMiddleware for the API endpoints.
        $user = User::query()->where('role', 'admin')->first()
            ?? User::factory()->create(['role' => 'admin', 'company_id' => 1]);

        $this->actingAs($user, 'web');
    }

    // ==================================================================
    // OBJECTIVE 1 — lifecycle-safe bulk delete
    // ==================================================================

    public function test_bulk_delete_multiple_variations_resyncs_counter(): void
    {
        // Test 1: parent + 3 variations; delete two of them in one request.
        $parentId = $this->createParentWithChildren('PDOM-bd1', 3);
        $children = Products::where('parent_id', $parentId)->orderBy('id')->get();

        $deleted = app(ProductService::class)->bulkDelete([$children[0]->id, $children[1]->id]);

        $this->assertSame(2, $deleted);
        $this->assertNull(Products::find($children[0]->id), 'Variation A must be deleted.');
        $this->assertNull(Products::find($children[1]->id), 'Variation B must be deleted.');
        $this->assertNotNull(Products::find($children[2]->id), 'Variation C must remain.');
        $this->assertSame(1, (int) Products::find($parentId)->variations_count, 'Counter must resync to the one remaining child.');
    }

    public function test_bulk_delete_detaches_variation_links_and_items(): void
    {
        // Test 2: deleting a variation SKU must remove its product_variations
        // link row and every product_variation_items row under it.
        $parentId = $this->createParentWithChildren('PDOM-bd2', 1, true);
        $child = Products::where('parent_id', $parentId)->first();

        $variation = DB::table('product_variations')->where('product_id', $child->id)->first();
        $this->assertNotNull($variation, 'Precondition: link row exists.');
        $this->assertSame(2, DB::table('product_variation_items')->where('variation_id', $variation->id)->count(), 'Precondition: two attribute items exist.');

        app(ProductService::class)->bulkDelete([$child->id]);

        $this->assertSame(0, DB::table('product_variations')->where('product_id', $child->id)->count(), 'No orphaned product_variations.');
        $this->assertSame(0, DB::table('product_variation_items')->where('variation_id', $variation->id)->count(), 'No orphaned product_variation_items.');
    }

    public function test_bulk_delete_children_of_multiple_parents(): void
    {
        // Test 3: one child of each of two parents in the same request.
        $parentA = $this->createParentWithChildren('PDOM-bd3a', 2);
        $parentB = $this->createParentWithChildren('PDOM-bd3b', 2);

        $a1 = Products::where('parent_id', $parentA)->orderBy('id')->first();
        $b1 = Products::where('parent_id', $parentB)->orderBy('id')->first();

        $deleted = app(ProductService::class)->bulkDelete([$a1->id, $b1->id]);

        $this->assertSame(2, $deleted);
        $this->assertSame(1, (int) Products::find($parentA)->variations_count, 'Parent A counter must resync.');
        $this->assertSame(1, (int) Products::find($parentB)->variations_count, 'Parent B counter must resync.');
    }

    public function test_bulk_delete_parent_and_children_in_one_request(): void
    {
        // Test 4: parent + its children in the same bulk request must leave
        // no inconsistent counter/link state behind.
        $parentId = $this->createParentWithChildren('PDOM-bd4', 2);
        $childIds = Products::where('parent_id', $parentId)->pluck('id')->all();

        $deleted = app(ProductService::class)->bulkDelete([$parentId, ...$childIds]);

        $this->assertSame(3, $deleted);
        $this->assertNull(Products::find($parentId));
        $this->assertSame(0, Products::where('parent_id', $parentId)->count(), 'No children may survive their deleted parent in the same request.');
        $this->assertSame(0, DB::table('product_variations')->whereIn('product_id', $childIds)->count(), 'No orphaned variation links.');
    }

    public function test_bulk_delete_is_atomic_when_a_lifecycle_event_fails(): void
    {
        // Transactional guarantee: a failure mid-way rolls back ALL deletions.
        $first = $this->createWebProduct('PDOM-atomic-a-'.uniqid());
        $second = $this->createWebProduct('PDOM-atomic-b-'.uniqid());

        $listener = function (Products $product): void {
            if (str_starts_with((string) $product->name, 'PDOM-atomic-b')) {
                throw new \RuntimeException('simulated lifecycle failure');
            }
        };
        Products::deleted($listener);

        try {
            app(ProductService::class)->bulkDelete([$first, $second]);
            $this->fail('Expected the simulated lifecycle failure to abort the bulk delete.');
        } catch (\RuntimeException $e) {
            $this->assertSame('simulated lifecycle failure', $e->getMessage());
        } finally {
            $dispatcher = Products::getEventDispatcher();
            $this->assertInstanceOf(\Illuminate\Contracts\Events\Dispatcher::class, $dispatcher);
            $dispatcher->forget('eloquent.deleted: '.Products::class);
        }

        $this->assertNotNull(Products::find($first), 'First product must be restored by the rollback.');
        $this->assertNotNull(Products::find($second), 'Second product must be restored by the rollback.');
    }

    // ==================================================================
    // OBJECTIVE 2 — API Product CRUD alignment
    // ==================================================================

    public function test_api_store_simple_with_null_parent_works(): void
    {
        $response = $this->postJson('/api/products', $this->apiPayload([
            'product_type' => 'simple',
            'parent_id' => null,
            'stock_quantity' => 7,
        ]));

        $response->assertStatus(201);
        $id = $response->json('data.id');
        $this->assertIsInt($id);
        $this->createdProductIds[] = $id;

        $product = Products::find($id);
        $this->assertSame('simple', $product->product_type);
        $this->assertNull($product->parent_id);
        $this->assertSame(7, (int) $product->quantity, 'API stock_quantity must map to products.quantity.');
        $this->assertStringStartsWith('API-', (string) $product->product_code, 'product_code must be generated (NOT NULL schema).');
        $this->assertNotNull($product->slug, 'slug must be generated (NOT NULL schema).');
    }

    public function test_api_store_rejects_non_canonical_product_type(): void
    {
        $response = $this->postJson('/api/products', $this->apiPayload(['product_type' => 'bundle']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['product_type']);
    }

    public function test_api_store_rejects_legacy_capitalized_service(): void
    {
        $response = $this->postJson('/api/products', $this->apiPayload(['product_type' => 'Service']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['product_type']);
    }

    public function test_api_store_variable_with_null_parent_works(): void
    {
        $id = $this->createApiProduct(['product_type' => 'variable', 'parent_id' => null]);

        $product = Products::find($id);
        $this->assertSame('variable', $product->product_type);
        $this->assertNull($product->parent_id);
        $this->assertFalse((bool) $product->is_variation, 'A variable parent must never be flagged as a variation.');
    }

    public function test_api_store_variation_child_of_variable_parent_works(): void
    {
        $parentId = $this->createApiProduct(['product_type' => 'variable']);

        $response = $this->postJson('/api/products', $this->apiPayload([
            'product_type' => 'simple',
            'parent_id' => $parentId,
        ]));

        $response->assertStatus(201);
        $childId = $response->json('data.id');
        $this->createdProductIds[] = $childId;

        $child = Products::find($childId);
        $this->assertSame('simple', $child->product_type);
        $this->assertSame($parentId, (int) $child->parent_id);
        $this->assertTrue((bool) $child->is_variation, 'Child of a variable parent is a variation (mirror).');
    }

    public function test_api_store_rejects_variation_under_non_variable_parent(): void
    {
        $simpleParent = $this->createApiProduct(['product_type' => 'simple']);

        $response = $this->postJson('/api/products', $this->apiPayload([
            'product_type' => 'simple',
            'parent_id' => $simpleParent,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['parent_id']);
    }

    public function test_api_store_rejects_variable_child(): void
    {
        $parentId = $this->createApiProduct(['product_type' => 'variable']);

        $response = $this->postJson('/api/products', $this->apiPayload([
            'product_type' => 'variable',
            'parent_id' => $parentId,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['parent_id']);
    }

    public function test_api_store_rejects_service_child(): void
    {
        $parentId = $this->createApiProduct(['product_type' => 'variable']);

        $response = $this->postJson('/api/products', $this->apiPayload([
            'product_type' => 'service',
            'parent_id' => $parentId,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['parent_id']);
    }

    public function test_api_store_service_forces_non_stock(): void
    {
        $id = $this->createApiProduct([
            'product_type' => 'service',
            'stock_quantity' => 99,
            'with_storehouse_management' => 1,
        ]);

        $service = Products::find($id);
        $this->assertSame('service', $service->product_type);
        $this->assertSame(0, (int) $service->quantity, 'API cannot create service stock.');
        $this->assertFalse((bool) $service->with_storehouse_management, 'API cannot stock-manage a service.');
    }

    public function test_api_update_service_cannot_gain_stock(): void
    {
        $id = $this->createApiProduct(['product_type' => 'service']);

        $response = $this->putJson("/api/products/{$id}", [
            'stock_quantity' => 42,
        ]);

        $response->assertStatus(200);

        $service = Products::find($id);
        $this->assertSame(0, (int) $service->quantity, 'API update cannot set stock on a service.');
    }

    public function test_api_destroy_runs_lifecycle_cleanup(): void
    {
        $parentId = $this->createParentWithChildren('PDOM-api-del', 1);
        $child = Products::where('parent_id', $parentId)->first();

        $response = $this->deleteJson("/api/products/{$child->id}");

        $response->assertStatus(200);
        $this->assertNotNull(Products::withTrashed()->find($child->id), 'Product uses SoftDeletes.');
        $this->assertNotNull(Products::withTrashed()->find($child->id)->deleted_at);
        $this->assertSame(0, (int) Products::find($parentId)->variations_count, 'Counter must resync through the API delete.');
        $this->assertSame(0, DB::table('product_variations')->where('product_id', $child->id)->count(), 'Link row must be detached.');
    }

    public function test_api_bulk_delete_is_lifecycle_safe(): void
    {
        $parentId = $this->createParentWithChildren('PDOM-api-bd', 2);
        $childIds = Products::where('parent_id', $parentId)->pluck('id')->all();

        $response = $this->postJson('/api/products/bulk-delete', ['ids' => $childIds]);

        $response->assertStatus(200);
        $this->assertSame(2, $response->json('data.deleted_count'));
        $this->assertSame(0, (int) Products::find($parentId)->variations_count, 'Counter must resync after API bulk delete.');
        $this->assertSame(0, DB::table('product_variations')->whereIn('product_id', $childIds)->count(), 'No orphaned links after API bulk delete.');
    }

    public function test_api_bulk_delete_parent_and_children_together(): void
    {
        $parentId = $this->createParentWithChildren('PDOM-api-bdfam', 2);
        $childIds = Products::where('parent_id', $parentId)->pluck('id')->all();

        $response = $this->postJson('/api/products/bulk-delete', ['ids' => [$parentId, ...$childIds]]);

        $response->assertStatus(200);
        $this->assertSame(3, $response->json('data.deleted_count'));
        $this->assertSame(0, DB::table('product_variations')->whereIn('product_id', [$parentId, ...$childIds])->count());
    }

    // ==================================================================
    // Helpers
    // ==================================================================

    private function apiPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => self::FIXTURE_PREFIX.'api-'.uniqid(),
            'sku' => self::FIXTURE_PREFIX.strtoupper(uniqid()),
            'price' => 19.5,
            'stock_quantity' => 5,
            'product_type' => 'simple',
            'status' => 'active',
        ], $overrides);
    }

    private function createApiProduct(array $overrides = []): int
    {
        $response = $this->postJson('/api/products', $this->apiPayload($overrides));
        $response->assertStatus(201);

        $id = $response->json('data.id');
        $this->assertIsInt($id);
        $this->createdProductIds[] = $id;

        return $id;
    }

    private function createWebProduct(string $name, array $overrides = []): int
    {
        $response = $this->postJson(route('admin.inventory.products.store'), array_merge([
            'name' => $name,
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.strtoupper(uniqid()),
            'save_action' => 'save_and_exit',
        ], $overrides));
        $response->assertStatus(201);

        $id = $response->json('product.id');
        $this->assertIsInt($id);
        $this->createdProductIds[] = $id;

        return $id;
    }

    /**
     * Create a variable parent with $count variation children through the real
     * web store flow (so product_variations links exist like production data).
     */
    private function createParentWithChildren(string $label, int $count, bool $withAttributes = false): int
    {
        $variations = [];
        for ($i = 1; $i <= $count; $i++) {
            $variations[] = [
                'sku' => strtoupper($label)."-{$i}-".strtoupper(uniqid()),
                'price' => 10 * $i,
            ];
        }

        if ($withAttributes) {
            $attributeIds = DB::table('item_attributes')->orderBy('id')->limit(2)->pluck('id');
            $this->assertSame(2, $attributeIds->count(), 'item_attributes must contain at least two rows for this test.');
            $variations[0]['attributes'] = $attributeIds->map(fn ($id) => [
                'attribute_id' => (int) $id,
                'attribute_value' => 'Value-'.uniqid(),
            ])->all();
        }

        $response = $this->postJson(route('admin.inventory.products.store'), [
            'name' => $label.'-parent-'.uniqid(),
            'status' => 'active',
            'product_type' => 'variable',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.strtoupper(uniqid()),
            'variations' => $variations,
            'save_action' => 'save_and_exit',
        ]);
        $response->assertStatus(201);

        $parentId = $response->json('product.id');
        $this->assertIsInt($parentId);
        $this->createdProductIds[] = $parentId;

        foreach (Products::where('parent_id', $parentId)->pluck('id') as $childId) {
            $this->createdProductIds[] = $childId;
        }

        return $parentId;
    }

    protected function tearDown(): void
    {
        // Hard-delete (Products uses SoftDeletes) so no fixture residue remains,
        // including rows soft-deleted by the tests themselves.
        Products::withTrashed()->where('name', 'like', self::FIXTURE_PREFIX.'%')->forceDelete();
        // Sweep any link/item rows orphaned by the hard deletes above.
        DB::table('product_variation_items')->whereNotExists(function ($q) {
            $q->selectRaw(1)->from('product_variations')->whereColumn('product_variations.id', 'product_variation_items.variation_id');
        })->delete();
        DB::table('product_variations')->whereNotExists(function ($q) {
            $q->selectRaw(1)->from('products')->whereColumn('products.id', 'product_variations.product_id');
        })->delete();

        parent::tearDown();
    }
}
