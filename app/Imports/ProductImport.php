<?php

namespace App\Imports;

use App\Models\Brands;
use App\Models\Categories;
use App\Models\ItemUnit;
use App\Models\Products;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class ProductImport implements ToModel, WithBatchInserts, WithChunkReading, WithHeadingRow, WithValidation
{
    protected $companyId;

    protected $lastProductCode;

    public function __construct($companyId)
    {
        $this->companyId = $companyId;
        // Logic to determine starting product code if needed
        // For products, usually they have unique codes.
    }

    public function model(array $row)
    {
        $code = $row['product_code'] ?? null;

        // If code exists, update? Or skip?
        // For now, let's assume create new or update if exists based on code/SKU.
        // But ToModel is usually for inserts.
        // Let's do a check.

        $product = Products::withTrashed()->where('product_code', $code)->first();

        // Handle Unit
        $unitId = null;
        if (! empty($row['unit'])) {
            $unitName = trim((string) $row['unit']);
            $unit = ItemUnit::query()->where('name', $unitName)->where('company_id', $this->companyId)->first();
            if (! $unit) {
                $unit = ItemUnit::create([
                    'name' => $unitName,
                    'unit_type' => 1, // Main unit
                    'active' => true,
                    'company_id' => $this->companyId,
                ]);
            }
            $unitId = $unit->id;
        }

        // Handle Brand
        $brandId = null;
        if (! empty($row['brand'])) {
            $brandName = trim((string) $row['brand']);
            $brand = Brands::query()->where('name', $brandName)->first();
            if (! $brand) {
                $attributes = [
                    'brand_code' => 'BRN-'.strtoupper(Str::random(8)),
                    'name' => $brandName,
                    'status' => 'active',
                    'order' => 0,
                ];
                static $hasBrandCompanyColumn = null;
                if ($hasBrandCompanyColumn === null) {
                    $hasBrandCompanyColumn = Schema::hasColumn('brands', 'company_id');
                }
                if ($hasBrandCompanyColumn) {
                    $attributes['company_id'] = $this->companyId;
                }
                $brand = Brands::create($attributes);
            }
            $brandId = $brand->id;
        }

        $baseSlug = $row['slug'] ?? Str::slug($row['name'] ?? ($code ?? 'product'));
        $baseSlug = $baseSlug ?: Str::slug($code ?? 'product');
        $slug = $baseSlug;
        $slugIndex = 1;
        while (
            Products::withTrashed()
                ->where('slug', $slug)
                ->when($product, fn ($q) => $q->where('id', '!=', $product->id))
                ->exists()
        ) {
            $slug = "{$baseSlug}-{$slugIndex}";
            $slugIndex++;
        }

        $data = [
            'product_code' => $code ?? ('PROD-'.Str::random(8)), // Fallback
            'name' => $row['name'],
            'slug' => $slug,
            'sku' => ! empty($row['sku']) ? $row['sku'] : null,
            'description' => $row['description'] ?? null,
            'price' => ! empty($row['price']) ? (float) $row['price'] : 0,
            'sale_price' => ! empty($row['sale_price']) ? (float) $row['sale_price'] : null,
            'cost_price' => ! empty($row['cost_price']) ? (float) $row['cost_price'] : 0,
            'quantity' => ! empty($row['quantity']) ? (int) $row['quantity'] : 0,
            'unit_id' => $unitId,
            'status' => $row['status'] ?? 'active',
            'brand_id' => $brandId,
            'is_featured' => strtolower($row['is_featured'] ?? '') === 'yes',
            'is_default' => strtolower($row['is_default'] ?? '') === 'yes',
            'order' => ! empty($row['order']) ? (int) $row['order'] : 0,
            'company_id' => $this->companyId,
        ];

        if ($product) {
            if (method_exists($product, 'trashed') && $product->trashed()) {
                $product->restore();
            }
            $product->update($data);
        } else {
            $product = Products::create($data);
        }

        // Handle Categories
        if (! empty($row['categories'])) {
            $categoryNames = explode(',', $row['categories']);
            $categoryIds = [];

            foreach ($categoryNames as $name) {
                $name = trim($name);
                if (! $name) {
                    continue;
                }

                // Find category by name
                $category = Categories::where('name', $name)
                    ->where('company_id', $this->companyId)
                    ->first();

                if ($category) {
                    $categoryIds[] = $category->id;
                }
            }

            if (! empty($categoryIds)) {
                $product->categories()->sync($categoryIds);
            }
        }

        return null;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            // 'product_code' => 'required|unique:products,product_code', // Can't enforce unique if updating
        ];
    }

    public function batchSize(): int
    {
        return 1000;
    }

    public function chunkSize(): int
    {
        return 1000;
    }
}
