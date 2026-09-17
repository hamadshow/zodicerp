<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Products;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProductController extends BaseApiController
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Display a listing of products.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['search', 'category_id', 'status', 'brand_id', 'min_price', 'max_price']);
            $perPage = $request->get('per_page', 15);
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            $products = $this->productService->getAll($filters, $perPage, $sortBy, $sortDirection);

            return $this->successResponse($products, 'Products retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve products', 500);
        }
    }

    /**
     * Store a newly created product.
     *
     * Uses the shared Product Domain contract (Products::domainRules) so the
     * API cannot drift from the web Inventory flow: canonical product types
     * only, variation = simple child of a variable parent, services handled
     * by the model's non-stock enforcement.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->productRules());

        if ($validator->fails()) {
            return $this->validationFailure($validator);
        }

        try {
            $product = $this->productService->create($this->preparePayload($request));
            return $this->successResponse($product, 'Product created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create product', 500);
        }
    }

    /**
     * Display the specified product.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $product = $this->productService->find($id);

            if (!$product) {
                return $this->notFoundResponse('Product not found');
            }

            return $this->successResponse($product, 'Product retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve product', 500);
        }
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->productRules(true));

        if ($validator->fails()) {
            return $this->validationFailure($validator);
        }

        try {
            $product = $this->productService->update($id, $this->preparePayload($request, true));

            if (!$product) {
                return $this->notFoundResponse('Product not found');
            }

            return $this->successResponse($product, 'Product updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update product', 500);
        }
    }

    /**
     * Remove the specified product.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->productService->delete($id);

            if (!$deleted) {
                return $this->notFoundResponse('Product not found');
            }

            return $this->successResponse(null, 'Product deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete product', 500);
        }
    }

    /**
     * Bulk delete products.
     *
     * ProductService::bulkDelete() is Product-specific and lifecycle-safe
     * (model events run; variations_count resync; no orphaned
     * product_variations / product_variation_items) and fully transactional.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:products,id',
        ]);

        if ($validator->fails()) {
            return $this->validationFailure($validator);
        }

        try {
            $deleted = $this->productService->bulkDelete($request->ids);
            return $this->successResponse(['deleted_count' => $deleted], 'Products deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete products', 500);
        }
    }

    /**
     * Bulk update product status.
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:products,id',
            'status' => 'required|in:active,inactive,draft',
        ]);

        if ($validator->fails()) {
            return $this->validationFailure($validator);
        }

        try {
            $updated = $this->productService->bulkUpdateStatus($request->ids, $request->status);
            return $this->successResponse(['updated_count' => $updated], 'Product status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update product status', 500);
        }
    }

    /**
     * Update product stock.
     *
     * ProductService::updateStock() refuses services (increment/decrement
     * bypass model events, so the guard lives in the service).
     */
    public function updateStock(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'stock_quantity' => 'required|integer|min:0',
            'operation' => 'required|in:set,add,subtract',
        ]);

        if ($validator->fails()) {
            return $this->validationFailure($validator);
        }

        try {
            $product = $this->productService->updateStock($id, $request->stock_quantity, $request->operation);

            if (!$product) {
                return $this->notFoundResponse('Product not found');
            }

            return $this->successResponse($product, 'Product stock updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update product stock', 500);
        }
    }

    /**
     * Prepare an API payload for the Product service layer.
     *
     * Bridges the API contract onto the Product schema without changing either:
     *  - product_code / slug are NOT NULL without defaults, so the API
     *    generates them when absent (the legacy API path could never insert
     *    rows against the current schema without this).
     *  - the API-contract field stock_quantity maps onto products.quantity
     *    (previously validated but silently dropped by mass assignment).
     */
    private function preparePayload(Request $request, bool $partial = false): array
    {
        $data = $request->all();

        // API contract field -> schema column.
        if (array_key_exists('stock_quantity', $data)) {
            $data['quantity'] = $data['stock_quantity'];
        }

        if (!$partial) {
            $data['product_code'] = $data['product_code'] ?? ('API-'.strtoupper(Str::random(8)));
            $data['slug'] = $data['slug'] ?? Str::slug($data['name'] ?? 'product').'-'.strtolower(Str::random(6));
            $data['status'] = $data['status'] ?? 'active';
        }

        return $data;
    }

    /**
     * Validation failure response.
     *
     * NOTE: BaseApiController::validationErrorResponse() expects a Validator
     * but callers historically passed $validator->errors() (a MessageBag),
     * which crashed with a 500 on every API validation failure. This local
     * helper returns the correct 422 + errors payload without changing the
     * shared base class (other modules are out of scope here).
     */
    private function validationFailure($validator): JsonResponse
    {
        return $this->errorResponse('Validation failed', 422, $validator->errors());
    }

    /**
     * Shared Product Domain rules for the API.
     *
     * Delegates the product_type / parent_id semantics to the ONE authoritative
     * contract (Products::domainRules) so web and API validation cannot drift.
     * $partial = true switches to PATCH-style "sometimes" rules.
     */
    private function productRules(bool $partial = false): array
    {
        $mode = $partial ? 'sometimes' : 'required';

        return array_merge(
            Products::domainRules($mode),
            [
                'name' => $partial ? 'sometimes|required|string|max:255' : 'required|string|max:255',
                'description' => 'nullable|string',
                'sku' => $partial
                    ? 'sometimes|required|string|unique:products,sku,' . request()->route('id')
                    : 'required|string|unique:products,sku',
                'price' => $partial ? 'sometimes|required|numeric|min:0' : 'required|numeric|min:0',
                'cost_price' => 'nullable|numeric|min:0',
                'stock_quantity' => $partial ? 'sometimes|required|integer|min:0' : 'required|integer|min:0',
                'min_stock_level' => 'nullable|integer|min:0',
                'category_id' => 'nullable|exists:categories,id',
                'brand_id' => 'nullable|exists:brands,id',
                'status' => $partial ? 'sometimes|required|in:active,inactive,draft' : 'required|in:active,inactive,draft',
                'weight' => 'nullable|numeric|min:0',
                'dimensions' => 'nullable|json',
                'images' => 'nullable|array',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
                'attributes' => 'nullable|json',
            ]
        );
    }
}
