<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Categories;
use App\Http\Requests\Inventory\StoreCategoriesRequest;
use App\Http\Requests\Inventory\UpdateCategoriesRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CategoriesController extends Controller
{
    public function index(Request $request)
    {
        $query = Categories::with('parent')->withCount('products');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('category_code', 'like', "%{$search}%");
            });
        }

        // Get all categories for the list
        $categories = $query->orderBy('order')->orderBy('name')->get();

        // Get potential parents (all categories)
        $parents = Categories::select('id', 'name')->orderBy('name')->get();

        if ($request->wantsJson()) {
            return response()->json([
                'categories' => $categories,
                'parents' => $parents
            ]);
        }

        return Inertia::render('Backend/03-Inventory/Categories', [
            'categories' => $categories,
            'parents' => $parents,
        ]);
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
                'parent_id' => $request->parent_id,
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

            return redirect()->route('admin.categories.index')->with('success', 'Category created successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error creating category: ' . $e->getMessage()], 500);
            }
            return back()->withErrors(['error' => 'Error creating category: ' . $e->getMessage()]);
        }
    }

    public function update(UpdateCategoriesRequest $request, Categories $category)
    {
        try {
            $data = $request->validated();
            
            if (empty($data['slug'])) {
                $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
            }

            if ($request->hasFile('image')) {
                // Delete old image if exists and is a local upload (not media library)
                if ($category->image && !str_starts_with($category->image, 'media/')) {
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
                     if ($category->image && $category->image !== $newImage && !str_starts_with($category->image, 'media/')) {
                         Storage::disk('public')->delete($category->image);
                     }
                     
                     $data['image'] = $newImage;
                }
            }

            $category->update($data);

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Category updated successfully', 'category' => $category]);
            }

            return redirect()->route('admin.categories.index')->with('success', 'Category updated successfully');

        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error updating category: ' . $e->getMessage()], 500);
            }
            return back()->withErrors(['error' => 'Error updating category: ' . $e->getMessage()]);
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
            if ($category->image && !str_starts_with($category->image, 'media/')) {
                Storage::disk('public')->delete($category->image);
            }

            if (request()->wantsJson()) {
                return response()->json(['message' => 'Category deleted successfully']);
            }

            return redirect()->route('admin.categories.index')->with('success', 'Category deleted successfully');

        } catch (\Exception $e) {
            if (request()->wantsJson()) {
                return response()->json(['message' => 'Error deleting category: ' . $e->getMessage()], 500);
            }
            return back()->withErrors(['error' => 'Error deleting category: ' . $e->getMessage()]);
        }
    }
}
