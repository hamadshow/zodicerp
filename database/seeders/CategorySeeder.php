<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Categories;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if categories already exist to prevent duplicates if run multiple times
        if (Categories::count() > 0) {
            return;
        }

        $categories = [
            'Exclusive offers' => ['Limited Time', 'Bundle Deals', 'Clearance'],
            'Fashion and style' => ['Men', 'Women', 'Kids', 'Accessories'],
            'Health and Beauty' => ['Makeup', 'Fragrance', 'Personal Care'],
            'Skin care' => ['Moisturizers', 'Cleansers', 'Sunscreen', 'Treatments'],
            'Hair care' => ['Shampoo', 'Conditioner', 'Styling', 'Tools'],
        ];

        $order = 0;
        foreach ($categories as $parentName => $subcategories) {
            $parent = Categories::create([
                'category_code' => 1000 + $order,
                'name' => $parentName,
                'slug' => Str::slug($parentName),
                'status' => 'active',
                'order' => $order++,
                'is_featured' => true,
            ]);

            $subOrder = 0;
            foreach ($subcategories as $subName) {
                Categories::create([
                    'category_code' => 10000 + ($order * 100) + $subOrder,
                    'name' => $subName,
                    'slug' => Str::slug($subName),
                    'parent_id' => $parent->id,
                    'status' => 'active',
                    'order' => $subOrder++,
                ]);
            }
        }
    }
}
