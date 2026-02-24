<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Products;
use App\Models\User;
use App\Http\Controllers\Inventory\ProductsController;
use App\Http\Requests\Inventory\UpdateProductsRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TestProduct22 extends Command
{
    protected $signature = 'test:product22';
    protected $description = 'Test Product 22 update logic';

    public function handle()
    {
        $this->info('Starting Product 22 Test...');

        // 1. Authenticate
        $user = User::first();
        if (!$user) {
            $this->error('No user found.');
            return 1;
        }
        $this->info("User: {$user->email}");
        Auth::login($user);

        // 2. Fetch product
        $product = Products::find(22);
        if (!$product) {
            $this->error('Product 22 not found.');
            return 1;
        }
        $this->info("Product: {$product->name} (ID: {$product->id})");
        $this->info("Current is_featured: " . ($product->is_featured ? 'true' : 'false'));

        // 3. Prepare Request Data
        $payload = [
            'name' => $product->name, // Keep name
            'status' => 'active',
            'product_type' => 'variable',
            'is_featured' => 1, // FORCE TRUE
            'sku' => $product->sku,
            'stock_status' => 'in_stock',
            'save_action' => 'save',
            'variations' => [
                [
                    'sku' => 'VAR-TEST-22-A',
                    'price' => 100,
                    'stock' => 10,
                    'is_default' => 1,
                    'images' => [
                        'products/variations/test1.jpg',
                        'products/variations/test2.jpg'
                    ],
                    'image' => 'products/variations/test1.jpg'
                ],
                [
                    'sku' => 'VAR-TEST-22-B',
                    'price' => 200,
                    'stock' => 20,
                    'is_default' => 0,
                    'images' => [], // Empty images
                    'image' => 'products/variations/test3.jpg'
                ]
            ]
        ];

        // 4. Create Request
        $request = UpdateProductsRequest::create(
            '/admin/products/' . $product->id,
            'POST',
            $payload
        );
        
        // Bind request to container
        app()->instance('request', $request);

        // Manually set route resolver for validation
        $request->setRouteResolver(function () use ($product) {
            $route = new \Illuminate\Routing\Route(['POST'], 'admin/products/{product}', []);
            $route->bind(request());
            $route->setParameter('product', $product);
            return $route;
        });

        // 5. Run Controller Update
        $controller = new ProductsController();
        try {
            // We need to validate manually because we are bypassing the router's validation middleware
            // But validation is done inside the controller method via type-hinted FormRequest?
            // No, FormRequest validation happens before controller method is called if routed.
            // If calling manually, we must validate manually OR just pass valid data if we trust it.
            // However, ProductsController::update type-hints UpdateProductsRequest.
            // Laravel's container resolves it and calls validateResolved().
            
            // To simulate exactly what happens, we should resolve the request validation.
            $request->setContainer(app());
            $request->setRedirector(app('redirect'));
            $request->validateResolved();

            $this->info('Validation passed.');

            $controller->update($request, $product);
            $this->info('Update executed.');

        } catch (\Exception $e) {
            $this->error('Exception: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }

        // 6. Verify Results
        $product->refresh();
        $this->info("New is_featured: " . ($product->is_featured ? 'true' : 'false'));

        $children = Products::where('parent_id', $product->id)->get();
        $this->info("Children count: " . $children->count());

        foreach ($children as $child) {
            $this->info("Child SKU: {$child->sku}");
            $this->info("  is_featured: " . ($child->is_featured ? 'true' : 'false'));
            $this->info("  Images Count: " . (is_array($child->images) ? count($child->images) : 0));
            $this->info("  Images Data: " . json_encode($child->images));
            $this->info("  Main Image: " . $child->image);
        }

        return 0;
    }
}
