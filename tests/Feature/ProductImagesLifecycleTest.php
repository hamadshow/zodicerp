<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Tests\TestCase;

/**
 * Product Images lifecycle tests (Phase: Product Media audit).
 *
 * Runs against the shared sandbox MySQL (no RefreshDatabase — same
 * convention as ProductDomainTest). Every fixture uses the PDOM-
 * prefix and is removed in tearDown; temp storage files are deleted
 * explicitly.
 */
class ProductImagesLifecycleTest extends TestCase
{
    private const FIXTURE_PREFIX = 'PIMG-';

    /** @var array<int> product ids created during a test */
    private array $createdProductIds = [];

    /** @var array<string> storage paths to delete after each test */
    private array $createdStoragePaths = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('Product image tests require a MySQL database.');
        }

        $user = User::query()->where('role', 'admin')->first()
            ?? User::factory()->create(['role' => 'admin', 'company_id' => 1]);
        $this->actingAs($user, 'web');
    }

    protected function tearDown(): void
    {
        foreach ($this->createdStoragePaths as $path) {
            Storage::disk('public')->delete($path);
        }
        $this->createdStoragePaths = [];

        if (! empty($this->createdProductIds)) {
            DB::table('product_variations')->whereIn('configurable_product_id', $this->createdProductIds)->delete();
            DB::table('product_variations')->whereIn('product_id', $this->createdProductIds)->delete();
            DB::table('products')->whereIn('id', $this->createdProductIds)->delete();
        }
        $this->createdProductIds = [];

        parent::tearDown();
    }

    private function track(int $id): int
    {
        $this->createdProductIds[] = $id;

        return $id;
    }

    private function fakeImage(string $name = 'test.png'): UploadedFile
    {
        return UploadedFile::fake()->create($name, 50);
    }

    // ==================================================================
    // Scenario 2 — Create with main image upload → persisted to products/images
    // ==================================================================

    public function test_create_with_main_image_upload_persists_and_displays(): void
    {
        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'main-upload',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'image' => $this->fakeImage(),
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        $row = DB::table('products')->where('id', $id)->first(['image']);
        $this->assertStringStartsWith('products/images/', (string) $row->image);
        $this->assertTrue(Storage::disk('public')->exists($row->image), 'stored file exists on public disk');
        $this->createdStoragePaths[] = $row->image;

        // Frontend URL contract: /media-files/{stored path} must be servable.
        $this->get('/media-files/'.$row->image)->assertStatus(200);
    }

    // ==================================================================
    // Scenario 3 — Create with gallery upload → products/images JSON + files
    // ==================================================================

    public function test_create_with_gallery_upload_persists_all_images(): void
    {
        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'gallery-upload',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'gallery' => [$this->fakeImage('a.png'), $this->fakeImage('b.png')],
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        $images = json_decode((string) DB::table('products')->where('id', $id)->value('images'), true) ?: [];
        $this->assertCount(2, $images);
        foreach ($images as $path) {
            $this->assertStringStartsWith('products/gallery/', $path);
            $this->assertTrue(Storage::disk('public')->exists($path));
            $this->createdStoragePaths[] = $path;
        }
    }

    // ==================================================================
    // Scenario 8 — Media Library selection persists the library path as-is
    // ==================================================================

    public function test_create_with_media_library_path_persists_path_without_upload(): void
    {
        // Put a real file into the library location (media/*).
        $libPath = 'media/'.uniqid('lib').'.png';
        Storage::disk('public')->put($libPath, UploadedFile::fake()->create('lib.png', 50)->getContent());
        $this->createdStoragePaths[] = $libPath;

        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'lib-select',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'image' => $libPath,
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        $this->assertSame($libPath, DB::table('products')->where('id', $id)->value('image'));
    }

    // ==================================================================
    // Scenarios 4/5/6 — Edit: existing loads, replace deletes old (owned) file, remove clears
    // ==================================================================

    private function makeProductWithOwnImage(string $label): array
    {
        $file = $this->fakeImage()->store('products/images', 'public');
        $this->createdStoragePaths[] = $file;

        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.$label,
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'image' => $file,
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        return [$id, $file];
    }

    public function test_edit_replace_main_image_deletes_old_owned_file_and_persists_new(): void
    {
        [$id, $oldPath] = $this->makeProductWithOwnImage('replace-img');

        $newStored = $this->fakeImage()->store('products/images', 'public');
        $this->createdStoragePaths[] = $newStored;

        $this->put(route('admin.inventory.products.update', $id), [
            'name' => self::FIXTURE_PREFIX.'replace-img-v2',
            'status' => 'active',
            'product_type' => 'simple',
            '_method' => 'PUT',
            'stock_status' => 'in_stock',
            'image' => $this->fakeImage(),
            'save_action' => 'save_and_exit',
        ])->assertRedirect();

        $this->assertFalse(Storage::disk('public')->exists($oldPath), 'old OWNED main image file is deleted');
        $this->assertNotSame($oldPath, DB::table('products')->where('id', $id)->value('image'));
    }

    public function test_edit_replace_main_image_keeps_media_library_file_on_disk(): void
    {
        $libPath = 'media/'.uniqid('keep').'.png';
        Storage::disk('public')->put($libPath, UploadedFile::fake()->create('keep.png', 50)->getContent());
        $this->createdStoragePaths[] = $libPath;

        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'keep-lib',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'image' => $libPath,
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        $this->put(route('admin.inventory.products.update', $id), [
            'name' => self::FIXTURE_PREFIX.'keep-lib-v2',
            'status' => 'active',
            'product_type' => 'simple',
            '_method' => 'PUT',
            'stock_status' => 'in_stock',
            'image' => $this->fakeImage(),
            'save_action' => 'save_and_exit',
        ])->assertRedirect()->assertSessionHasNoErrors();

        // RC2 guard: the shared library file must SURVIVE the replacement.
        $this->assertTrue(Storage::disk('public')->exists($libPath), 'media/* library file is never deleted');
        $newImage = (string) DB::table('products')->where('id', $id)->value('image');
        $this->assertStringStartsWith('products/images/', $newImage);
        $this->createdStoragePaths[] = $newImage;
    }

    public function test_edit_remove_main_image_clears_column(): void
    {
        [$id, $path] = $this->makeProductWithOwnImage('remove-img');

        $this->put(route('admin.inventory.products.update', $id), [
            'name' => self::FIXTURE_PREFIX.'remove-img-v2',
            'status' => 'active',
            'product_type' => 'simple',
            '_method' => 'PUT',
            'stock_status' => 'in_stock',
            'delete_image' => '1',
            'save_action' => 'save_and_exit',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertNull(DB::table('products')->where('id', $id)->value('image'));
        $this->assertFalse(Storage::disk('public')->exists($path), 'owned file removed from disk');
    }

    // ==================================================================
    // Scenario 7 — Edit gallery: keep existing + add new, remove existing
    // ==================================================================

    public function test_edit_gallery_keeps_existing_and_adds_new(): void
    {
        $existing = $this->fakeImage()->store('products/gallery', 'public');
        $this->createdStoragePaths[] = $existing;

        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'gallery-edit',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'gallery' => [$existing],
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        $this->put(route('admin.inventory.products.update', $id), [
            'name' => self::FIXTURE_PREFIX.'gallery-edit-v2',
            'status' => 'active',
            'product_type' => 'simple',
            '_method' => 'PUT',
            'stock_status' => 'in_stock',
            'existing_images' => [$existing],
            'gallery' => [$this->fakeImage('added.png')],
            'save_action' => 'save_and_exit',
        ])->assertRedirect();

        $images = json_decode((string) DB::table('products')->where('id', $id)->value('images'), true) ?: [];
        $this->assertCount(2, $images);
        $this->assertContains($existing, $images, 'existing gallery entry kept');
        foreach ($images as $path) {
            $this->assertTrue(Storage::disk('public')->exists($path));
            $this->createdStoragePaths[] = $path;
        }
    }

    public function test_edit_gallery_removal_deletes_owned_file_but_keeps_library_file(): void
    {
        $owned = $this->fakeImage()->store('products/gallery', 'public');
        $this->createdStoragePaths[] = $owned;
        $libImg = 'media/'.uniqid('glib').'.png';
        Storage::disk('public')->put($libImg, UploadedFile::fake()->create('glib.png', 50)->getContent());
        $this->createdStoragePaths[] = $libImg;

        $id = $this->track($this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'gallery-rm',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'gallery' => [$owned, $libImg],
            'save_action' => 'save_and_exit',
        ])->assertStatus(201)->json('product.id'));

        // Remove both from the product (existing_images = []).
        $this->put(route('admin.inventory.products.update', $id), [
            'name' => self::FIXTURE_PREFIX.'gallery-rm-v2',
            'status' => 'active',
            'product_type' => 'simple',
            '_method' => 'PUT',
            'stock_status' => 'in_stock',
            'existing_images' => [],
            'save_action' => 'save_and_exit',
        ])->assertRedirect();

        $this->assertSame('[]', (string) DB::table('products')->where('id', $id)->value('images'));
        $this->assertFalse(Storage::disk('public')->exists($owned), 'owned gallery file deleted from disk');
        $this->assertTrue(Storage::disk('public')->exists($libImg), 'library gallery file kept on disk');
    }

    // ==================================================================
    // RC1 — invalid file → 422 with a field error (not a 500)
    // ==================================================================

    public function test_store_rejects_invalid_main_image_file_with_422(): void
    {
        $this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'bad-img',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'image' => UploadedFile::fake()->create('malware.pdf', 50),
            'save_action' => 'save_and_exit',
        ])->assertStatus(422)->assertJsonValidationErrors(['image']);

        $this->assertNull(DB::table('products')->where('name', self::FIXTURE_PREFIX.'bad-img')->first());
    }

    public function test_store_rejects_oversized_image_with_422(): void
    {
        $this->postJson(route('admin.inventory.products.store'), [
            'name' => self::FIXTURE_PREFIX.'big-img',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'sku' => self::FIXTURE_PREFIX.uniqid(),
            'image' => UploadedFile::fake()->create('huge.png', 6000), // 6MB > 5MB
            'save_action' => 'save_and_exit',
        ])->assertStatus(422)->assertJsonValidationErrors(['image']);
    }

    // ==================================================================
    // RC3 — supplier portal: Media Library path string must persist
    // ==================================================================

    public function test_supplier_portal_store_persists_media_library_path(): void
    {
        $supplierModel = \App\Models\Vendor_Purchases\Supplier::query()->first();
        if (! $supplierModel) {
            $this->markTestSkipped('No supplier fixture available.');
        }

        $libPath = 'media/'.uniqid('sup').'.png';
        Storage::disk('public')->put($libPath, UploadedFile::fake()->create('sup.png', 50)->getContent());
        $this->createdStoragePaths[] = $libPath;

        $this->actingAs($supplierModel, 'supplier');

        $response = $this->postJson(route('supplier.products.store'), [
            'name' => self::FIXTURE_PREFIX.'sup-lib',
            'status' => 'active',
            'product_type' => 'simple',
            'stock_status' => 'in_stock',
            'image' => $libPath,
            'save_action' => 'save_and_exit',
        ]);

        if ($response->status() === 404) {
            $this->markTestSkipped('Supplier portal route unavailable in this environment.');
        }
        $response->assertStatus(in_array($response->status(), [200, 201], true) ? $response->status() : 201);

        $id = (int) ($response->json('product.id') ?? $response->json('data.id') ?? $response->json('id'));
        $this->createdProductIds[] = $id;
        $this->assertSame($libPath, DB::table('products')->where('id', $id)->value('image'));
    }
}
