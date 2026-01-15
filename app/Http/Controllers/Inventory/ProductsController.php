<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Products;
use App\Models\Brands;
use App\Models\Categories;
use App\Http\Requests\Inventory\StoreProductsRequest;
use App\Http\Requests\Inventory\UpdateProductsRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Exception;
use Throwable;

class ProductsController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Products::with(['parent', 'brand', 'category']);

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('product_code', 'like', "%{$search}%")
                      ->orWhere('sku', 'like', "%{$search}%");
                });
            }

            // Filters
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }
            if ($request->has('brand_id') && $request->brand_id) {
                $query->where('brand_id', $request->brand_id);
            }
            if ($request->has('category_id') && $request->category_id) {
                $query->where('category_id', $request->category_id);
            }

            $products = $query->orderBy('order')->orderBy('name')->paginate(20)->withQueryString();

            // Data for dropdowns
            $parents = Products::select('id', 'name')->orderBy('name')->get();
            $brands = Brands::select('id', 'name')->where('status', 'active')->orderBy('name')->get();
            $categories = Categories::select('id', 'name')->where('status', 'active')->orderBy('name')->get();

            if ($request->wantsJson()) {
                return response()->json([
                    'products' => $products,
                    'parents' => $parents,
                    'brands' => $brands,
                    'categories' => $categories
                ]);
            }

            return Inertia::render('Backend/03-Inventory/Products', [
                'products' => $products,
                'parents' => $parents,
                'brands' => $brands,
                'categories' => $categories,
                'filters' => $request->only(['search', 'status', 'brand_id', 'category_id'])
            ]);
        } catch (Exception $e) {
            Log::error('Error retrieving products: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to retrieve products. Please try again later.'
                ], 500);
            }

            return Inertia::render('Backend/03-Inventory/Products', [
                'products' => collect([]),
                'parents' => collect([]),
                'brands' => collect([]),
                'categories' => collect([]),
                'filters' => $request->only(['search', 'status', 'brand_id', 'category_id']),
                'error' => 'Failed to retrieve products. Please try again later.'
            ])->with('error', 'Failed to retrieve products. Please try again later.');
        }
    }

    public function store(StoreProductsRequest $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(403, 'Unauthorized');
        }

        try {
            DB::beginTransaction();

            // Auto-generate Product Code
            $lastProductCode = Products::withTrashed()
                ->where('product_code', 'like', 'PRD-%')
                ->orderByRaw('CAST(SUBSTRING(product_code, 5) AS UNSIGNED) DESC')
                ->value('product_code');
            if ($lastProductCode) {
                $lastNumber = (int) substr($lastProductCode, 4);
                $nextNumber = $lastNumber + 1;
            } else {
                $nextNumber = 7001;
            }
            $productCode = 'PRD-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

            // Generate Slug
            $slug = Str::slug($request->name);
            $count = Products::where('slug', 'LIKE', "{$slug}%")->count();
            if ($count > 0) {
                $slug .= '-' . ($count + 1);
            }

            $data = $request->validated();
            $data['product_code'] = $productCode;
            $data['slug'] = $slug;
            $data['created_by_id'] = $user->id;
            $data['created_by_type'] = get_class($user);

            // Handle Main Image
            if ($request->hasFile('image')) {
                $image = $request->file('image');

                // Validate image file
                if (!$this->validateImageFile($image)) {
                    throw new Exception('Invalid image file provided.');
                }

                $data['image'] = $image->store('products/images', 'public');
            } elseif ($request->filled('image')) {
                $data['image'] = $request->input('image');
            }

            // Handle Gallery Images
            $galleryImages = [];
            
            // 1. Uploaded files
            if ($request->hasFile('gallery')) {
                foreach ($request->file('gallery') as $file) {
                    if ($this->validateImageFile($file)) {
                        $galleryImages[] = $file->store('products/gallery', 'public');
                    } else {
                        throw new Exception('One or more gallery images are invalid.');
                    }
                }
            }
            
            // 2. Existing paths or Media Library paths
            if ($request->filled('gallery') && is_array($request->input('gallery'))) {
                foreach ($request->input('gallery') as $item) {
                    if (is_string($item)) {
                        $galleryImages[] = $item;
                    }
                }
            }
            
            if (!empty($galleryImages)) {
                $data['images'] = $galleryImages;
            }

            $product = Products::create($data);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Product created successfully.',
                    'product' => $product
                ], 201);
            }

            return redirect()->route('admin.products.index')
                ->with('success', 'Product created successfully.');
        } catch (ValidationException $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json([
                    'errors' => $e->errors()
                ], 422);
            }

            return back()->withErrors($e->errors())->withInput();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Product creation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to create product. Please try again later.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to create product. Please try again later.'])->withInput();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Unexpected error during product creation: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'An unexpected error occurred. Please try again later.'
                ], 500);
            }

            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again later.'])->withInput();
        }
    }

    public function update(UpdateProductsRequest $request, Products $product)
    {
        $user = Auth::user();
        if (!$user) {
            abort(403, 'Unauthorized');
        }

        try {
            DB::beginTransaction();

            $data = $request->validated();
            $data['updated_by_id'] = $user->id;
            $data['updated_by_type'] = get_class($user);

            // Update slug if name changed and slug not manually provided (optional logic, sticking to auto for now)
            if ($product->name !== $request->name) {
                 $slug = Str::slug($request->name);
                 if ($slug !== $product->slug) {
                     $count = Products::where('slug', 'LIKE', "{$slug}%")->where('id', '!=', $product->id)->count();
                     if ($count > 0) {
                         $slug .= '-' . ($count + 1);
                     }
                     $data['slug'] = $slug;
                 }
            }

            // Handle Main Image
            if ($request->hasFile('image')) {
                $image = $request->file('image');

                // Validate image file
                if (!$this->validateImageFile($image)) {
                    throw new Exception('Invalid image file provided.');
                }

                // Delete old image
                if ($product->image && Storage::disk('public')->exists($product->image)) {
                    Storage::disk('public')->delete($product->image);
                }
                $data['image'] = $image->store('products/images', 'public');
            } elseif ($request->filled('image')) {
                // Update with new path (e.g. from Media Library)
                // We don't delete the old image automatically here as it might be shared or from library
                // unless we implement strict ownership checks.
                $data['image'] = $request->input('image');
            } elseif (isset($data['delete_image']) && $data['delete_image']) {
                 if ($product->image && Storage::disk('public')->exists($product->image)) {
                    Storage::disk('public')->delete($product->image);
                }
                $data['image'] = null;
            }

            // Handle Gallery Images
            // 1. Existing images (filtered by frontend)
            $currentImages = $product->images ?? [];
            $keptImages = $request->input('existing_images', []); // Expecting array of paths

            // Identify deleted images to remove from disk
            // CAUTION: If we remove an image that is from Media Library, we shouldn't delete the file.
            // Only delete if it was in 'products/gallery' (uploaded for this product).
            $deletedImages = array_diff($currentImages, $keptImages);
            foreach ($deletedImages as $img) {
                if (str_starts_with($img, 'products/gallery') && Storage::disk('public')->exists($img)) {
                    Storage::disk('public')->delete($img);
                }
            }

            // 2. New uploaded images
            $newImages = [];
            if ($request->hasFile('gallery')) {
                foreach ($request->file('gallery') as $file) {
                    if ($this->validateImageFile($file)) {
                        $newImages[] = $file->store('products/gallery', 'public');
                    } else {
                        throw new Exception('One or more gallery images are invalid.');
                    }
                }
            }
            
            // 3. New Media Library selections (strings in gallery)
            if ($request->filled('gallery') && is_array($request->input('gallery'))) {
                foreach ($request->input('gallery') as $item) {
                    if (is_string($item)) {
                        $newImages[] = $item;
                    }
                }
            }

            // Combine kept and new
            $data['images'] = array_merge($keptImages, $newImages);

            $product->update($data);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Product updated successfully.',
                    'product' => $product
                ], 200);
            }

            return redirect()->route('admin.products.index')
                ->with('success', 'Product updated successfully.');
        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            Log::error('Product not found for update: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Product not found.'
                ], 404);
            }

            return back()->withErrors(['error' => 'Product not found.']);
        } catch (ValidationException $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json([
                    'errors' => $e->errors()
                ], 422);
            }

            return back()->withErrors($e->errors())->withInput();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Product update failed: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to update product. Please try again later.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to update product. Please try again later.'])->withInput();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Unexpected error during product update: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'An unexpected error occurred. Please try again later.'
                ], 500);
            }

            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again later.'])->withInput();
        }
    }

    public function destroy(Products $product)
    {
        try {
            if ($product->children()->count() > 0) {
                if (request()->wantsJson()) {
                    return response()->json([
                        'error' => 'Cannot delete product with sub-products.'
                    ], 400);
                }
                return back()->withErrors(['error' => 'Cannot delete product with sub-products.']);
            }

            // Delete associated images
            if ($product->image && Storage::disk('public')->exists($product->image)) {
                Storage::disk('public')->delete($product->image);
            }

            if ($product->images) {
                foreach ($product->images as $image) {
                    if (Storage::disk('public')->exists($image)) {
                        Storage::disk('public')->delete($image);
                    }
                }
            }

            $product->delete();

            if (request()->wantsJson()) {
                return response()->json([
                    'message' => 'Product deleted successfully.'
                ], 200);
            }

            return redirect()->route('admin.products.index')
                ->with('success', 'Product deleted successfully.');
        } catch (ModelNotFoundException $e) {
            Log::error('Product not found for deletion: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'user_id' => Auth::id()
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'Product not found.'
                ], 404);
            }

            return back()->withErrors(['error' => 'Product not found.']);
        } catch (Exception $e) {
            Log::error('Product deletion failed: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to delete product. Please try again later.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to delete product. Please try again later.']);
        } catch (Throwable $e) {
            Log::error('Unexpected error during product deletion: ' . $e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'An unexpected error occurred. Please try again later.'
                ], 500);
            }

            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again later.']);
        }
    }

    /**
     * Validate image file
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @return bool
     */
    private function validateImageFile($file): bool
    {
        if (!$file->isValid()) {
            return false;
        }

        // Check file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return false;
        }

        // Check file extension
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array(strtolower($file->getClientOriginalExtension()), $allowedExtensions)) {
            return false;
        }

        return true;
    }
}
