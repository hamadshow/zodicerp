<?php

namespace Tests\Feature\Inventory;

use App\Models\User;
use App\Models\Products;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductIsFeaturedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Create a user for authentication
        $this->user = User::factory()->create(['role' => 'admin']);
    }

    public function test_variable_product_update_persists_is_featured()
    {
        // 1. Create a variable product
        $product = Products::create([
            'product_code' => 'PROD-001',
            'name' => 'Test Variable Product',
            'slug' => 'test-variable-product',
            'product_type' => 'variable',
            'is_featured' => false,
            'status' => 'active',
            'price' => 100,
        ]);

        // 2. Prepare update data simulating frontend request
        $data = [
            'name' => 'Test Variable Product Updated',
            'product_type' => 'variable',
            'is_featured' => 1, // Simulate checking the box
            'status' => 'active',
            'stock_status' => 'in_stock',
            'save_action' => 'save',
            'variations' => [
                [
                    'sku' => 'VAR-1',
                    'price' => 110,
                    'stock' => 10,
                    'is_default' => 1,
                ]
            ]
        ];

        // 3. Send update request
        $response = $this->actingAs($this->user)
                         ->putJson(route('admin.products.update', ['product' => $product->id]), $data);

        // 4. Assert response status
        $response->assertStatus(200);

        // 5. Verify database
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_featured' => 1,
        ]);

        // 6. Test unchecking
        $data['is_featured'] = 0;
        $response = $this->actingAs($this->user)
                         ->putJson(route('admin.products.update', ['product' => $product->id]), $data);
        
        $response->assertStatus(200);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_featured' => 0,
        ]);
    }

    public function test_variable_product_variation_images()
    {
        // 1. Create a variable product
        $product = Products::create([
            'product_code' => 'PROD-IMG-001',
            'name' => 'Test Variation Images',
            'slug' => 'test-variation-images',
            'product_type' => 'variable',
            'status' => 'active',
            'price' => 100,
        ]);

        // 2. Prepare update data with variation images
        $data = [
            'name' => 'Test Variation Images Updated',
            'product_type' => 'variable',
            'is_featured' => 0,
            'status' => 'active',
            'stock_status' => 'in_stock',
            'save_action' => 'save',
            'variations' => [
                [
                    'sku' => 'VAR-IMG-1',
                    'price' => 110,
                    'stock' => 10,
                    'is_default' => 1,
                    'images' => [
                        'path/to/image1.jpg',
                        'path/to/image2.jpg'
                    ],
                    'image' => 'path/to/image1.jpg' // Frontend sends this too
                ]
            ]
        ];

        // 3. Send update request
        $response = $this->actingAs($this->user)
                         ->putJson(route('admin.products.update', ['product' => $product->id]), $data);

        // 4. Assert response status
        $response->assertStatus(200);

        // 5. Verify database
        // Find the child product
        $childProduct = Products::where('parent_id', $product->id)->first();
        $this->assertNotNull($childProduct);
        
        // Check images count and content
        $this->assertIsArray($childProduct->images);
        $this->assertCount(2, $childProduct->images);
        $this->assertEquals('path/to/image1.jpg', $childProduct->images[0]);
        $this->assertEquals('path/to/image2.jpg', $childProduct->images[1]);
        
        // Check main image
        $this->assertEquals('path/to/image1.jpg', $childProduct->image);
    }
}
