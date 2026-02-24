<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ReproduceProduct22Issue extends TestCase
{
    public function test_reproduce_product_22_update()
    {
        // 1. Authenticate as admin
        $user = User::first(); // Assuming there's a user
        if (!$user) {
            $user = User::factory()->create();
        }
        $this->actingAs($user);

        // 2. Fetch product 22
        $product = Products::find(22);
        if (!$product) {
            $this->markTestSkipped('Product 22 not found.');
        }

        // 3. Prepare payload simulating frontend request
        // We want to add variations with images
        $payload = [
            'name' => $product->name,
            'status' => 'active',
            'product_type' => 'variable',
            'is_featured' => 1, // Try to set to 1
            'sku' => $product->sku,
            'stock_status' => 'in_stock',
            'save_action' => 'save',
            'variations' => [
                [
                    'sku' => 'VAR-TEST-22-A',
                    'price' => 100,
                    'stock' => 10,
                    'is_default' => 1,
                    // Simulate array of image paths (strings)
                    'images' => [
                        'media/test-image-1.jpg',
                        'media/test-image-2.jpg'
                    ],
                    'image' => 'media/test-image-1.jpg'
                ],
                [
                    'sku' => 'VAR-TEST-22-B',
                    'price' => 200,
                    'stock' => 20,
                    'is_default' => 0,
                    // Simulate empty images but single image set
                    'images' => [], 
                    'image' => 'media/test-image-3.jpg'
                ]
            ]
        ];

        // 4. Send POST request
        $response = $this->postJson(route('admin.products.update', $product->id), $payload);

        // 5. Assert Success
        if ($response->status() !== 200 && $response->status() !== 302) {
            dump($response->json());
        }
        // $response->assertStatus(200); // Or 302 redirect

        // 6. Verify Database
        $product->refresh();
        dump("Product is_featured: " . $product->is_featured);
        
        $children = Products::where('parent_id', $product->id)->get();
        dump("Children count: " . $children->count());

        foreach ($children as $child) {
            dump("Child {$child->sku}:");
            dump("  Image: " . $child->image);
            dump("  Images: " . json_encode($child->images));
        }
    }
}
