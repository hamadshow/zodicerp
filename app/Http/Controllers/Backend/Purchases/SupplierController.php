<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Vendor_Purchases\SupplierAddress;
use App\Models\Vendor_Purchases\SupplierContact;
use App\Models\Vendor_Purchases\SupplierOpeningBalance;
use App\Models\Vendor_Purchases\SupplierGroup;
use App\Models\Country;
use App\Models\City;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Http\Requests\Purchases\StoreSupplierRequest;
use App\Http\Requests\Purchases\UpdateSupplierRequest;
use App\Models\Products;
use App\Models\Client_Sales\SalesOrder;
use App\Models\Client_Sales\SalesOrderDetail;
use App\Models\Brands;
use App\Models\Categories;
use App\Models\ItemAttribute;
use App\Http\Requests\Inventory\StoreProductsRequest;
use App\Http\Requests\Inventory\UpdateProductsRequest;
use App\Models\ProductVariation;
use App\Models\ProductVariationItem;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Exception;
use Throwable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SupplierController extends Controller
{
    public function dashboard()
    {
        $supplier = Auth::guard('supplier')->user();
        
        if (!$supplier) {
            // This should ideally be handled by middleware, but for safety:
             return redirect()->route('supplier.login');
        }

        // Stats
        $totalProducts = Products::where('supplier_code', $supplier->supplier_code)->count();

        // Get order details for this supplier's products
        $supplierOrderDetailsQuery = SalesOrderDetail::whereHas('product', function($q) use ($supplier) {
            $q->where('supplier_code', $supplier->supplier_code);
        });

        // Clone query for revenue calculation
        $totalRevenue = (clone $supplierOrderDetailsQuery)->sum('line_total');
        
        // Get unique order IDs
        $orderIds = (clone $supplierOrderDetailsQuery)->pluck('order_id')->unique();
        $totalOrders = $orderIds->count();

        // Pending and Completed Orders
        $pendingOrders = SalesOrder::whereIn('id', $orderIds)->where('status', 'pending')->count();
        $completedOrders = SalesOrder::whereIn('id', $orderIds)->where('status', 'completed')->count();

        // Recent Orders
        $recentOrders = SalesOrder::whereIn('id', $orderIds)
            ->with(['details' => function($q) use ($supplier) {
                $q->whereHas('product', function($sq) use ($supplier) {
                    $sq->where('supplier_code', $supplier->supplier_code);
                })->with('product');
            }])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function($order) {
                $supplierDetails = $order->details;
                $supplierAmount = $supplierDetails->sum('line_total');
                // Access name via translation or direct property depending on model
                $firstProduct = $supplierDetails->first()?->product?->name ?? 'Product';
                $moreCount = $supplierDetails->count() - 1;
                $productName = $moreCount > 0 ? "$firstProduct + $moreCount more" : $firstProduct;

                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'date' => $order->created_at->format('Y-m-d'),
                    'status' => ucfirst($order->status),
                    'amount' => number_format($supplierAmount, 2),
                    'product_name' => $productName,
                ];
            });

        return Inertia::render('Suppliers/Backend/Dashboard', [
            'stats' => [
                'total_products' => $totalProducts,
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'completed_orders' => $completedOrders,
                'total_revenue' => number_format($totalRevenue, 2),
            ],
            'recentOrders' => $recentOrders,
        ]);
    }

    public function products(Request $request)
    {
        $supplier = Auth::guard('supplier')->user();
        
        $query = Products::with(['parent', 'brand', 'categories'])
            ->where('supplier_code', $supplier->supplier_code)
            ->whereNull('parent_id');

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
            $query->whereHas('categories', function ($q) use ($request) {
                $q->where('categories.id', $request->category_id);
            });
        }

        $products = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        $brands = Brands::select('id', 'name')->where('status', 'active')->orderBy('name')->get();
        $categories = Categories::select('id', 'name', 'parent_id')->where('status', 'active')->orderBy('order')->orderBy('name')->get();

        return Inertia::render('Suppliers/Backend/Products', [
            'products' => $products,
            'filters' => $request->only(['search', 'status', 'brand_id', 'category_id']),
            'brands' => $brands,
            'categories' => $categories,
        ]);
    }

    public function createProduct()
    {
        $supplier = Auth::guard('supplier')->user();
        
        $brands = Brands::select('id', 'name')->where('status', 'active')->orderBy('name')->get();
        $categories = Categories::select('id', 'name', 'parent_id')->where('status', 'active')->orderBy('order')->orderBy('name')->get();
        $itemAttributes = ItemAttribute::with(['details' => function ($query) {
            $query->select('id', 'attribute_set_id', 'title')->orderBy('order')->orderBy('title');
        }])
            ->select('id', 'title')
            ->where('status', 'published')
            ->orderBy('order')
            ->orderBy('title')
            ->get();

        return Inertia::render('Suppliers/Backend/Products', [
            'product' => null,
            'brands' => $brands,
            'categories' => $categories,
            'itemAttributes' => $itemAttributes,
        ]);
    }

    public function storeProduct(StoreProductsRequest $request)
    {
        $supplier = Auth::guard('supplier')->user();

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
            $data['is_featured'] = $request->boolean('is_featured');
            $data['product_code'] = $productCode;
            $data['slug'] = $slug;
            $data['created_by_id'] = $supplier->id;
            $data['created_by_type'] = get_class($supplier);
            $data['supplier_code'] = $supplier->supplier_code;

            // Handle Main Image
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $data['image'] = $image->store('suppliers/' . $supplier->supplier_code . '/products', 'public');
            }

            // Handle Gallery
            $galleryPaths = [];
            foreach ((array) $request->input('gallery', []) as $path) {
                if (is_string($path) && !empty($path)) {
                    $galleryPaths[] = $path;
                }
            }
            foreach ((array) $request->file('gallery', []) as $file) {
                if ($file instanceof \Illuminate\Http\UploadedFile) {
                    $galleryPaths[] = $file->store('suppliers/' . $supplier->supplier_code . '/products/gallery', 'public');
                }
            }
            if (!empty($galleryPaths)) {
                $data['images'] = array_values(array_unique($galleryPaths));
            }

            // Create Product
            $product = Products::create($data);

            // Attach Categories
            if ($request->has('category_ids')) {
                $product->categories()->attach($request->category_ids);
            }

            // Handle Variations
            if ($request->product_type === 'variable') {
                $this->handleVariations($product, $request);
            }

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Product created successfully', 'product' => $product]);
            }

            $action = $request->input('save_action', 'save');
            if ($action === 'save_and_exit') {
                return redirect()->route('supplier.products')->with('success', 'Product created successfully.');
            }
            return redirect()->route('supplier.products.edit', $product->id)->with('success', 'Product created successfully.');

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Supplier Product Create Error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to create product: ' . $e->getMessage()])->withInput();
        }
    }

    public function editProduct(Products $product)
    {
        $supplier = Auth::guard('supplier')->user();
        
        // Ensure ownership
        if ($product->supplier_code !== $supplier->supplier_code) {
            abort(403, 'Unauthorized access to this product.');
        }

        $product->load(['categories', 'variations.items', 'variations.product']);

        $brands = Brands::select('id', 'name')->where('status', 'active')->orderBy('name')->get();
        $categories = Categories::select('id', 'name', 'parent_id')->where('status', 'active')->orderBy('order')->orderBy('name')->get();
        $itemAttributes = ItemAttribute::with(['details' => function ($query) {
            $query->select('id', 'attribute_set_id', 'title')->orderBy('order')->orderBy('title');
        }])
            ->select('id', 'title')
            ->where('status', 'published')
            ->orderBy('order')
            ->orderBy('title')
            ->get();

        return Inertia::render('Suppliers/Backend/Products', [
            'product' => $product,
            'brands' => $brands,
            'categories' => $categories,
            'itemAttributes' => $itemAttributes,
        ]);
    }

    public function updateProduct(UpdateProductsRequest $request, Products $product)
    {
        $supplier = Auth::guard('supplier')->user();
        
        if ($product->supplier_code !== $supplier->supplier_code) {
            abort(403, 'Unauthorized');
        }

        try {
            DB::beginTransaction();

            $data = $request->validated();
            $data['is_featured'] = $request->boolean('is_featured');
            
            // Handle Main Image
            if ($request->boolean('delete_image')) {
                if ($product->image && Storage::disk('public')->exists($product->image)) {
                    Storage::disk('public')->delete($product->image);
                }
                $data['image'] = null;
            }
            if ($request->hasFile('image')) {
                if ($product->image && Storage::disk('public')->exists($product->image)) {
                    Storage::disk('public')->delete($product->image);
                }
                $image = $request->file('image');
                $data['image'] = $image->store('suppliers/' . $supplier->supplier_code . '/products', 'public');
            }

            // Handle Gallery
            $currentImages = array_values(array_filter((array) $request->input('existing_images', []), function ($value) {
                return is_string($value) && !empty($value);
            }));
            $newImages = [];
            
            foreach ((array) $request->file('gallery', []) as $file) {
                if ($file instanceof \Illuminate\Http\UploadedFile) {
                    $newImages[] = $file->store('suppliers/' . $supplier->supplier_code . '/products/gallery', 'public');
                }
            }

            $finalImages = array_values(array_unique(array_merge($currentImages, $newImages)));
            $data['images'] = $finalImages;

            $previousImages = array_values(array_filter((array) ($product->images ?? []), function ($value) {
                return is_string($value) && !empty($value);
            }));
            $deletedImages = array_diff($previousImages, $currentImages);
            foreach ($deletedImages as $path) {
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }

            $product->update($data);

            // Update Categories
            if ($request->has('category_ids')) {
                $product->categories()->sync($request->category_ids);
            }

            // Handle Variations
            $this->handleVariations($product, $request);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Product updated successfully', 'product' => $product]);
            }

            $action = $request->input('save_action', 'save');
            if ($action === 'save_and_exit') {
                return redirect()->route('supplier.products')->with('success', 'Product updated successfully.');
            }
            return back()->with('success', 'Product updated successfully.');

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Supplier Product Update Error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update product: ' . $e->getMessage()])->withInput();
        }
    }

    public function destroyProduct(Products $product)
    {
        $supplier = Auth::guard('supplier')->user();

        if ($product->supplier_code !== $supplier->supplier_code) {
            abort(403, 'Unauthorized');
        }

        try {
            if ($product->children()->count() > 0) {
                return back()->withErrors(['error' => 'Cannot delete product with sub-products.']);
            }

            if ($product->image && Storage::disk('public')->exists($product->image)) {
                Storage::disk('public')->delete($product->image);
            }
            foreach ((array) ($product->images ?? []) as $path) {
                if (is_string($path) && !empty($path) && Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }

            $product->delete();

            return redirect()->route('supplier.products')
                ->with('success', 'Product deleted successfully.');
        } catch (Exception $e) {
            Log::error('Supplier Product Delete Error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to delete product.']);
        }
    }

    private function handleVariations(Products $product, Request $request)
    {
        $data = $request->all();
        
        // If switching to variable or updating variable product
        if (($data['product_type'] ?? $product->product_type) === 'variable') {
            $variations = $request->input('variations', []);
            $variationFiles = $request->file('variations', []);

            if (!is_array($variations) || count($variations) === 0) {
                // If we are just updating non-variation fields of a variable product, we might not send variations if they are unchanged?
                // But usually the form sends everything.
                // Admin controller throws validation exception here.
                throw ValidationException::withMessages([
                    'variations' => ['Variations are required for variable products.']
                ]);
            }

            $existingVariationProductIds = $product->variations()->pluck('product_id')->all();
            
            // We delete all old variations and recreate them. 
            // This is how Admin controller does it (simplistic but effective for consistency).
            // Optimization: checking ID to update instead of delete/create would be better but complex.
            $product->variations()->delete();
            if (!empty($existingVariationProductIds)) {
                \App\Models\Products::whereIn('id', $existingVariationProductIds)->forceDelete();
            }

            $total = 0;
            $defaultMarked = false;
            
            $supplierCode = $product->supplier_code;
            $variationPath = "suppliers/{$supplierCode}/products/variations";

            foreach ($variations as $index => $var) {
                $isDefault = (bool)($var['is_default'] ?? false);
                if ($isDefault) {
                    $defaultMarked = true;
                }

                $variationImages = [];

                // 1. Handle uploaded files
                if (isset($variationFiles[$index]['images']) && is_array($variationFiles[$index]['images'])) {
                    foreach ($variationFiles[$index]['images'] as $file) {
                        if ($file instanceof \Illuminate\Http\UploadedFile && $this->validateImageFile($file)) {
                            $variationImages[] = $file->store($variationPath, 'public');
                        }
                    }
                }

                // 2. Handle strings (existing paths)
                if (isset($var['images']) && is_array($var['images'])) {
                    foreach ($var['images'] as $path) {
                        if (is_string($path) && !empty($path)) {
                            $variationImages[] = $path;
                        }
                    }
                }

                // 3. Fallback: single image
                if (empty($variationImages)) {
                    if (isset($variationFiles[$index]['image']) && $variationFiles[$index]['image'] instanceof \Illuminate\Http\UploadedFile) {
                        if ($this->validateImageFile($variationFiles[$index]['image'])) {
                            $variationImages[] = $variationFiles[$index]['image']->store($variationPath, 'public');
                        }
                    } elseif (isset($var['image']) && is_string($var['image']) && !empty($var['image'])) {
                        $variationImages[] = $var['image'];
                    }
                }

                // 4. Final Fallback: Parent image
                if (empty($variationImages) && $product->image) {
                    $variationImages[] = $product->image;
                }

                $variationImages = array_values(array_unique($variationImages));
                $mainImage = !empty($variationImages) ? $variationImages[0] : null;

                $childProductData = $product->toArray();
                unset(
                    $childProductData['id'],
                    $childProductData['created_at'],
                    $childProductData['updated_at'],
                    $childProductData['deleted_at'],
                    $childProductData['variations_count']
                );

                $childProductData['parent_id'] = $product->id;
                $childProductData['product_type'] = 'simple';
                $childProductData['is_variation'] = false;
                $childProductData['barcode'] = $var['barcode'] ?? null;
                $childProductData['product_code'] = $product->product_code . '-' . ($index + 1);
                $childProductData['slug'] = $product->slug . '-' . ($index + 1);
                $childProductData['sku'] = $var['sku'] ?? null;
                $childProductData['price'] = (array_key_exists('price', $var) && $var['price'] !== null) ? $var['price'] : $product->price;
                $childProductData['sale_price'] = (array_key_exists('sale_price', $var) && $var['sale_price'] !== null) ? $var['sale_price'] : null;
                $childProductData['cost_per_item'] = (array_key_exists('cost_per_item', $var) && $var['cost_per_item'] !== null) ? $var['cost_per_item'] : null;
                $childProductData['quantity'] = (array_key_exists('stock', $var) && $var['stock'] !== null) ? $var['stock'] : $product->quantity;
                $childProductData['stock_status'] = $var['stock_status'] ?? 'in_stock';
                $childProductData['weight'] = (array_key_exists('weight', $var) && $var['weight'] !== null) ? $var['weight'] : $product->weight;
                $childProductData['length'] = (array_key_exists('length', $var) && $var['length'] !== null) ? $var['length'] : $product->length;
                $childProductData['wide'] = (array_key_exists('wide', $var) && $var['wide'] !== null) ? $var['wide'] : $product->wide;
                $childProductData['height'] = (array_key_exists('height', $var) && $var['height'] !== null) ? $var['height'] : $product->height;
                $childProductData['image'] = $mainImage;
                $childProductData['images'] = $variationImages;
                $childProductData['supplier_code'] = $product->supplier_code;

                $childProduct = \App\Models\Products::create($childProductData);

                $variation = \App\Models\ProductVariation::create([
                    'product_id' => $childProduct->id,
                    'configurable_product_id' => $product->id,
                    'is_default' => $isDefault,
                ]);

                $attributes = [];
                if (isset($var['attributes']) && is_array($var['attributes'])) {
                    $attributes = $var['attributes'];
                } elseif (isset($var['attribute_values']) && is_array($var['attribute_values'])) {
                    foreach ($var['attribute_values'] as $attrId => $value) {
                        $attributes[] = [
                            'attribute_id' => is_numeric($attrId) ? (int)$attrId : $attrId,
                            'attribute_value' => $value,
                        ];
                    }
                }

                foreach ($attributes as $attr) {
                    \App\Models\ProductVariationItem::create([
                        'variation_id' => $variation->id,
                        'attribute_id' => $attr['attribute_id'],
                        'attribute_value' => $attr['attribute_value'],
                    ]);
                }

                $total++;
            }

            if (!$defaultMarked) {
                $first = $product->variations()->first();
                if ($first) {
                    $first->is_default = true;
                    $first->save();
                }
            }

            $product->update([
                'is_variation' => true,
                'variations_count' => $total,
            ]);
        } else {
            // Not variable anymore, delete variations
            $existingVariationProductIds = $product->variations()->pluck('product_id')->all();
            $product->variations()->delete();
            if (!empty($existingVariationProductIds)) {
                \App\Models\Products::whereIn('id', $existingVariationProductIds)->delete();
            }
            $product->update([
                'is_variation' => false,
                'variations_count' => 0,
            ]);
        }
    }

    private function validateImageFile($file): bool
    {
        if (!$file->isValid()) {
            return false;
        }
        if ($file->getSize() > 5 * 1024 * 1024) {
            return false;
        }
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array(strtolower($file->getClientOriginalExtension()), $allowedExtensions)) {
            return false;
        }
        return true;
    }

    public function orders()
    {
        return Inertia::render('Suppliers/Backend/Orders');
    }

    public function earnings()
    {
        return Inertia::render('Suppliers/Backend/Earnings');
    }

    public function reviews()
    {
        return Inertia::render('Suppliers/Backend/Reviews');
    }

    public function profile()
    {
        return Inertia::render('Suppliers/Backend/Profile');
    }

    public function index()
    {
        $perPage = request('per_page', 10);
        $suppliers = Supplier::with(['group', 'currency', 'country', 'city', 'addresses', 'contacts', 'openingBalances'])
            ->when(request('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('supplier_code', 'like', "%{$search}%")
                      ->orWhere('name_ar', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('primary_phone', 'like', "%{$search}%")
                      ->orWhere('secondary_phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('favorite', 'desc')
            ->orderBy('supplier_code', 'asc')
            ->paginate($perPage)
            ->withQueryString();

        $suppliers->setCollection(
            $suppliers->getCollection()->transform(function ($supplier) {
                return $supplier->makeHidden(['password', 'remember_token']);
            })
        );

        return Inertia::render('Backend/04-Purchases/Suppliers', [
            'suppliers' => $suppliers,
            'filters' => request()->all(['search', 'group_id']),
            // Pass auxiliary data for the Create/Edit form modal/view
            'groups' => SupplierGroup::where('is_active', true)->get(),
            'countries' => Country::all(),
            'cities' => City::all(),
            'currencies' => Currency::all(),
            'warehouses' => Warehouses::all(), // Assuming model name is Warehouses
            'accounts' => Account::where('AccStopped', false)->get(),
        ]);
    }

    public function toggleFavorite($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->favorite = !$supplier->favorite;
        $supplier->save();

        return redirect()->back()->with('success', 'Supplier favorite status updated.');
    }

    public function bulkImport(Request $request)
    {
        set_time_limit(300); // Increase execution time to 5 minutes

        $rows = $request->input('rows');
        if (empty($rows)) {
             return redirect()->back()->with('error', 'No valid rows to import.');
        }

        $created = 0;
        $errors = [];

        // Get Default Supplier Group (or create one if none exists)
        $defaultGroup = SupplierGroup::firstOrCreate(
            ['code' => 'GRP-001'],
            ['name_ar' => 'عام', 'name_en' => 'General', 'is_active' => true]
        );
        $defaultGroupId = $defaultGroup->id;

        // Pre-fetch related data for faster lookups
        $currencies = Currency::pluck('id', 'code')->toArray();
        $accounts = Account::pluck('AccID', 'AccCode')->toArray();
        $groups = SupplierGroup::pluck('id', 'code')->toArray();

        // Bulk duplicate checks
        $supplierCodes = collect($rows)->pluck('supplier_code')->filter()->toArray();
        $emails = collect($rows)->pluck('email')->filter()->toArray();

        $existingCodes = [];
        if (!empty($supplierCodes)) {
            $existingCodes = Supplier::whereIn('supplier_code', $supplierCodes)
                ->pluck('supplier_code')
                ->flip()
                ->toArray();
        }

        $existingEmails = [];
        if (!empty($emails)) {
            $existingEmails = Supplier::whereIn('email', $emails)
                ->pluck('email')
                ->flip()
                ->toArray();
        }

        $insertData = [];
        $now = now();
        $userId = Auth::id();

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                // Skip if supplier_code already exists
                $code = $row['supplier_code'] ?? null;
                if ($code && isset($existingCodes[$code])) {
                    $errors[] = "Row " . ($index + 1) . ": Supplier Code '$code' already exists.";
                    continue;
                }

                // Handle Telegram Duplication (Set to null if exists)
                $telegram = !empty($row['telegram']) ? $row['telegram'] : null;
                if ($telegram && isset($existingTelegrams[$telegram])) {
                    $telegram = null; // Clear telegram to avoid unique constraint violation
                }

                // Prepare data
                $data = [
                    'supplier_code' => $code,
                    'name_ar' => $row['name_ar'] ?? null,
                    'supplier_group_id' => $defaultGroupId,
                    'primary_phone' => $row['primary_phone'] ?? null,
                    'telegram' => $telegram,
                    'is_active' => isset($row['is_active']) ? (bool)$row['is_active'] : true,
                    'created_by' => $userId,
                    'password' => \Illuminate\Support\Facades\Hash::make(Str::random(12)), // Manually hash for bulk insert
                    'currency_id' => null,
                    'account_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                // Foreign Key Lookups (Memory-based)
                if (!empty($row['group_code']) && isset($groups[$row['group_code']])) {
                    $data['supplier_group_id'] = $groups[$row['group_code']];
                }

                if (!empty($row['currency_code']) && isset($currencies[$row['currency_code']])) {
                    $data['currency_id'] = $currencies[$row['currency_code']];
                }
                
                if (!empty($row['account_code']) && isset($accounts[$row['account_code']])) {
                    $data['account_id'] = $accounts[$row['account_code']];
                }

                // Basic Validation (Manual check to avoid Validator overhead)
                if (empty($data['supplier_code'])) {
                    $errors[] = "Row " . ($index + 1) . ": Supplier Code is required.";
                    continue;
                }
                if (empty($data['name_ar'])) {
                    $errors[] = "Row " . ($index + 1) . ": Name (AR) is required.";
                    continue;
                }

                $insertData[] = $data;
                $created++;
            }

            // Bulk Insert in Chunks
            if (!empty($insertData)) {
                foreach (array_chunk($insertData, 500) as $chunk) {
                    Supplier::insert($chunk);
                }
            }

            if ($created > 0) {
                DB::commit();
                $msg = "Successfully imported $created suppliers.";
                if (count($errors) > 0) {
                    $msg .= " Skipped " . count($errors) . " rows due to errors.";
                    return redirect()->back()->with('warning', $msg);
                }
                return redirect()->back()->with('success', $msg);
            } else {
                DB::rollBack();
                return redirect()->back()->with('error', 'No suppliers imported. Errors: ' . implode(' | ', array_slice($errors, 0, 10)) . (count($errors) > 10 ? '...' : ''));
            }

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Server Error: ' . $e->getMessage());
        }
    }

    public function store(StoreSupplierRequest $request)
    {
        DB::beginTransaction();
        try {
            $data = $request->validated();
            unset($data['password_confirmation']);
            
            // Auto-generate supplier code
            $latest = Supplier::latest('id')->first();
            if ($latest && preg_match('/^VEN-(\d+)$/', $latest->supplier_code, $matches)) {
                $nextId = intval($matches[1]) + 1;
            } else {
                $nextId = 10001;
            }
            $data['supplier_code'] = 'VEN-' . $nextId;

            $data['created_by'] = Auth::id();
            if (empty($data['password'])) {
                $data['password'] = Str::random(12);
            }

            // Create Supplier
            $supplier = Supplier::create($data);

            // Create Addresses
            if (!empty($data['addresses'])) {
                foreach ($data['addresses'] as $addressData) {
                    $supplier->addresses()->create($addressData);
                }
            }

            // Create Contacts
            if (!empty($data['contacts'])) {
                foreach ($data['contacts'] as $contactData) {
                    if (empty($contactData['name_ar'])) {
                        $contactData['name_ar'] = $contactData['name_en'] ?? 'Contact';
                    }
                    $supplier->contacts()->create($contactData);
                }
            }

            // Create Opening Balance
            if (!empty($data['opening_balance'])) {
                $obData = $data['opening_balance'];
                $obData['created_by'] = Auth::id();
                // Ensure required fields for OB are present or defaults set
                if (!empty($obData['debit_amount']) || !empty($obData['credit_amount'])) {
                    $supplier->openingBalances()->create($obData);
                }
            }

            DB::commit();
            return redirect()->route('admin.purchases.suppliers.index')->with('success', 'Supplier created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->route('admin.purchases.suppliers.index')->with('error', 'Error creating supplier: ' . $e->getMessage());
        }
    }

    public function show($id)
    {
        $supplier = Supplier::with(['addresses', 'contacts', 'openingBalances'])->findOrFail($id);
        // We can return JSON for API or render a view. Since it's Inertia, likely we use index with selected supplier or a separate page.
        // The requirement says "Same form used for Create, Edit, View".
        // Usually index handles the list, and we might fetch details via API or pass them.
        // I'll return JSON if it's an API request, or render the page.
        if (request()->wantsJson()) {
            return response()->json($supplier);
        }
        return Inertia::render('Backend/04-Purchases/Suppliers', [
            'supplier' => $supplier
        ]);
    }

    public function update(UpdateSupplierRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $supplier = Supplier::findOrFail($id);
            $data = $request->validated();
            unset($data['password_confirmation']);
            if (empty($data['password'] ?? null)) {
                unset($data['password']);
            }

            // Update Supplier
            $supplier->update($data);

            // Update Addresses
            // Strategy: Sync or Update/Create.
            // For simplicity in this form, we might delete missing and update/create existing if IDs are provided.
            // But 'sync' isn't standard for hasMany without custom logic.
            // I'll loop through provided addresses.
            
            // 1. Get current address IDs
            $currentAddressIds = $supplier->addresses()->pluck('id')->toArray();
            $incomingAddressIds = [];

            if (!empty($data['addresses'])) {
                foreach ($data['addresses'] as $addressData) {
                    if (isset($addressData['id']) && in_array($addressData['id'], $currentAddressIds)) {
                        $incomingAddressIds[] = $addressData['id'];
                        $supplier->addresses()->where('id', $addressData['id'])->update($addressData);
                    } else {
                        $supplier->addresses()->create($addressData);
                    }
                }
            }
            // Delete removed addresses
            $addressesToDelete = array_diff($currentAddressIds, $incomingAddressIds);
            if (!empty($addressesToDelete)) {
                $supplier->addresses()->whereIn('id', $addressesToDelete)->delete();
            }

            // Update Contacts
            $currentContactIds = $supplier->contacts()->pluck('id')->toArray();
            $incomingContactIds = [];

            if (!empty($data['contacts'])) {
                foreach ($data['contacts'] as $contactData) {
                    if (isset($contactData['id']) && in_array($contactData['id'], $currentContactIds)) {
                        $incomingContactIds[] = $contactData['id'];
                        if (empty($contactData['name_ar'])) {
                            $contactData['name_ar'] = $contactData['name_en'] ?? 'Contact';
                        }
                        $supplier->contacts()->where('id', $contactData['id'])->update($contactData);
                    } else {
                        if (empty($contactData['name_ar'])) {
                            $contactData['name_ar'] = $contactData['name_en'] ?? 'Contact';
                        }
                        $supplier->contacts()->create($contactData);
                    }
                }
            }
            $contactsToDelete = array_diff($currentContactIds, $incomingContactIds);
            if (!empty($contactsToDelete)) {
                $supplier->contacts()->whereIn('id', $contactsToDelete)->delete();
            }

            // Update Opening Balance
            // Assuming we edit the passed one or create if not exists
            if (!empty($data['opening_balance'])) {
                $obData = $data['opening_balance'];
                if (isset($obData['id'])) {
                    $supplier->openingBalances()->where('id', $obData['id'])->update($obData);
                } else {
                    $obData['created_by'] = Auth::id();
                    if (!empty($obData['debit_amount']) || !empty($obData['credit_amount'])) {
                        $supplier->openingBalances()->create($obData);
                    }
                }
            }

            DB::commit();
            return redirect()->route('admin.purchases.suppliers.index')->with('success', 'Supplier updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->route('admin.purchases.suppliers.index')->with('error', 'Error updating supplier: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            $supplier->delete();
            return redirect()->route('admin.purchases.suppliers.index')->with('success', 'Supplier deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->route('admin.purchases.suppliers.index')->with('error', 'Error deleting supplier: ' . $e->getMessage());
        }
    }
}
