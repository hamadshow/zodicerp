<?php

namespace App\Services;

use App\Models\Categories;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class CategoryService extends BaseService
{
    public function __construct(Categories $model)
    {
        parent::__construct($model);
    }

    /**
     * Get all categories with filters and pagination.
     */
    public function getAll(array $filters = [], int $perPage = 15, string $sortBy = 'created_at', string $sortDirection = 'desc'): LengthAwarePaginator
    {
        $query = Categories::query()->with(['parent', 'children']);

        // Apply filters
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('description', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('slug', 'like', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['parent_id'])) {
            $query->where('parent_id', $filters['parent_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Apply sorting
        $query->orderBy($sortBy, $sortDirection);

        return $query->paginate($perPage);
    }

    /**
     * Create a new category.
     */
    public function create(array $data): Model
    {
        return DB::transaction(function () use ($data) {
            // Generate slug if not provided
            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
                $originalSlug = $data['slug'];
                $counter = 1;

                // Ensure unique slug
                while (Categories::where('slug', $data['slug'])->exists()) {
                    $data['slug'] = $originalSlug . '-' . $counter;
                    $counter++;
                }
            }

            // Handle image upload
            if (isset($data['image']) && $data['image']) {
                $data['image'] = $data['image']->store('categories', 'public');
            }

            return Categories::create($data);
        });
    }

    /**
     * Update an existing category.
     */
    public function update(int $id, array $data): Model
    {
        $category = $this->findOrFail($id);

        return DB::transaction(function () use ($category, $data) {
            // Generate slug if not provided
            if (empty($data['slug']) && isset($data['name'])) {
                $data['slug'] = Str::slug($data['name']);
                $originalSlug = $data['slug'];
                $counter = 1;

                // Ensure unique slug
                while (Categories::where('slug', $data['slug'])->where('id', '!=', $category->id)->exists()) {
                    $data['slug'] = $originalSlug . '-' . $counter;
                    $counter++;
                }
            }

            // Handle image upload
            if (isset($data['image']) && $data['image']) {
                // Delete old image
                if ($category->image) {
                    Storage::disk('public')->delete($category->image);
                }
                $data['image'] = $data['image']->store('categories', 'public');
            }

            $category->update($data);
            return $category->fresh(['parent', 'children']);
        });
    }

    /**
     * Delete a category.
     */
    public function delete(int $id): bool
    {
        $category = $this->find($id);

        if (!$category) {
            return false;
        }

        return DB::transaction(function () use ($category) {
            // Move children to parent category
            if ($category->children()->exists()) {
                $category->children()->update(['parent_id' => $category->parent_id]);
            }

            // Delete image if exists
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }

            return $category->delete();
        });
    }

    /**
     * Get categories in tree structure.
     */
    public function getTree(bool $includeInactive = false): Collection
    {
        $query = Categories::query();

        if (!$includeInactive) {
            $query->where('status', 'active');
        }

        // Get categories with product count
        return $query->leftJoin('products', 'categories.id', '=', 'products.category_id')
                     ->selectRaw('categories.id, categories.name, COUNT(products.id) as count')
                     ->groupBy('categories.id', 'categories.name')
                     ->orderBy('categories.name')
                     ->get();
    }

    /**
     * Get category hierarchy path.
     */
    public function getHierarchyPath(int $categoryId): array
    {
        $category = $this->find($categoryId);
        $path = [];

        while ($category) {
            array_unshift($path, $category);
            $category = $category->parent;
        }

        return $path;
    }

    /**
     * Get all descendant categories.
     */
    public function getDescendants(int $categoryId): Collection
    {
        $category = $this->find($categoryId);

        if (!$category) {
            return collect();
        }

        return Categories::where('id', '!=', $categoryId)
                      ->where(function ($query) use ($category) {
                          $query->where('parent_id', $category->id)
                                ->orWhereIn('parent_id', function ($subQuery) use ($category) {
                                    $subQuery->select('id')
                                             ->from('categories')
                                             ->where('parent_id', $category->id);
                                });
                      })
                      ->get();
    }
}