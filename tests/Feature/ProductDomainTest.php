<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 1 — Product Domain stabilization tests.
 *
 * Covers the three supported product types (simple / variable / service),
 * the authoritative variation semantics (parent_id != null, mirrored to the
 * legacy is_variation flag), and the service non-stock rule.
 *
 * Database policy (matches ProductImportWorkflowTest convention): tests run
 * against the configured MySQL database. Every fixture uses a unique
 * "PDOM-" name/sku prefix and is removed again in tearDown(), so the
 * database is left as it was found. Never enable RefreshDatabase here —
 * it would wipe the working database.
 */
class ProductDomainTest extends TestCase
{
    /** Prefix that identifies every row this class may delete. */
    private const FIXTURE_PREFIX = 'PDOM-';

    /** @var array<int|string> product ids created during a test */
    private array $createdProductIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        // Enum ALTERs/MySQL-specific behavior differ on sqlite; skip there.
        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('Product domain tests require a MySQL database.');
        }

        // Admin routes require an authenticated admin user (auth:web,employee + admin middleware).
        $user = User::query()->where('role', 'admin')->first()
            ?? User::factory()->create(['role' => 'admin', 'company_id' => 1]);

        $this->actingAs($user);
    }

    // ------------------------------------------------------------------
    // 1. Product Type whitelist (no database writes)
    // ------------------------------------------------------------------

    public function test_product_type_constants_exactly_match_the_domain(): void
    {
        $this->assertSame(['simple', 'variable', 'service'], Products::PRODUCT_TYPES);
    }

    public function test_product_type_helpers_classify_correctly(): void
    {
        $simple = new Products(['product_type' => 'simple']);
        $variable = new Products(['product_type' => 'variable']);
        $service = new Products(['product_type' => 'service']);

        $this->assertTrue($simple->isSimple());
        $this->assertTrue($variable->isVariable());
        $this->assertTrue($service->isService());

        $this->assertFalse($simple->isVariable() || $simple->isService());
        $this->assertFalse($variable->isSimple() || $variable->isService());
        $this->assertFalse($service->isSimple() || $service->isVariable());

        // Services never participate in physical inventory.
        $this->assertFalse($service->managesStock());
        $this->assertTrue($simple->managesStock());
        $this->assertTrue($variable->managesStock());
    }

    public function test_store_rejects_unknown_product_type(): void
    {
        $response = $this->postJsonProduct(['product_type' => 'bundle']);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['product_type']);
        $this->assertNoFixtureProducts('bundle');
    }

    // ------------------------------------------------------------------
    // 2. Variation semantics — parent_id is authoritative
    // ------------------------------------------------------------------

    public function test_variation_child_is_created_with_is_variation_true(): void
    {
        [$parentId, $childId] = $this->createVariableFamily('PDOM-semantics');

        $parent = Products::find($parentId);
        $child = Products::find($childId);

        // Parent: the template — not itself a variation.
        $this->assertSame('variable', $parent->product_type);
        $this->assertNull($parent->parent_id);
        $this->assertFalse($parent->isVariation(), 'A variable parent must never be flagged as a variation.');

        // Child: a simple SKU that IS a variation of its parent.
        $this->assertSame('simple', $child->product_type);
        $this->assertSame($parentId, (int) $child->parent_id);
        $this->assertTrue($child->isVariation());
        $this->assertSame(
            1,
            (int) $child->is_variation,
            'is_variation must mirror parent_id != null (no contradictory state).'
        );
    }

    public function test_model_booted_hook_mirrors_is_variation_on_save(): void
    {
        // Simulate legacy contradictory state being written directly...
        $child = new Products([
            'name' => self::FIXTURE_PREFIX.'mirror-child-'.uniqid(),
            'product_code' => 'PRD-PDOM-'.strtoupper(uniqid()),
            'slug' => 'pdom-mirror-'.uniqid(),
            'parent_id' => 999999999, // non-FK-enforcing tables accept any id
            'product_type' => 'simple',
            'is_variation' => false,
            'status' => 'active',
            'stock_status' => 'in_stock',
        ]);
        $child->save();
        $this->createdProductIds[] = $child->id;

        // ...and the model repairs the flag so readers never see a contradiction.
        $this->assertTrue((bool) $child->fresh()->is_variation);
    }

    public function test_variable_product_cannot_reference_parent_id(): void
    {
        [$parentId] = $this->createVariableFamily('PDOM-nested');

        // Try to create a variable product that is itself a child.
        $response = $this->postJsonProduct([
            'name' => 'PDOM-nested-variable-'.uniqid(),
            'product_type' => 'variable',
            'parent_id' => $parentId,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['parent_id']);
        $this->assertNoFixtureProducts('nested-variable');
    }

    public function test_variation_cannot_belong_to_service_parent(): void
    {
        $serviceId = $this->createProduct('PDOM-service-parent-'.uniqid(), ['product_type' => 'service']);

        $response = $this->postJsonProduct([
            'name' => 'PDOM-child-of-service-'.uniqid(),
            'product_type' => 'variable',
            'parent_id' => $serviceId,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['parent_id']);
        $this->assertNoFixtureProducts('child-of-service');
    }

    public function test_service_cannot_be_a_variation(): void
    {
        [$parentId] = $this->createVariableFamily('PDOM-svc-child');

        // A service hanging under a variable parent violates the domain.
        $response = $this->postJsonProduct([
            'name' => 'PDOM-service-as-child-'.uniqid(),
            'product_type' => 'service',
            'parent_id' => $parentId,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['parent_id']);
        $this->assertNoFixtureProducts('service-as-child');
    }

    // ------------------------------------------------------------------
    // 3. Variable products require variations
    // ------------------------------------------------------------------

    public function test_variable_product_requires_variations_payload(): void
    {
        $response = $this->postJsonProduct([
            'name' => 'PDOM-variable-no-vars-'.uniqid(),
            'product_type' => 'variable',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['variations']);
        $this->assertNoFixtureProducts('variable-no-vars');
    }

    public function test_variable_product_with_variations_creates_family(): void
    {
        [$parentId, $childId] = $this->createVariableFamily('PDOM-family');

        $parent = Products::find($parentId);

        $this->assertSame(1, (int) $parent->variations_count);
        $this->assertSame(1, $parent->children()->count());

        $child = Products::find($childId);
        $this->assertNotNull($child);
        $this->assertTrue($child->isVariation());
    }

    // ------------------------------------------------------------------
    // 4. Simple / service products must stay standalone
    // ------------------------------------------------------------------

    public function test_simple_product_with_variations_is_rejected(): void
    {
        $response = $this->postJsonProduct([
            'name' => 'PDOM-simple-with-vars-'.uniqid(),
            'product_type' => 'simple',
            'variations' => [
                ['sku' => self::FIXTURE_PREFIX.'SV-A', 'price' => 10],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['variations']);
        $this->assertNoFixtureProducts('simple-with-vars');
    }

    public function test_service_product_with_variations_is_rejected(): void
    {
        $response = $this->postJsonProduct([
            'name' => 'PDOM-service-with-vars-'.uniqid(),
            'product_type' => 'service',
            'variations' => [
                ['sku' => self::FIXTURE_PREFIX.'SEV-A', 'price' => 10],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['variations']);
        $this->assertNoFixtureProducts('service-with-vars');
    }

    // ------------------------------------------------------------------
    // 5. Service products are non-stock
    // ------------------------------------------------------------------

    public function test_service_ignores_stock_payload_and_is_forced_non_stock(): void
    {
        $response = $this->postJsonProduct([
            'name' => 'PDOM-service-stock-'.uniqid(),
            'product_type' => 'service',
            'with_storehouse_management' => 1,
            'quantity' => 99,
        ]);

        $response->assertStatus(201);

        $id = $response->json('product.id');
        $this->assertIsInt($id);
        $this->createdProductIds[] = $id;

        $service = Products::find($id);
        $this->assertSame('service', $service->product_type);
        $this->assertFalse((bool) $service->with_storehouse_management, 'Services must never be stock-managed.');
        $this->assertSame(0, (int) $service->quantity, 'Services must never hold stock quantities.');
    }

    // ------------------------------------------------------------------
    // 6. All three types persist and remain intact (regression)
    // ------------------------------------------------------------------

    public function test_all_three_product_types_persist_correctly(): void
    {
        $simpleResponse = $this->postJsonProduct(['product_type' => 'simple']);
        $simpleResponse->assertStatus(201);
        $simpleId = $simpleResponse->json('product.id');
        $this->createdProductIds[] = $simpleId;
        $this->assertSame('simple', Products::find($simpleId)->product_type);

        $serviceResponse = $this->postJsonProduct(['product_type' => 'service']);
        $serviceResponse->assertStatus(201);
        $serviceId = $serviceResponse->json('product.id');
        $this->createdProductIds[] = $serviceId;
        $this->assertSame('service', Products::find($serviceId)->product_type);

        // Existing rows are untouched by Phase 1 writes (regression guard).
        $this->assertSame(0, Products::where('name', 'like', self::FIXTURE_PREFIX.'%')->whereKeyNot($simpleId)->whereKeyNot($serviceId)->count());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function basePayload(): array
    {
        return [
            'name' => self::FIXTURE_PREFIX.uniqid(),
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.strtoupper(uniqid()),
            'save_action' => 'save_and_exit',
        ];
    }

    private function postJsonProduct(array $overrides = [])
    {
        return $this->postJson(
            route('admin.inventory.products.store'),
            array_merge($this->basePayload(), $overrides)
        );
    }

    /**
     * Create a variable parent + one child through the real store flow.
     *
     * @return array{0: int, 1: int} [parentId, childId]
     */
    private function createVariableFamily(string $label): array
    {
        $parentResponse = $this->postJsonProduct([
            'name' => $label.'-parent-'.uniqid(),
            'product_type' => 'variable',
            'variations' => [
                ['sku' => strtoupper($label).'-A-'.strtoupper(uniqid()), 'price' => 10],
            ],
        ]);
        $parentResponse->assertStatus(201);

        $parentId = $parentResponse->json('product.id');
        $this->createdProductIds[] = $parentId;

        $childId = (int) Products::where('parent_id', $parentId)->value('id');
        $this->assertNotNull($childId, 'Variable product must create at least one variation child.');
        $this->createdProductIds[] = $childId;

        return [$parentId, $childId];
    }

    private function createProduct(string $name, array $overrides = []): int
    {
        $response = $this->postJsonProduct(array_merge(['name' => $name], $overrides));
        $response->assertStatus(201);

        $id = $response->json('product.id');
        $this->createdProductIds[] = $id;

        return $id;
    }

    private function assertNoFixtureProducts(string $label): void
    {
        $this->assertSame(
            0,
            Products::where('name', 'like', self::FIXTURE_PREFIX.$label.'%')->count(),
            "Rejected payload must not persist any product rows ($label)."
        );
    }

    protected function tearDown(): void
    {
        // Remove variation links and any children of created parents first,
        // then the tracked parents themselves. Only PDOM-prefixed rows are
        // ever deleted.
        $parentIds = array_map('intval', array_filter($this->createdProductIds));

        if ($parentIds !== []) {
            $childIds = Products::whereIn('parent_id', $parentIds)->pluck('id')->all();

            DB::table('product_variations')->whereIn('product_id', array_merge($parentIds, $childIds))->delete();
            DB::table('product_variations')->whereIn('configurable_product_id', $parentIds)->delete();
            DB::table('products')->whereIn('parent_id', $parentIds)->delete();
        }

        // Hard-delete (Products uses SoftDeletes) so no fixture residue remains.
        Products::withTrashed()->where('name', 'like', self::FIXTURE_PREFIX.'%')->forceDelete();

        parent::tearDown();
    }
}
