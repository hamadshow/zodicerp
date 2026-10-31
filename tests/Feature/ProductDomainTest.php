<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 1 — Product Domain stabilization tests.
 *
 * Covers the three supported product types (simple / variation / service),
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
        $this->assertSame(['simple', 'variation', 'service'], Products::PRODUCT_TYPES);
    }

    public function test_product_type_helpers_classify_correctly(): void
    {
        $simple = new Products(['product_type' => 'simple']);
        $variable = new Products(['product_type' => 'variation']);
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

    public function test_store_rejects_legacy_variable_product_type(): void
    {
        $name = 'PDOM-invalid-type-'.uniqid();
        $response = $this->postJsonProduct([
            'name' => $name,
            'product_type' => 'variable',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['product_type']);
        $this->assertSame(0, Products::where('name', $name)->count());
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
        $this->assertSame('variation', $parent->product_type);
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
        [$parentId] = $this->createVariableFamily('PDOM-mirror-parent');

        // Simulate legacy contradictory state being written directly...
        $child = new Products([
            'name' => self::FIXTURE_PREFIX.'mirror-child-'.uniqid(),
            'product_code' => 'PRD-PDOM-'.strtoupper(uniqid()),
            'slug' => 'pdom-mirror-'.uniqid(),
            'parent_id' => $parentId,
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
            'product_type' => 'variation',
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
            'product_type' => 'variation',
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
            'product_type' => 'variation',
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
                ['sku' => self::FIXTURE_PREFIX.'SV-A'],
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
                ['sku' => self::FIXTURE_PREFIX.'SEV-A'],
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
    // 7. is_variation compatibility — both directions of the mirror
    // ------------------------------------------------------------------

    public function test_parent_rows_are_never_flagged_as_variation(): void
    {
        // Legacy writer code still sets is_variation=true on variable PARENT
        // rows; the model must normalize it back to false on save.
        [$parentId] = $this->createVariableFamily('PDOM-flag');

        $parent = Products::find($parentId);
        $parent->is_variation = true; // simulate legacy writer
        $parent->save();

        $this->assertFalse((bool) $parent->fresh()->is_variation, 'parent_id = NULL must always imply is_variation = false.');
    }

    // ------------------------------------------------------------------
    // 8. variations_count stays consistent on delete / restore
    // ------------------------------------------------------------------

    public function test_deleting_a_child_resyncs_variations_count_and_detaches_link(): void
    {
        [$parentId, $childId] = $this->createVariableFamily('PDOM-del');
        $this->assertSame(1, (int) Products::find($parentId)->variations_count);
        $this->assertSame(1, DB::table('product_variations')->where('product_id', $childId)->count());

        Products::find($childId)->delete(); // soft delete through the model

        $this->assertSame(0, (int) Products::find($parentId)->variations_count, 'variations_count must re-sync when a child is deleted.');
        $this->assertSame(0, DB::table('product_variations')->where('product_id', $childId)->count(), 'product_variations link must not outlive the child.');
    }

    public function test_restoring_a_child_resyncs_variations_count(): void
    {
        [$parentId, $childId] = $this->createVariableFamily('PDOM-rest');

        Products::find($childId)->delete();
        $this->assertSame(0, (int) Products::find($parentId)->variations_count);

        Products::withTrashed()->find($childId)->restore();

        $this->assertSame(1, (int) Products::find($parentId)->variations_count, 'variations_count must re-sync when a child is restored.');
    }

    public function test_parent_cannot_be_deleted_while_children_exist(): void
    {
        [$parentId] = $this->createVariableFamily('PDOM-guard');

        $response = $this->deleteJson(route('admin.inventory.products.destroy', $parentId));

        $response->assertStatus(400);
        $this->assertNotNull(Products::find($parentId), 'Parent must survive a blocked delete.');
    }

    // ------------------------------------------------------------------
    // 9. Real edit flows through the update endpoint
    // ------------------------------------------------------------------

    public function test_edit_simple_product_updates_fields_without_domain_drift(): void
    {
        $id = $this->createProduct('PDOM-edit-simple-'.uniqid(), ['product_type' => 'simple']);

        $response = $this->putJson(route('admin.inventory.products.update', $id), [
            'name' => 'PDOM-edit-simple-renamed-'.uniqid(),
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
        ]);
        $response->assertStatus(200);

        $product = Products::find($id);
        $this->assertSame('simple', $product->product_type);
        $this->assertNull($product->parent_id);
        $this->assertFalse((bool) $product->is_variation);
    }

    public function test_edit_simple_product_to_variation_persists_type_and_creates_children(): void
    {
        $id = $this->createProduct('PDOM-simple-to-variation-'.uniqid(), ['product_type' => 'simple']);

        $response = $this->putJson(route('admin.inventory.products.update', $id), [
            'name' => 'PDOM-simple-to-variation-parent-'.uniqid(),
            'status' => 'active',
            'product_type' => 'variation',
            'stock_status' => 'in_stock',
            'variations' => [
                ['sku' => self::FIXTURE_PREFIX.'STV-'.strtoupper(uniqid())],
            ],
        ]);
        $response->assertStatus(200);

        $parent = Products::findOrFail($id);
        $child = Products::where('parent_id', $id)->firstOrFail();

        $this->assertSame('variation', $parent->product_type);
        $this->assertSame('simple', $child->product_type);
        $this->assertSame($id, (int) $child->parent_id);
        $this->assertTrue((bool) $child->is_variation);
    }

    public function test_edit_variation_parent_to_simple_removes_child_skus(): void
    {
        [$parentId, $childId] = $this->createVariableFamily('PDOM-variation-to-simple');

        $response = $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => 'PDOM-variation-to-simple-'.uniqid(),
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
        ]);
        $response->assertStatus(200);

        $this->assertSame('simple', Products::findOrFail($parentId)->product_type);
        $this->assertNull(Products::find($childId));
        $this->assertNotNull(Products::withTrashed()->find($childId), 'Removed child SKUs are retained as soft-deleted rows.');
        $this->assertSame(0, (int) Products::findOrFail($parentId)->variations_count);
    }

    public function test_edit_variation_parent_to_service_removes_children_and_enforces_non_stock(): void
    {
        [$parentId, $childId] = $this->createVariableFamily('PDOM-variation-to-service');

        $response = $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => 'PDOM-variation-to-service-'.uniqid(),
            'status' => 'active',
            'product_type' => 'service',
            'stock_status' => 'in_stock',
            'with_storehouse_management' => 1,
            'quantity' => 55,
        ]);
        $response->assertStatus(200);

        $service = Products::findOrFail($parentId);
        $this->assertSame('service', $service->product_type);
        $this->assertFalse((bool) $service->with_storehouse_management);
        $this->assertSame(0, (int) $service->quantity);
        $this->assertNull(Products::find($childId));
        $this->assertNotNull(Products::withTrashed()->find($childId), 'Removed child SKUs are retained as soft-deleted rows.');
    }

    public function test_edit_page_loads_the_persisted_variation_type(): void
    {
        [$parentId] = $this->createVariableFamily('PDOM-reload-type');

        $this->get(route('admin.inventory.products.edit', $parentId))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Backend/03-Inventory/Products')
                ->where('product.product_type', 'variation'));
    }

    public function test_edit_service_cannot_sneak_stock_back_in(): void
    {
        $id = $this->createProduct('PDOM-edit-service-'.uniqid(), ['product_type' => 'service']);

        $response = $this->putJson(route('admin.inventory.products.update', $id), [
            'name' => 'PDOM-edit-service-'.uniqid(),
            'status' => 'active',
            'product_type' => 'service',
            'stock_status' => 'in_stock',
            'with_storehouse_management' => 1,
            'quantity' => 55,
        ]);
        $response->assertStatus(200);

        $service = Products::find($id);
        $this->assertFalse((bool) $service->with_storehouse_management, 'Edit path must not re-enable stock management on a service.');
        $this->assertSame(0, (int) $service->quantity, 'Edit path must not set a quantity on a service.');
    }

    public function test_edit_variable_product_resyncs_family(): void
    {
        [$parentId] = $this->createVariableFamily('PDOM-edit-var');

        // Replace the variation set with two SKUs through the real update flow.
        $response = $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => 'PDOM-edit-var-parent-'.uniqid(),
            'status' => 'active',
            'product_type' => 'variation',
            'stock_status' => 'in_stock',
            'variations' => [
                ['sku' => self::FIXTURE_PREFIX.'EV-A-'.strtoupper(uniqid())],
                ['sku' => self::FIXTURE_PREFIX.'EV-B-'.strtoupper(uniqid())],
            ],
        ]);
        $response->assertStatus(200);

        $parent = Products::find($parentId);
        $children = Products::where('parent_id', $parentId)->get();

        $this->assertSame(2, $children->count());
        $this->assertSame('variation', $parent->product_type);
        $this->assertSame(2, (int) $parent->variations_count, 'variations_count must match the recreated variation set.');
        $this->assertSame(2, DB::table('product_variations')->where('configurable_product_id', $parentId)->count(), 'product_variations links must match the recreated set.');

        foreach ($children as $child) {
            $this->assertSame('simple', $child->product_type);
            $this->assertTrue((bool) $child->is_variation);
        }
    }

    public function test_editing_one_variation_preserves_child_and_link_ids_and_other_variation_data(): void
    {
        [$parentId, $firstChildId] = $this->createVariableFamily('PDOM-variation-update');
        $firstLinkId = (int) DB::table('product_variations')->where('product_id', $firstChildId)->value('id');
        $firstSku = Products::findOrFail($firstChildId)->sku;
        $secondSku = self::FIXTURE_PREFIX.'VU-B-'.strtoupper(uniqid());

        $response = $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => 'PDOM-variation-update-parent-'.uniqid(),
            'status' => 'active',
            'product_type' => 'variation',
            'stock_status' => 'in_stock',
            'variations' => [
                ['id' => $firstLinkId, 'sku' => $firstSku, 'stock' => 5],
                ['sku' => $secondSku, 'stock' => 13],
            ],
        ]);
        $response->assertStatus(200);

        $secondChildId = (int) Products::where('parent_id', $parentId)->where('sku', $secondSku)->value('id');
        $secondLinkId = (int) DB::table('product_variations')->where('product_id', $secondChildId)->value('id');

        $response = $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => 'PDOM-variation-update-parent-'.uniqid(),
            'status' => 'active',
            'product_type' => 'variation',
            'stock_status' => 'in_stock',
            'variations' => [
                ['id' => $firstLinkId, 'sku' => $firstSku, 'stock' => 6],
                ['id' => $secondLinkId, 'sku' => $secondSku, 'stock' => 13],
            ],
        ]);
        $response->assertStatus(200);

        $this->assertSame($firstChildId, (int) Products::where('parent_id', $parentId)->where('sku', $firstSku)->value('id'));
        $this->assertSame($secondChildId, (int) Products::where('parent_id', $parentId)->where('sku', $secondSku)->value('id'));
        $this->assertSame($firstLinkId, (int) DB::table('product_variations')->where('product_id', $firstChildId)->value('id'));
        $this->assertSame($secondLinkId, (int) DB::table('product_variations')->where('product_id', $secondChildId)->value('id'));
        $this->assertSame(6, (int) Products::findOrFail($firstChildId)->quantity);
        $this->assertSame(13, (int) Products::findOrFail($secondChildId)->quantity);
        $this->assertSame(2, DB::table('product_variations')->where('configurable_product_id', $parentId)->count());

        $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => Products::findOrFail($parentId)->name,
            'status' => 'active',
            'product_type' => 'variation',
            'variations' => [
                ['id' => $firstLinkId, 'sku' => $firstSku, 'stock' => 6],
            ],
        ])->assertOk();

        $this->assertNotNull(Products::find($secondChildId), 'An omitted row must not be deleted during an ordinary edit.');
        $this->assertSame($secondLinkId, (int) DB::table('product_variations')->where('product_id', $secondChildId)->value('id'));
    }

    public function test_individual_variation_editor_updates_only_selected_child_and_validates_tax_scope(): void
    {
        [$parentId, $firstChildId] = $this->createVariableFamily('PDOM-individual-editor');
        $parent = Products::findOrFail($parentId);
        $parent->update([
            'cost_per_item' => 80,
            'price_includes_tax' => true,
            'reorder_point' => 44,
            'minimum_order_quantity' => 4,
            'maximum_order_quantity' => 40,
            'weight' => 12,
            'length' => 13,
            'wide' => 14,
            'height' => 15,
        ]);

        $firstLinkId = (int) DB::table('product_variations')->where('product_id', $firstChildId)->value('id');
        $secondSku = self::FIXTURE_PREFIX.'IE-B-'.strtoupper(uniqid());
        $response = $this->putJson(route('admin.inventory.products.update', $parentId), [
            'name' => $parent->name,
            'status' => 'active',
            'product_type' => 'variation',
            'stock_status' => 'in_stock',
            'variations' => [
                [
                    'id' => $firstLinkId,
                    'sku' => Products::findOrFail($firstChildId)->sku,
                    'stock' => 5,
                    'cost_per_item' => 2,
                    'reorder_point' => 1,
                    'minimum_order_quantity' => 1,
                    'maximum_order_quantity' => null,
                    'weight' => 1,
                    'length' => 2,
                    'wide' => 3,
                    'height' => 4,
                ],
                ['sku' => $secondSku, 'stock' => 13, 'cost_per_item' => 6, 'weight' => 7],
            ],
        ]);
        $response->assertStatus(200);

        $firstChild = Products::findOrFail($firstChildId);
        $secondChildId = (int) Products::where('parent_id', $parentId)->where('sku', $secondSku)->value('id');
        $secondLinkId = (int) DB::table('product_variations')->where('product_id', $secondChildId)->value('id');
        $secondBefore = Products::findOrFail($secondChildId)->only([
            'cost_per_item', 'price_includes_tax', 'tax_id', 'reorder_point',
            'minimum_order_quantity', 'maximum_order_quantity', 'weight', 'length', 'wide', 'height',
        ]);
        $parentBefore = Products::findOrFail($parentId)->only([
            'cost_per_item', 'price_includes_tax', 'tax_id', 'reorder_point',
            'minimum_order_quantity', 'maximum_order_quantity', 'weight', 'length', 'wide', 'height',
        ]);

        $this->patchJson(route('admin.inventory.products.variations.update', [
            'product' => $parentId,
            'variation' => $firstLinkId,
        ]), [
            'sku' => $firstChild->sku,
            'cost_per_item' => 9,
            'barcode' => null,
            'stock' => 8,
            'stock_status' => 'in_stock',
            'price_includes_tax' => true,
            'tax_id' => 999999999,
            'reorder_point' => 6,
            'minimum_order_quantity' => 2,
            'maximum_order_quantity' => null,
            'weight' => 8,
            'length' => 9,
            'wide' => 10,
            'height' => 11,
        ])->assertStatus(422)->assertJsonValidationErrors(['tax_id']);

        $this->patchJson(route('admin.inventory.products.variations.update', [
            'product' => $parentId,
            'variation' => $firstLinkId,
        ]), [
            'sku' => $firstChild->sku,
            'cost_per_item' => 9,
            'barcode' => null,
            'stock' => 8,
            'stock_status' => 'in_stock',
            'price_includes_tax' => false,
            'tax_id' => null,
            'reorder_point' => 6,
            'minimum_order_quantity' => 2,
            'maximum_order_quantity' => null,
            'weight' => 8,
            'length' => 9,
            'wide' => 10,
            'height' => 11,
        ])->assertOk();

        $firstChild->refresh();
        $this->assertSame('9.00', $firstChild->cost_per_item);
        $this->assertFalse((bool) $firstChild->price_includes_tax);
        $this->assertNull($firstChild->tax_id);
        $this->assertSame(6, (int) $firstChild->reorder_point);
        $this->assertSame(2, (int) $firstChild->minimum_order_quantity);
        $this->assertNull($firstChild->maximum_order_quantity);
        $this->assertSame('8.00', $firstChild->weight);
        $this->assertSame(8, (int) $firstChild->quantity);
        $this->assertSame($secondBefore, Products::findOrFail($secondChildId)->only(array_keys($secondBefore)));
        $this->assertSame($parentBefore, Products::findOrFail($parentId)->only(array_keys($parentBefore)));

        $otherParent = $this->createVariableFamily('PDOM-editor-other-parent');
        $otherLinkId = (int) DB::table('product_variations')->where('product_id', $otherParent[1])->value('id');
        $this->patchJson(route('admin.inventory.products.variations.update', [
            'product' => $parentId,
            'variation' => $otherLinkId,
        ]), [
            'price_includes_tax' => false,
        ])->assertNotFound();

        $this->assertSame($secondLinkId, (int) DB::table('product_variations')->where('product_id', $secondChildId)->value('id'));
    }

    public function test_simple_to_variation_conversion_updates_existing_parent_in_place(): void
    {
        $image = 'products/images/'.uniqid().'.jpg';
        $productId = $this->createProduct('PDOM-convert-'.uniqid(), [
            'description' => 'Preserved description',
            'image' => $image,
        ]);
        $productBefore = Products::findOrFail($productId);
        $variationSku = self::FIXTURE_PREFIX.'CONVERT-'.strtoupper(uniqid());

        $this->putJson(route('admin.inventory.products.update', $productId), [
            'name' => $productBefore->name,
            'description' => $productBefore->description,
            'image' => $productBefore->image,
            'status' => 'active',
            'product_type' => 'variation',
            'variations' => [
                [
                    'sku' => $variationSku,
                    'cost_per_item' => 3.25,
                    'stock' => 4,
                    'reorder_point' => 1,
                    'minimum_order_quantity' => 1,
                    'weight' => 2.5,
                    'length' => 10,
                    'wide' => 5,
                    'height' => 3,
                ],
            ],
        ])->assertOk();

        $parent = Products::findOrFail($productId);
        $child = Products::where('parent_id', $productId)->where('sku', $variationSku)->firstOrFail();
        $this->assertSame('variation', $parent->product_type);
        $this->assertSame('Preserved description', $parent->description);
        $this->assertSame($image, $parent->image);
        $this->assertSame($productId, (int) $child->parent_id);
        $this->assertSame('3.25', $child->cost_per_item);
        $this->assertSame(1, Products::where('name', $productBefore->name)->count());
        $this->assertSame(1, DB::table('product_variations')->where('configurable_product_id', $productId)->count());
    }

    // ------------------------------------------------------------------
    // 10. Generic stock service cannot push stock onto a service
    // ------------------------------------------------------------------

    public function test_product_service_update_stock_ignores_services(): void
    {
        $serviceId = $this->createProduct('PDOM-svc-stock-api-'.uniqid(), ['product_type' => 'service']);

        $service = app(\App\Services\ProductService::class)->updateStock($serviceId, 42, 'set');

        $this->assertSame(0, (int) $service->quantity, 'updateStock() must never modify a service quantity.');
        $this->assertFalse((bool) $service->with_storehouse_management);
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
            'product_type' => 'variation',
            'variations' => [
                ['sku' => strtoupper($label).'-A-'.strtoupper(uniqid())],
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
