<?php

namespace App\Services;

use App\Models\Products;
use Illuminate\Support\Facades\DB;
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
     *
     * Company isolation (Phase 1): the product must belong to the caller's
     * company (404 otherwise). Legacy rows without a company are refused for
     * writes — stock is company-owned data.
     *
     * Phase 10 (updateStock hole closed): products.quantity is maintained by
     * the movement engine only. Every mutation is routed through the
     * WAC-routed stock adjustment engine (movement document + ICT + derived
     * quantity + GL where configured) instead of raw increment/decrement/
     * update. 'set' becomes a signed delta against the current global
     * quantity; the engine refuses deltas that would drive a WAC balance
     * negative (e.g. subtract beyond stock), and draft + approval commit
     * atomically — a refused mutation leaves nothing behind.
     */
    public function updateStock(int $id, int $quantity, string $operation = 'set'): Model
    {
        $product = $this->model->newQuery()
            ->whereKey($id)
            ->where('company_id', auth()->user()?->company_id)
            ->firstOrFail();

        // Product Domain (Phase 1): services never hold stock quantities.
        if (! $product->managesStock()) {
            return $product->fresh();
        }

        $current = (float) $product->quantity;
        $target = match ($operation) {
            'add' => $current + $quantity,
            'subtract' => $current - $quantity,
            default => (float) $quantity,
        };
        $delta = round($target - $current, 6);

        if (abs($delta) < 0.000001) {
            return $product->fresh(); // no-op — do not emit empty adjustments
        }

        $adjustmentService = app(\App\Services\Inventory\StockAdjustmentService::class);

        // Atomic end-to-end: draft + approval commit together, so a ledger
        // refusal (e.g. subtract beyond available WAC stock) leaves NO
        // document behind — not even a draft.
        DB::transaction(function () use ($product, $delta, $adjustmentService) {
            $adjustment = $adjustmentService->createAdjustment([
                'warehouse_id' => $this->resolveStockWarehouse($product),
                'adjustment_date' => now()->toDateString(),
                'reason' => 'correction',
                'description' => 'API update-stock',
                'items' => [[
                    'product_id' => $product->id,
                    'unit_id' => (int) $product->unit_id,
                    'adjustment_quantity' => $delta,
                    'unit_cost' => (float) $product->cost_per_item,
                ]],
            ]);
            $adjustmentService->approveAdjustment((int) $adjustment->id);
        });

        return $product->fresh();
    }

    /**
     * Warehouse an engine-routed stock mutation applies at: the warehouse
     * holding the product's largest WAC balance, else the company's first
     * active warehouse (never-stocked products).
     */
    private function resolveStockWarehouse(Products $product): int
    {
        $companyId = (int) auth()->user()?->company_id;

        $balanceWarehouse = DB::table('inventory_cost_balances')
            ->where('company_id', $companyId)
            ->where('product_id', $product->id)
            ->orderByDesc('quantity')
            ->value('warehouse_id');

        if ($balanceWarehouse) {
            return (int) $balanceWarehouse;
        }

        $fallback = DB::table('warehouses')
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->orderBy('id')
            ->value('id');

        if (! $fallback) {
            throw new \RuntimeException(
                'No active warehouse exists for this company; introduce stock through Opening Stock or a GRN first.'
            );
        }

        return (int) $fallback;
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(array $ids, string $status): int
    {
        return $this->model->whereIn('id', $ids)->update(['status' => $status]);
    }

    /**
     * Bulk delete with full Product lifecycle integrity (Phase 1).
     *
     * The generic BaseService::bulkDelete() runs a query-level delete which
     * bypasses the Products model events that keep the domain consistent
     * (variations_count resync, product_variations / product_variation_items
     * cleanup). This override deletes each Product through Eloquent so the
     * model lifecycle runs, inside one transaction: every delete succeeds or
     * nothing changes.
     *
     * Deletion order is irrelevant for correctness — the model events resync
     * the parent counter against children() on every delete — but children
     * are deleted before their parents so the parent-delete guard in
     * ProductsController::destroy() semantics stay coherent when a family is
     * bulk-deleted together.
     */
    public function bulkDelete(array $ids): int
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));

        if ($ids === []) {
            return 0;
        }

        return DB::transaction(function () use ($ids) {
            $products = Products::withTrashed()->whereIn('id', $ids)->get();

            // Children first, then parents: a parent whose children are in the
            // same request is only deleted once its variation SKUs are gone.
            $children = $products->filter(fn ($p) => $p->parent_id !== null)->values();
            $standalone = $products->filter(fn ($p) => $p->parent_id === null)->values();

            $count = 0;
            foreach ($children->merge($standalone) as $product) {
                if ($product->trashed()) {
                    continue; // already deleted — not counted as a new deletion
                }

                $product->delete(); // fires Products::deleted lifecycle
                $count++;
            }

            return $count;
        });
    }
}