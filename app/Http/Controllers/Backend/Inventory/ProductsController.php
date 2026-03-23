<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Exports\ProductExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreProductsRequest;
use App\Http\Requests\Inventory\UpdateProductsRequest;
use App\Imports\ProductImport;
use App\Imports\ProductPreviewImport;
use App\Models\Brands;
use App\Models\Categories;
use App\Models\ItemAttribute;
use App\Models\Products;
use App\Models\Vendor_Purchases\Supplier;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Throwable;

class ProductsController extends Controller
{
    public function export(Request $request)
    {
        set_time_limit(300); // 5 minutes
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403, 'Company not set for this user.');
        }

        return Excel::download(new ProductExport($companyId), 'products.xlsx');
    }

    public function previewImport(Request $request)
    {
        set_time_limit(300); // 5 minutes

        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json(['error' => 'Company not set for this user.'], 403);
        }

        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:10240', // 10MB
        ]);

        try {
            $userId = $request->user()->id;
            $file = $request->file('file');
            $ext = strtolower($file->getClientOriginalExtension() ?: 'xlsx');
            $path = $file->storeAs("tmp-imports/{$userId}", Str::uuid().'.'.$ext);
            $token = Crypt::encryptString($path);

            [$payload, $status] = $this->buildImportPreviewPayload($companyId, $path, 50);

            return response()->json([
                ...$payload,
                'token' => $token,
            ], $status);
        } catch (Exception $e) {
            return response()->json(['error' => 'Error reading file: '.$e->getMessage()], 500);
        }
    }

    public function confirmImport(Request $request)
    {
        set_time_limit(300);

        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json(['error' => 'Company not set for this user.'], 403);
        }

        $request->validate([
            'token' => 'required|string',
        ]);

        try {
            $path = Crypt::decryptString($request->input('token'));
            $userId = $request->user()->id;
            $prefix = "tmp-imports/{$userId}/";
            if (! is_string($path) || ! str_starts_with($path, $prefix)) {
                return response()->json(['error' => 'Invalid import token.'], 403);
            }
            if (! Storage::exists($path)) {
                return response()->json(['error' => 'Import file not found or expired.'], 404);
            }

            [$payload, $status] = $this->buildImportPreviewPayload($companyId, $path, 50);
            if ($status !== 200) {
                return response()->json($payload, $status);
            }

            if (count($payload['errors'] ?? []) > 0) {
                return response()->json($payload, 422);
            }

            $fullPath = Storage::path($path);
            Excel::import(new ProductImport($companyId), $fullPath);
            Storage::delete($path);

            return response()->json([
                'message' => 'Products imported successfully',
                'total' => $payload['total'] ?? 0,
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Error importing products: '.$e->getMessage()], 500);
        }
    }

    public function import(Request $request)
    {
        set_time_limit(300); // 5 minutes

        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return back()->withErrors(['error' => 'Company not set for this user.']);
        }

        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:10240', // 10MB
        ]);

        try {
            Excel::import(new ProductImport($companyId), $request->file('file'));

            return back()->with('success', 'Products imported successfully');
        } catch (Exception $e) {
            return back()->withErrors(['error' => 'Error importing products: '.$e->getMessage()]);
        }
    }

    private function buildImportPreviewPayload(int $companyId, string $path, int $limit): array
    {
        $fullPath = Storage::path($path);
        $sheets = Excel::toCollection(new ProductPreviewImport, $fullPath);
        $sheet = $sheets->first() ?? collect();
        $rowsRaw = $sheet->toArray();

        $rows = [];
        $firstNonEmptyRawKeys = null;
        foreach ($rowsRaw as $idx => $row) {
            if (! is_array($row)) {
                continue;
            }
            $hasValue = false;
            foreach ($row as $v) {
                if ($v === 0 || $v === '0' || $v === false) {
                    $hasValue = true;
                    break;
                }
                if ($v !== null && $v !== '') {
                    $hasValue = true;
                    break;
                }
            }
            if (! $hasValue) {
                continue;
            }
            if ($firstNonEmptyRawKeys === null) {
                $firstNonEmptyRawKeys = array_keys($row);
            }
            $rows[] = [
                '__row' => $idx + 2,
                ...$row,
            ];
        }

        if (count($rows) === 0) {
            return [[
                'rows' => [],
                'errors' => [],
                'total' => 0,
                'shown' => 0,
            ], 200];
        }

        $hasHeaderRow = $firstNonEmptyRawKeys !== null
            ? ! array_reduce($firstNonEmptyRawKeys, fn ($carry, $k) => $carry && is_int($k), true)
            : true;
        if (! $hasHeaderRow) {
            return [[
                'rows' => [],
                'errors' => [[
                    'row' => 1,
                    'messages' => ['file' => ['Invalid or missing header row.']],
                ]],
                'total' => 0,
                'shown' => 0,
            ], 422];
        }

        $requiredColumns = ['name'];
        $missing = [];
        foreach ($requiredColumns as $c) {
            if (! array_key_exists($c, $rows[0])) {
                $missing[] = $c;
            }
        }
        if (count($missing) > 0) {
            return [[
                'rows' => [],
                'errors' => [[
                    'row' => 1,
                    'messages' => ['file' => ['Missing columns: '.implode(', ', $missing)]],
                ]],
                'total' => 0,
                'shown' => 0,
            ], 422];
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'product_code' => ['nullable', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:150'],
            'barcode' => ['nullable', 'string', 'max:150'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:active,inactive,draft,published,pending'],
            'brand' => ['nullable', 'string', 'max:255'],
            'categories' => ['nullable', 'string'],
            'unit' => ['nullable', 'string', 'max:50'],
            'is_featured' => ['nullable'],
            'is_default' => ['nullable'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];

        $errors = [];
        foreach ($rows as $row) {
            $rowNumber = (int) ($row['__row'] ?? 0);
            $validator = Validator::make($row, $rules);
            if ($validator->fails()) {
                $errors[] = [
                    'row' => $rowNumber,
                    'messages' => $validator->errors()->toArray(),
                ];
            }
        }

        $total = count($rows);
        $shownRows = array_slice($rows, 0, $limit);

        return [[
            'rows' => $shownRows,
            'errors' => $errors,
            'total' => $total,
            'shown' => count($shownRows),
        ], 200];
    }

    public function index(Request $request)
    {
        try {
            $query = Products::with(['parent', 'brand', 'categories'])
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

            $products = $query->orderBy('order')->orderBy('name')->paginate(20)->withQueryString();

            // Data for dropdowns
            $parents = Products::select('id', 'name')
                ->whereNull('parent_id')
                ->orderBy('name')
                ->get();
            $brands = Brands::select('id', 'name')->where('status', 'active')->orderBy('name')->get();
            $categories = Categories::select('id', 'name')->where('status', 'active')->orderBy('name')->get();

            if ($request->wantsJson()) {
                return response()->json([
                    'products' => $products,
                    'parents' => $parents,
                    'brands' => $brands,
                    'categories' => $categories,
                ]);
            }

            return Inertia::render('Backend/03-Inventory/Products', [
                'products' => $products,
                'brands' => $brands,
                'categories' => $categories,
                'filters' => $request->only(['search', 'status', 'brand_id', 'category_id']),
            ]);
        } catch (Exception $e) {
            Log::error('Error retrieving products: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to retrieve products. Please try again later.',
                ], 500);
            }

            return Inertia::render('Backend/03-Inventory/Products', [
                'products' => collect([]),
                'brands' => collect([]),
                'categories' => collect([]),
                'filters' => $request->only(['search', 'status', 'brand_id', 'category_id']),
                'error' => 'Failed to retrieve products. Please try again later.',
            ])->with('error', 'Failed to retrieve products. Please try again later.');
        }
    }

    public function create(Request $request)
    {
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
        $suppliers = Supplier::select('supplier_code', 'name_ar')->where('is_active', true)->orderBy('name_ar')->get();

        return Inertia::render('Backend/03-Inventory/Products', [
            'product' => null,
            'brands' => $brands,
            'categories' => $categories,
            'itemAttributes' => $itemAttributes,
            'suppliers' => $suppliers,
        ]);
    }

    public function show(Products $product)
    {
        $product->load(['categories', 'brand', 'variations.items', 'variations.product']);

        if (request()->wantsJson()) {
            return response()->json([
                'product' => $product,
            ]);
        }

        return Inertia::render('Backend/03-Inventory/Products', [
            'product' => $product,
            'brands' => Brands::select('id', 'name')->where('status', 'active')->orderBy('name')->get(),
            'categories' => Categories::select('id', 'name', 'parent_id')->where('status', 'active')->orderBy('order')->orderBy('name')->get(),
        ]);
    }

    public function edit(Products $product, Request $request)
    {
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
        $suppliers = Supplier::select('supplier_code', 'name_ar')->where('is_active', true)->orderBy('name_ar')->get();

        return Inertia::render('Backend/03-Inventory/Products', [
            'product' => $product,
            'brands' => $brands,
            'categories' => $categories,
            'itemAttributes' => $itemAttributes,
            'suppliers' => $suppliers,
        ]);
    }

    public function store(StoreProductsRequest $request)
    {
        $user = Auth::user();
        if (! $user) {
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
            $productCode = 'PRD-'.str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

            // Generate Slug
            $slug = Str::slug($request->name);
            $count = Products::where('slug', 'LIKE', "{$slug}%")->count();
            if ($count > 0) {
                $slug .= '-'.($count + 1);
            }

            $data = $request->validated();

            // Explicitly handle is_featured to ensure it captures 1/0/"1"/"0"/true/false
            // If is_featured is not in the request (e.g. unchecked checkbox not sent), default to false
            // But with Inertia form helper, it should be sent as 0 or 1.
            $data['is_featured'] = $request->boolean('is_featured');

            $categoryIds = $request->input('category_ids', []);

            $data['product_code'] = $productCode;
            $data['slug'] = $slug;
            $data['created_by_id'] = $user->id;
            $data['created_by_type'] = get_class($user);

            // Handle Main Image
            if ($request->hasFile('image')) {
                $image = $request->file('image');

                // Validate image file
                if (! $this->validateImageFile($image)) {
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

            if (! empty($galleryImages)) {
                $data['images'] = $galleryImages;
            }

            $product = Products::create($data);

            $product->categories()->sync(is_array($categoryIds) ? $categoryIds : []);

            // Variable product handling
            if (($data['product_type'] ?? 'simple') === 'variable') {
                $variations = $request->input('variations', []);
                $variationFiles = $request->file('variations', []);

                if (! is_array($variations) || count($variations) === 0) {
                    throw ValidationException::withMessages([
                        'variations' => ['Variations are required for variable products.'],
                    ]);
                }

                $total = 0;
                $defaultMarked = false;

                foreach ($variations as $index => $var) {
                    $isDefault = (bool) ($var['is_default'] ?? false);
                    if ($isDefault) {
                        $defaultMarked = true;
                    }

                    $variationImages = [];

                    // 1. Handle uploaded files in 'images' array
                    if (isset($variationFiles[$index]['images']) && is_array($variationFiles[$index]['images'])) {
                        foreach ($variationFiles[$index]['images'] as $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile && $this->validateImageFile($file)) {
                                $variationImages[] = $file->store('products/variations', 'public');
                            }
                        }
                    }

                    // 2. Handle strings in 'images' array (existing paths)
                    if (isset($var['images']) && is_array($var['images'])) {
                        foreach ($var['images'] as $path) {
                            if (is_string($path) && ! empty($path)) {
                                $variationImages[] = $path;
                            }
                        }
                    }

                    // 3. Fallback: If 'images' is empty, check single 'image'
                    if (empty($variationImages)) {
                        if (isset($variationFiles[$index]['image']) && $variationFiles[$index]['image'] instanceof \Illuminate\Http\UploadedFile) {
                            if ($this->validateImageFile($variationFiles[$index]['image'])) {
                                $variationImages[] = $variationFiles[$index]['image']->store('products/variations', 'public');
                            }
                        } elseif (isset($var['image']) && is_string($var['image']) && ! empty($var['image'])) {
                            $variationImages[] = $var['image'];
                        }
                    }

                    // 4. Final Fallback: Parent image
                    if (empty($variationImages) && $product->image) {
                        $variationImages[] = $product->image;
                    }

                    $variationImages = array_values(array_unique($variationImages));
                    $mainImage = ! empty($variationImages) ? $variationImages[0] : null;

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
                    $childProductData['product_code'] = $productCode.'-'.($index + 1);
                    $childProductData['slug'] = $slug.'-'.($index + 1);
                    $childProductData['sku'] = $var['sku'] ?? null;
                    $childProductData['price'] = (array_key_exists('price', $var) && $var['price'] !== null)
                        ? $var['price']
                        : $product->price;
                    $childProductData['sale_price'] = (array_key_exists('sale_price', $var) && $var['sale_price'] !== null)
                        ? $var['sale_price']
                        : null;
                    $childProductData['cost_per_item'] = (array_key_exists('cost_per_item', $var) && $var['cost_per_item'] !== null)
                        ? $var['cost_per_item']
                        : null;
                    $childProductData['quantity'] = (array_key_exists('stock', $var) && $var['stock'] !== null)
                        ? $var['stock']
                        : $product->quantity;
                    $childProductData['stock_status'] = $var['stock_status'] ?? 'in_stock';
                    $childProductData['weight'] = (array_key_exists('weight', $var) && $var['weight'] !== null)
                        ? $var['weight']
                        : $product->weight;
                    $childProductData['length'] = (array_key_exists('length', $var) && $var['length'] !== null)
                        ? $var['length']
                        : $product->length;
                    $childProductData['wide'] = (array_key_exists('wide', $var) && $var['wide'] !== null)
                        ? $var['wide']
                        : $product->wide;
                    $childProductData['height'] = (array_key_exists('height', $var) && $var['height'] !== null)
                        ? $var['height']
                        : $product->height;
                    $childProductData['image'] = $mainImage;
                    $childProductData['images'] = $variationImages;

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
                                'attribute_id' => is_numeric($attrId) ? (int) $attrId : $attrId,
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

                if (! $defaultMarked) {
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
                $product->update([
                    'is_variation' => false,
                    'variations_count' => 0,
                ]);
            }

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Product created successfully.',
                    'product' => $product->load(['variations.items', 'variations.product']),
                ], 201);
            }

            $redirect = redirect()->route('admin.inventory.products.index');
            if ($request->input('save_action') === 'save') {
                $redirect = redirect()->route('admin.inventory.products.edit', $product->id);
            }

            return $redirect->with('success', 'Product created successfully.');
        } catch (ValidationException $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json([
                    'errors' => $e->errors(),
                ], 422);
            }

            return back()->withErrors($e->errors())->withInput();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Product creation failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to create product. Please try again later.',
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to create product. Please try again later.'])->withInput();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Unexpected error during product creation: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'An unexpected error occurred. Please try again later.',
                ], 500);
            }

            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again later.'])->withInput();
        }
    }

    public function update(UpdateProductsRequest $request, Products $product)
    {
        $user = Auth::user();
        if (! $user) {
            abort(403, 'Unauthorized');
        }

        try {
            DB::beginTransaction();

            Log::info('ProductsController::update called for product '.$product->id);
            Log::info('Request Content-Type: '.$request->header('Content-Type'));
            Log::info('Request is_featured raw: '.json_encode($request->input('is_featured')));
            Log::info('Request variations count: '.count($request->input('variations', [])));

            // Log first variation to check structure
            $variations = $request->input('variations', []);
            if (! empty($variations)) {
                Log::info('First variation structure:', [
                    'keys' => array_keys($variations[0]),
                    'images_type' => gettype($variations[0]['images'] ?? null),
                    'images_content' => $variations[0]['images'] ?? 'null',
                    'image_content' => $variations[0]['image'] ?? 'null',
                ]);
            }

            $data = $request->validated();

            Log::info("Update Product {$product->id}", [
                'product_type_input' => $data['product_type'] ?? 'null',
                'product_type_db' => $product->product_type,
                'variations_count' => count($request->input('variations', [])),
            ]);

            // Explicitly handle is_featured to ensure it captures 1/0/"1"/"0"/true/false
            $data['is_featured'] = $request->boolean('is_featured');

            $categoryIds = $request->input('category_ids', []);
            // $data['updated_by_id'] = $user->id;
            // $data['updated_by_type'] = get_class($user);

            // Update slug if name changed and slug not manually provided (optional logic, sticking to auto for now)
            if ($product->name !== $request->name) {
                $slug = Str::slug($request->name);
                if ($slug !== $product->slug) {
                    $count = Products::where('slug', 'LIKE', "{$slug}%")->where('id', '!=', $product->id)->count();
                    if ($count > 0) {
                        $slug .= '-'.($count + 1);
                    }
                    $data['slug'] = $slug;
                }
            }

            // Handle Main Image
            if ($request->hasFile('image')) {
                $image = $request->file('image');

                // Validate image file
                if (! $this->validateImageFile($image)) {
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
            $product->categories()->sync(is_array($categoryIds) ? $categoryIds : []);

            if (is_array($categoryIds)) {
                $product->categories()->sync($categoryIds);
            }

            // Variable product handling
            if (($data['product_type'] ?? $product->product_type) === 'variable') {
                $variations = $request->input('variations', []);
                $variationFiles = $request->file('variations', []);

                if (! is_array($variations) || count($variations) === 0) {
                    throw ValidationException::withMessages([
                        'variations' => ['Variations are required for variable products.'],
                    ]);
                }

                $existingVariationProductIds = $product->variations()->pluck('product_id')->all();
                $product->variations()->delete();
                if (! empty($existingVariationProductIds)) {
                    \App\Models\Products::whereIn('id', $existingVariationProductIds)->forceDelete();
                }

                $total = 0;
                $defaultMarked = false;
                foreach ($variations as $index => $var) {
                    $isDefault = (bool) ($var['is_default'] ?? false);
                    if ($isDefault) {
                        $defaultMarked = true;
                    }

                    $variationImages = [];

                    Log::info("Update: Processing variation $index", [
                        'sku' => $var['sku'] ?? 'no-sku',
                        'input_images' => $var['images'] ?? 'not-set',
                        'input_image' => $var['image'] ?? 'not-set',
                    ]);

                    // 1. Handle uploaded files in 'images' array
                    if (isset($variationFiles[$index]['images']) && is_array($variationFiles[$index]['images'])) {
                        foreach ($variationFiles[$index]['images'] as $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile && $this->validateImageFile($file)) {
                                $variationImages[] = $file->store('products/variations', 'public');
                            }
                        }
                    }

                    // 2. Handle strings in 'images' array (existing paths)
                    if (isset($var['images']) && is_array($var['images'])) {
                        foreach ($var['images'] as $path) {
                            if (is_string($path) && ! empty($path)) {
                                $variationImages[] = $path;
                            }
                        }
                    }

                    // 3. Fallback: If 'images' is empty, check single 'image'
                    if (empty($variationImages)) {
                        if (isset($variationFiles[$index]['image']) && $variationFiles[$index]['image'] instanceof \Illuminate\Http\UploadedFile) {
                            if ($this->validateImageFile($variationFiles[$index]['image'])) {
                                $variationImages[] = $variationFiles[$index]['image']->store('products/variations', 'public');
                            }
                        } elseif (isset($var['image']) && is_string($var['image']) && ! empty($var['image'])) {
                            $variationImages[] = $var['image'];
                        }
                    }

                    // 4. Final Fallback: Parent image
                    if (empty($variationImages) && $product->image) {
                        $variationImages[] = $product->image;
                    }

                    $variationImages = array_values(array_unique($variationImages));
                    $mainImage = ! empty($variationImages) ? $variationImages[0] : null;

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
                    $childProductData['product_code'] = $product->product_code.'-'.($index + 1);
                    $childProductData['slug'] = $product->slug.'-'.($index + 1);
                    $childProductData['sku'] = $var['sku'] ?? null;
                    $childProductData['price'] = (array_key_exists('price', $var) && $var['price'] !== null)
                        ? $var['price']
                        : $product->price;
                    $childProductData['sale_price'] = (array_key_exists('sale_price', $var) && $var['sale_price'] !== null)
                        ? $var['sale_price']
                        : null;
                    $childProductData['cost_per_item'] = (array_key_exists('cost_per_item', $var) && $var['cost_per_item'] !== null)
                        ? $var['cost_per_item']
                        : null;
                    $childProductData['quantity'] = (array_key_exists('stock', $var) && $var['stock'] !== null)
                        ? $var['stock']
                        : $product->quantity;
                    $childProductData['stock_status'] = $var['stock_status'] ?? 'in_stock';
                    $childProductData['weight'] = (array_key_exists('weight', $var) && $var['weight'] !== null)
                        ? $var['weight']
                        : $product->weight;
                    $childProductData['length'] = (array_key_exists('length', $var) && $var['length'] !== null)
                        ? $var['length']
                        : $product->length;
                    $childProductData['wide'] = (array_key_exists('wide', $var) && $var['wide'] !== null)
                        ? $var['wide']
                        : $product->wide;
                    $childProductData['height'] = (array_key_exists('height', $var) && $var['height'] !== null)
                        ? $var['height']
                        : $product->height;
                    $childProductData['image'] = $mainImage;
                    $childProductData['images'] = $variationImages;

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
                                'attribute_id' => is_numeric($attrId) ? (int) $attrId : $attrId,
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

                if (! $defaultMarked) {
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
                $existingVariationProductIds = $product->variations()->pluck('product_id')->all();
                $product->variations()->delete();
                if (! empty($existingVariationProductIds)) {
                    \App\Models\Products::whereIn('id', $existingVariationProductIds)->delete();
                }
                $product->update([
                    'is_variation' => false,
                    'variations_count' => 0,
                ]);
            }

            DB::commit();

            $saveAction = $request->input('save_action');

            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'Product updated successfully.',
                    'product' => $product->load(['variations.items', 'variations.product']),
                    'save_action' => $saveAction,
                ], 200);
            }

            if ($saveAction === 'save') {
                return back()->with('success', 'Product updated successfully.');
            }

            return redirect()->route('admin.inventory.products.index')
                ->with('success', 'Product updated successfully.');
        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            Log::error('Product not found for update: '.$e->getMessage(), [
                'product_id' => $product->id,
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Product not found.',
                ], 404);
            }

            return back()->withErrors(['error' => 'Product not found.']);
        } catch (ValidationException $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json([
                    'errors' => $e->errors(),
                ], 422);
            }

            return back()->withErrors($e->errors())->withInput();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Product update failed: '.$e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to update product. Please try again later.',
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to update product. Please try again later.'])->withInput();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Unexpected error during product update: '.$e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'error' => 'An unexpected error occurred. Please try again later.',
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
                        'error' => 'Cannot delete product with sub-products.',
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
                    'message' => 'Product deleted successfully.',
                ], 200);
            }

            return redirect()->route('admin.inventory.products.index')
                ->with('success', 'Product deleted successfully.');
        } catch (ModelNotFoundException $e) {
            Log::error('Product not found for deletion: '.$e->getMessage(), [
                'product_id' => $product->id,
                'user_id' => Auth::id(),
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'Product not found.',
                ], 404);
            }

            return back()->withErrors(['error' => 'Product not found.']);
        } catch (Exception $e) {
            Log::error('Product deletion failed: '.$e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'Failed to delete product. Please try again later.',
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to delete product. Please try again later.']);
        } catch (Throwable $e) {
            Log::error('Unexpected error during product deletion: '.$e->getMessage(), [
                'product_id' => $product->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'An unexpected error occurred. Please try again later.',
                ], 500);
            }

            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again later.']);
        }
    }

    /**
     * Validate image file
     *
     * @param  \Illuminate\Http\UploadedFile  $file
     */
    private function validateImageFile($file): bool
    {
        if (! $file->isValid()) {
            return false;
        }

        // Check file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return false;
        }

        // Check file extension
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (! in_array(strtolower($file->getClientOriginalExtension()), $allowedExtensions)) {
            return false;
        }

        return true;
    }
}
