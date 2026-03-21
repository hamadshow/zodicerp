<?php

namespace Database\Seeders;

use App\Models\Brands;
use App\Models\Categories;
use App\Models\ItemAttribute;
use App\Models\ItemAttributeDetail;
use App\Models\Products;
use App\Models\ProductVariation;
use App\Models\ProductVariationItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductTestSeeder extends Seeder
{
    public function run()
    {
        DB::transaction(function () {
            // 1. Create Attributes
            $sizeAttr = ItemAttribute::firstOrCreate(
                ['slug' => 'size'],
                [
                    'title' => 'Size',
                    'status' => 'published',
                    'display_layout' => 'dropdown',
                    'is_searchable' => true,
                    'is_comparable' => true,
                    'is_use_in_product_listing' => true,
                    'order' => 0,
                ]
            );

            $sizes = ['Small', 'Medium', 'Large'];
            $sizeDetails = [];
            foreach ($sizes as $size) {
                $sizeDetails[$size] = ItemAttributeDetail::firstOrCreate(
                    ['attribute_set_id' => $sizeAttr->id, 'slug' => Str::slug($size)],
                    ['title' => $size, 'order' => 0]
                );
            }

            $colorAttr = ItemAttribute::firstOrCreate(
                ['slug' => 'color'],
                [
                    'title' => 'Color',
                    'status' => 'published',
                    'display_layout' => 'visual',
                    'is_searchable' => true,
                    'is_comparable' => true,
                    'is_use_in_product_listing' => true,
                    'order' => 1,
                ]
            );

            $colors = ['Red', 'Blue'];
            $colorDetails = [];
            foreach ($colors as $color) {
                $colorDetails[$color] = ItemAttributeDetail::firstOrCreate(
                    ['attribute_set_id' => $colorAttr->id, 'slug' => Str::slug($color)],
                    ['title' => $color, 'color' => $color === 'Red' ? '#FF0000' : '#0000FF', 'order' => 0]
                );
            }

            // 2. Create Category & Brand
            $category = Categories::firstOrCreate(
                ['slug' => 'test-category'],
                [
                    'name' => 'Test Category',
                    'status' => 'active',
                    'order' => 999,
                    'category_code' => 'TEST-CAT-001',
                ]
            );

            $brand = Brands::firstOrCreate(
                ['brand_code' => 'TEST-BRAND-001'],
                ['name' => 'Test Brand', 'status' => 'active', 'order' => 999]
            );

            // 3. Create Simple Product
            $simpleProduct = Products::updateOrCreate(
                ['sku' => 'TEST-SIMPLE-001'],
                [
                    'name' => 'Test Simple Product',
                    'slug' => 'test-simple-product',
                    'product_code' => 'PRD-TEST-001',
                    'product_type' => 'simple',
                    'status' => 'active',
                    'price' => 100.00,
                    'sale_price' => 90.00,
                    'quantity' => 50,
                    'stock_status' => 'in_stock',
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'description' => 'This is a test simple product.',
                    'content' => 'Full description of the simple product.',
                    'is_variation' => false,
                    'image' => 'products/images/test-simple.jpg', // Dummy path
                ]
            );
            $this->command->info("Simple Product Created: {$simpleProduct->name} (ID: {$simpleProduct->id})");

            // 4. Create Variable Product
            $variableProduct = Products::updateOrCreate(
                ['sku' => 'TEST-VAR-001'],
                [
                    'name' => 'Test Variable Product',
                    'slug' => 'test-variable-product',
                    'product_code' => 'PRD-TEST-002',
                    'product_type' => 'variable',
                    'status' => 'active',
                    'price' => 200.00, // Base price
                    'quantity' => 100,
                    'stock_status' => 'in_stock',
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'description' => 'This is a test variable product with Color and Size.',
                    'content' => 'Full description of the variable product.',
                    'is_variation' => true,
                    'image' => 'products/images/test-variable-main.jpg', // Dummy path
                ]
            );

            // Delete existing variations to reset
            $variableProduct->variations()->delete();

            // Create Variations
            $variationsData = [
                [
                    'sku' => 'TEST-VAR-RED-S',
                    'price' => 210.00,
                    'stock' => 10,
                    'is_default' => true,
                    'image' => 'products/variations/red-small.jpg',
                    'attributes' => [
                        ['id' => $colorAttr->id, 'value' => $colorDetails['Red']->id],
                        ['id' => $sizeAttr->id, 'value' => $sizeDetails['Small']->id],
                    ],
                ],
                [
                    'sku' => 'TEST-VAR-RED-M',
                    'price' => 220.00,
                    'stock' => 15,
                    'is_default' => false,
                    'image' => 'products/variations/red-medium.jpg',
                    'attributes' => [
                        ['id' => $colorAttr->id, 'value' => $colorDetails['Red']->id],
                        ['id' => $sizeAttr->id, 'value' => $sizeDetails['Medium']->id],
                    ],
                ],
                [
                    'sku' => 'TEST-VAR-BLUE-S',
                    'price' => 215.00,
                    'stock' => 20,
                    'is_default' => false,
                    'image' => 'products/variations/blue-small.jpg',
                    'attributes' => [
                        ['id' => $colorAttr->id, 'value' => $colorDetails['Blue']->id],
                        ['id' => $sizeAttr->id, 'value' => $sizeDetails['Small']->id],
                    ],
                ],
            ];

            foreach ($variationsData as $vData) {
                $childProduct = Products::create([
                    'product_code' => $vData['sku'],
                    'name' => $variableProduct->name,
                    'slug' => $variableProduct->slug.'-'.strtolower(str_replace(' ', '-', $vData['sku'])),
                    'description' => $variableProduct->description,
                    'content' => $variableProduct->content,
                    'status' => $variableProduct->status,
                    'images' => $variableProduct->images,
                    'image' => $vData['image'],
                    'video_media' => $variableProduct->video_media,
                    'sku' => $vData['sku'],
                    'barcode' => $variableProduct->barcode,
                    'parent_id' => $variableProduct->id,
                    'brand_id' => $variableProduct->brand_id,
                    'category_id' => $variableProduct->category_id,
                    'store_id' => $variableProduct->store_id,
                    'order' => $variableProduct->order,
                    'views' => 0,
                    'quantity' => $vData['stock'],
                    'stock_status' => 'in_stock',
                    'allow_checkout_when_out_of_stock' => $variableProduct->allow_checkout_when_out_of_stock,
                    'with_storehouse_management' => $variableProduct->with_storehouse_management,
                    'minimum_order_quantity' => $variableProduct->minimum_order_quantity,
                    'maximum_order_quantity' => $variableProduct->maximum_order_quantity,
                    'cost_per_item' => $variableProduct->cost_per_item,
                    'price' => $vData['price'],
                    'sale_price' => $variableProduct->sale_price,
                    'sale_type' => $variableProduct->sale_type,
                    'start_date' => $variableProduct->start_date,
                    'end_date' => $variableProduct->end_date,
                    'price_includes_tax' => $variableProduct->price_includes_tax,
                    'tax_id' => $variableProduct->tax_id,
                    'product_type' => 'simple',
                    'is_featured' => $variableProduct->is_featured,
                    'is_variation' => false,
                    'variations_count' => 0,
                    'length' => $variableProduct->length,
                    'wide' => $variableProduct->wide,
                    'height' => $variableProduct->height,
                    'weight' => $variableProduct->weight,
                    'reviews_count' => 0,
                    'reviews_avg' => 0,
                    'meta_title' => $variableProduct->meta_title,
                    'meta_description' => $variableProduct->meta_description,
                    'generate_license_code' => $variableProduct->generate_license_code,
                    'license_code_type' => $variableProduct->license_code_type,
                    'notify_attachment_updated' => $variableProduct->notify_attachment_updated,
                    'specification_table_id' => $variableProduct->specification_table_id,
                    'approved_by' => $variableProduct->approved_by,
                    'created_by_id' => $variableProduct->created_by_id,
                    'created_by_type' => $variableProduct->created_by_type,
                    'updated_by_id' => $variableProduct->updated_by_id,
                    'updated_by_type' => $variableProduct->updated_by_type,
                ]);

                $variation = ProductVariation::create([
                    'product_id' => $childProduct->id,
                    'configurable_product_id' => $variableProduct->id,
                    'is_default' => $vData['is_default'],
                ]);

                foreach ($vData['attributes'] as $attr) {
                    ProductVariationItem::create([
                        'variation_id' => $variation->id,
                        'attribute_id' => $attr['id'],
                        'attribute_value' => $attr['value'],
                    ]);
                }
            }

            $variableProduct->update(['variations_count' => count($variationsData)]);
            $this->command->info("Variable Product Created: {$variableProduct->name} (ID: {$variableProduct->id}) with ".count($variationsData).' variations.');
        });
    }
}
