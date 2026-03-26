<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Exports\CategoryExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreCategoriesRequest;
use App\Http\Requests\Inventory\UpdateCategoriesRequest;
use App\Imports\CategoryImport;
use App\Models\Categories;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CategoriesController extends Controller
{
    public function export(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403, 'Company not set for this user.');
        }

        return Excel::download(new CategoryExport($companyId), 'categories.xlsx');
    }

    public function import(Request $request)
    {
        set_time_limit(300); // Increase time limit to 5 minutes for imports

        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return back()->withErrors(['error' => 'Company not set for this user.']);
        }

        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:5120',
        ]);

        try {
            Excel::import(new CategoryImport($companyId), $request->file('file'));

            return back()->with('success', 'Categories imported successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Error importing categories: '.$e->getMessage()]);
        }
    }

    public function index(Request $request)
    {
        $query = Categories::query()
            ->with('parent')
            ->withCount('products');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('category_code', 'like', "%{$search}%");
            });
        }

        $categories = $query->orderBy('order')->orderBy('name')->get();

        // 1. Get all valid IDs for orphan check
        $validIds = $categories->pluck('id')->flip();

        // 2. Group by parent_id with normalization
        $grouped = $categories->groupBy(function ($cat) use ($validIds) {
            $parentId = $cat->parent_id;

            // Normalize: null, "0", 0 -> 0
            if (is_null($parentId) || $parentId === 0 || $parentId === '0') {
                return 0;
            }

            // Cast to int
            $parentId = (int) $parentId;

            // Handle orphans: if parent_id refers to a non-existent ID, treat as root (0)
            if (! $validIds->has($parentId)) {
                return 0;
            }

            return $parentId;
        });

        // 3. Build recursive tree with cycle detection
        $categoryTree = $this->buildCategoryTree($grouped, 0);

        $parents = Categories::query()
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        if ($request->wantsJson()) {
            return response()->json([
                'categories' => $categories,
                'category_tree' => $categoryTree,
                'parents' => $parents,
            ]);
        }

        return Inertia::render('Backend/03-Inventory/Categories', [
            'categories' => $categories,
            'categoryTree' => $categoryTree,
            'parents' => $parents,
        ]);
    }

    protected function normalizeParentId($parentId): int
    {
        return $parentId ? (int) $parentId : 0;
    }

    protected function buildCategoryTree(Collection $groupedByParent, int $parentId = 0, array $visited = []): array
    {
        // 1. Get children for this parent
        $children = $groupedByParent->get($parentId, collect());

        // 2. Sort children by order, then name (optional, if query wasn't enough)
        $children = $children->sortBy([
            ['order', 'asc'],
            ['name', 'asc'],
        ]);

        return $children->map(function ($category) use ($groupedByParent, $visited) {
            $id = (int) $category->id;

            // 3. Prevent infinite recursion (cycle detection)
            if (in_array($id, $visited)) {
                return null; // Skip this branch to break cycle
            }

            // Add current ID to visited path
            $newVisited = array_merge($visited, [$id]);

            $data = $category->toArray();
            $data['products_count'] = $category->products_count ?? 0;

            // 4. Recursively build children
            $data['children'] = $this->buildCategoryTree($groupedByParent, $id, $newVisited);

            return $data;
        })
            ->filter() // Remove nulls from cycles
            ->values()
            ->all();
    }

    public function store(StoreCategoriesRequest $request)
    {
        try {
            DB::beginTransaction();

            // Auto-generate Category Code (e.g., 1001, 1002)
            $lastCategory = Categories::withTrashed()->orderBy('id', 'desc')->first();
            $nextCode = $lastCategory ? (intval($lastCategory->category_code) + 1) : 1001;

            $data = [
                'category_code' => $nextCode,
                'name' => $request->name,
                'slug' => $request->slug ?? \Illuminate\Support\Str::slug($request->name),
                'parent_id' => $request->parent_id ?: 0,
                'status' => $request->status,
                'order' => $request->order ?? 0,
                'description' => $request->description,
                'icon' => $request->icon,
                'is_featured' => $request->boolean('is_featured'),
                'is_default' => $request->boolean('is_default'),
                'author_id' => $request->author_id,
                'author_type' => $request->author_type,
            ];

            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('categories', 'public');
                $data['image'] = $path;
            } else {
                // Handle string path (Media Library) or null (no image)
                $data['image'] = $request->input('image');
            }

            $category = Categories::create($data);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Category created successfully', 'category' => $category], 201);
            }

            return redirect()->route('admin.inventory.categories.index')->with('success', 'Category created successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error creating category: '.$e->getMessage()], 500);
            }

            return back()->withErrors(['error' => 'Error creating category: '.$e->getMessage()]);
        }
    }

    public function update(UpdateCategoriesRequest $request, Categories $category)
    {
        try {
            $data = $request->validated();
            $data['parent_id'] = $data['parent_id'] ?: 0;

            if (empty($data['slug'])) {
                $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
            }

            if ($request->hasFile('image')) {
                // Delete old image if exists and is a local upload (not media library)
                if ($category->image && ! str_starts_with($category->image, 'media/')) {
                    Storage::disk('public')->delete($category->image);
                }
                $path = $request->file('image')->store('categories', 'public');
                $data['image'] = $path;
            } else {
                // Handle string path or null (clearing image)
                // Only update if the key is present in request (to avoid accidental clearing if not sent)
                if ($request->has('image')) {
                    $newImage = $request->input('image');

                    // If image is changing (or being removed) and old one was local, delete old
                    if ($category->image && $category->image !== $newImage && ! str_starts_with($category->image, 'media/')) {
                        Storage::disk('public')->delete($category->image);
                    }

                    $data['image'] = $newImage;
                }
            }

            $category->update($data);

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Category updated successfully', 'category' => $category]);
            }

            return redirect()->route('admin.inventory.categories.index')->with('success', 'Category updated successfully');

        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error updating category: '.$e->getMessage()], 500);
            }

            return back()->withErrors(['error' => 'Error updating category: '.$e->getMessage()]);
        }
    }

    public function destroy(Categories $category)
    {
        try {
            if ($category->children()->count() > 0) {
                if (request()->wantsJson()) {
                    return response()->json(['message' => 'Cannot delete category with sub-categories.'], 422);
                }

                return back()->withErrors(['error' => 'Cannot delete category with sub-categories.']);
            }

            $category->delete();

            // Delete image if it was a local upload
            if ($category->image && ! str_starts_with($category->image, 'media/')) {
                Storage::disk('public')->delete($category->image);
            }

            if (request()->wantsJson()) {
                return response()->json(['message' => 'Category deleted successfully']);
            }

            return redirect()->route('admin.inventory.categories.index')->with('success', 'Category deleted successfully');

        } catch (\Exception $e) {
            if (request()->wantsJson()) {
                return response()->json(['message' => 'Error deleting category: '.$e->getMessage()], 500);
            }

            return back()->withErrors(['error' => 'Error deleting category: '.$e->getMessage()]);
        }
    }
}
