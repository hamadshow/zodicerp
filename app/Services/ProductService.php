<?php

namespace App\Services;

use App\Models\Products;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class ProductService extends BaseService
{
    public function __construct(Products $product)
    {
        parent::__construct($product);
    }

    /**
     * Create product with image handling
     */
    public function createProduct(array $data): Model
    {
        // Generate slug if not provided
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Handle image upload
        if (isset($data['image']) && $data['image']) {
            $data['image'] = $this->handleImageUpload($data['image']);
        }

        return $this->create($data);
    }

    /**
     * Update product with image handling
     */
    public function updateProduct(int $id, array $data): Model
    {
        // Generate slug if not provided
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Handle image upload
        if (isset($data['image']) && $data['image']) {
            $data['image'] = $this->handleImageUpload($data['image']);
        }

        return $this->update($id, $data);
    }

    /**
     * Handle image upload
     */
    private function handleImageUpload($image): string
    {
        $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
        return $image->storeAs('products', $filename, 'public');
    }

    /**
     * Get products with categories
     */
    public function getProductsWithCategories(int $perPage = 15)
    {
        return $this->model->with('category')->paginate($perPage);
    }

    /**
     * Search products
     */
    public function searchProducts(array $filters = [], int $perPage = 15)
    {
        $query = $this->model->query()->with('category');

        if (!empty($filters['name'])) {
            $query->where('name', 'like', "%{$filters['name']}%");
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['price_min'])) {
            $query->where('price', '>=', $filters['price_min']);
        }

        if (!empty($filters['price_max'])) {
            $query->where('price', '<=', $filters['price_max']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get product dashboard stats
     */
    public function getDashboardStats(): array
    {
        return [
            'total_products' => $this->model->count(),
            'active_products' => $this->model->where('status', 'active')->count(),
            'out_of_stock' => $this->model->where('quantity', 0)->count(),
            'low_stock' => $this->model->where('quantity', '<=', 10)->where('quantity', '>', 0)->count(),
            'total_value' => $this->model->sum(\DB::raw('price * quantity')),
            'products_by_category' => $this->model->with('category')->get()->groupBy(function ($product) {
                return $product->category->name ?? 'Uncategorized';
            })->map->count(),
        ];
    }

    /**
     * Update stock
     */
    public function updateStock(int $id, int $quantity, string $operation = 'set'): Model
    {
        $product = $this->findOrFail($id);

        switch ($operation) {
            case 'add':
                $product->increment('quantity', $quantity);
                break;
            case 'subtract':
                $product->decrement('quantity', $quantity);
                break;
            default:
                $product->update(['quantity' => $quantity]);
        }

        return $product->fresh();
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(array $ids, string $status): int
    {
        return $this->model->whereIn('id', $ids)->update(['status' => $status]);
    }
}