<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Client_Sales\SalesOrder;
use App\Models\Client_Sales\SalesQuotation;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\PriceListItem;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Administration screen for the existing price list architecture
 * (price_lists + price_list_items).
 *
 * This controller only maintains pricing data. It never resolves a selling
 * price: ProductPriceResolver remains the single pricing authority, and
 * UnitConversionService remains the single conversion authority.
 */
class PriceListController extends Controller
{
    private const PRICE_TYPES = ['retail', 'wholesale', 'special', 'promotional', 'contract'];

    private const ROUNDING_METHODS = ['none', 'normal', 'up', 'down'];

    private const ITEM_STATUSES = ['active', 'scheduled', 'expired'];

    private const LIST_SORTABLE = ['id', 'code', 'name_en', 'price_type', 'valid_from', 'valid_to', 'is_active', 'items_count'];

    private const ITEM_SORTABLE = ['id', 'min_quantity', 'unit_price', 'final_price', 'effective_date', 'expiry_date', 'product_id'];

    /**
     * Price lists (server-side paginated listing).
     */
    public function index(Request $request)
    {
        $filters = $this->listFilters($request);
        $today = Carbon::now()->format('Y-m-d');

        $query = PriceList::query()
            ->with(['currency:id,code,name,symbol'])
            ->withCount('items')
            ->addSelect([
                'assigned_customers_count' => Customer::query()
                    ->selectRaw('count(*)')
                    ->whereColumn('customers.price_list_id', 'price_lists.id'),
                'assigned_groups_count' => CustomerGroup::query()
                    ->selectRaw('count(*)')
                    ->whereColumn('customer_groups.price_list_id', 'price_lists.id'),
            ]);

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        if ($filters['status'] !== '') {
            $query->where('is_active', $filters['status'] === 'active');
        }

        if ($filters['price_type'] !== '') {
            $query->where('price_type', $filters['price_type']);
        }

        if ($filters['currency_id'] !== '') {
            $query->where('currency_id', (int) $filters['currency_id']);
        }

        switch ($filters['validity']) {
            case 'valid':
                $query->where('valid_from', '<=', $today)
                    ->where(function ($q) use ($today) {
                        $q->whereNull('valid_to')->orWhere('valid_to', '>=', $today);
                    });
                break;
            case 'scheduled':
                $query->where('valid_from', '>', $today);
                break;
            case 'expired':
                $query->whereNotNull('valid_to')->where('valid_to', '<', $today);
                break;
        }

        $query->orderBy($filters['sort_by'], $filters['sort_dir']);

        $priceLists = $query->paginate($filters['per_page'])->withQueryString();

        return Inertia::render('Backend/03-Inventory/PriceLists', [
            'mode' => 'list',
            'priceLists' => $priceLists,
            'currencies' => $this->currencyOptions(),
            'priceTypes' => self::PRICE_TYPES,
            'roundingMethods' => self::ROUNDING_METHODS,
            'stats' => [
                'total' => PriceList::count(),
                'active' => PriceList::where('is_active', true)->count(),
                'scheduled' => PriceList::where('valid_from', '>', $today)->count(),
                'expired' => PriceList::whereNotNull('valid_to')->where('valid_to', '<', $today)->count(),
                'items' => PriceListItem::count(),
            ],
            'nextCode' => $this->nextCode(),
            'filters' => $filters,
        ]);
    }

    /**
     * Dedicated create page for a new price list header.
     */
    public function create()
    {
        return Inertia::render('Backend/03-Inventory/PriceLists', [
            'mode' => 'create',
            'currencies' => $this->currencyOptions(),
            'priceTypes' => self::PRICE_TYPES,
            'roundingMethods' => self::ROUNDING_METHODS,
            'nextCode' => $this->nextCode(),
        ]);
    }

    /**
     * A single price list with its configured pricing items (tiers).
     */
    public function show(Request $request, PriceList $priceList)
    {
        $priceList->load(['currency:id,code,name,symbol']);

        $filters = $this->itemFilters($request);
        $today = Carbon::now()->format('Y-m-d');

        $itemsQuery = PriceListItem::query()
            ->where('price_list_id', $priceList->id)
            ->with([
                'product' => function ($query) {
                    $query->select([
                        'id', 'name', 'sku', 'barcode', 'product_code', 'unit_id',
                        'price', 'sale_price', 'product_type', 'is_variation', 'parent_id', 'status',
                    ])->withCount('children');
                },
                'unit:id,name,conversion_factor,unit_type,base_unit',
                'unit.parent:id,name,conversion_factor',
            ]);

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $itemsQuery->where(function ($q) use ($search) {
                $q->whereHas('product', function ($productQuery) use ($search) {
                    $productQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('product_code', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            });
        }

        if ($filters['product_id'] !== '') {
            $itemsQuery->where('product_id', (int) $filters['product_id']);
        }

        if ($filters['unit_id'] !== '') {
            $itemsQuery->where('unit_id', (int) $filters['unit_id']);
        }

        $this->applyItemStatusFilter($itemsQuery, $filters['item_status'], $today);

        $itemsQuery->orderBy($filters['sort_by'], $filters['sort_dir']);

        $items = $itemsQuery->paginate($filters['per_page'])->withQueryString();

        // Display-only validity status, derived server side with the same date
        // rules ProductPriceResolver applies (no pricing arithmetic happens here).
        $items->through(function (PriceListItem $item) use ($today) {
            $row = $item->toArray();
            $row['status'] = $this->itemStatus($item, $today);
            $row['product'] = $item->product ? array_merge($item->product->toArray(), [
                'children_count' => (int) ($item->product->children_count ?? 0),
                'is_parent_with_children' => (int) ($item->product->children_count ?? 0) > 0,
            ]) : null;
            $row['unit'] = $item->unit ? array_merge($item->unit->toArray(), [
                'parent' => $item->unit->parent ? $item->unit->parent->only(['id', 'name', 'conversion_factor']) : null,
            ]) : null;

            return $row;
        });

        $tierProducts = PriceListItem::query()
            ->where('price_list_id', $priceList->id)
            ->with(['product:id,name,sku'])
            ->select('product_id', 'unit_id')
            ->selectRaw('count(*) as tiers_count')
            ->selectRaw('min(min_quantity) as min_quantity_from')
            ->groupBy('product_id', 'unit_id')
            ->orderBy('product_id')
            ->get()
            ->map(function (PriceListItem $row) {
                return [
                    'product_id' => $row->product_id,
                    'product_name' => $row->product?->name,
                    'product_sku' => $row->product?->sku,
                    'unit_id' => $row->unit_id,
                    'tiers_count' => (int) $row->tiers_count,
                    'min_quantity_from' => $row->min_quantity_from,
                ];
            })
            ->values();

        // Quantity tier ladder for the product currently filtered on, so the
        // configured "1+ / 10+ / 50+" steps are readable at a glance.
        $tierLadder = [];
        if ($filters['product_id'] !== '') {
            $tierLadder = PriceListItem::query()
                ->where('price_list_id', $priceList->id)
                ->where('product_id', (int) $filters['product_id'])
                ->with(['unit:id,name,conversion_factor'])
                ->orderBy('min_quantity')
                ->orderBy('unit_id')
                ->get()
                ->map(function (PriceListItem $item) use ($today) {
                    return [
                        'id' => $item->id,
                        'unit_id' => $item->unit_id,
                        'unit_name' => $item->unit?->name,
                        'min_quantity' => $item->min_quantity,
                        'unit_price' => $item->unit_price,
                        'discount_percentage' => $item->discount_percentage,
                        'discount_amount' => $item->discount_amount,
                        // Stored generated column written by the database.
                        'final_price' => $item->final_price,
                        'status' => $this->itemStatus($item, $today),
                    ];
                })
                ->values()
                ->all();
        }

        return Inertia::render('Backend/03-Inventory/PriceLists', [
            'mode' => 'detail',
            'priceList' => array_merge($priceList->toArray(), [
                'currency' => $priceList->currency?->only(['id', 'code', 'name', 'symbol']),
            ]),
            'items' => $items,
            'tierProducts' => $tierProducts,
            'tierLadder' => $tierLadder,
            'units' => $this->unitOptions(),
            'priceTypes' => self::PRICE_TYPES,
            'assigned' => [
                'customers' => Customer::where('price_list_id', $priceList->id)->count(),
                'groups' => CustomerGroup::where('price_list_id', $priceList->id)->count(),
            ],
            'stats' => [
                'tiers' => PriceListItem::where('price_list_id', $priceList->id)->count(),
                'products' => PriceListItem::where('price_list_id', $priceList->id)->distinct()->count('product_id'),
                'active' => PriceListItem::where('price_list_id', $priceList->id)
                    ->where(function ($q) use ($today) {
                        $q->whereNull('effective_date')->orWhere('effective_date', '<=', $today);
                    })
                    ->where(function ($q) use ($today) {
                        $q->whereNull('expiry_date')->orWhere('expiry_date', '>=', $today);
                    })
                    ->count(),
                'expired' => PriceListItem::where('price_list_id', $priceList->id)
                    ->whereNotNull('expiry_date')
                    ->where('expiry_date', '<', $today)
                    ->count(),
            ],
            'filters' => $filters,
        ]);
    }

    /**
     * Dedicated edit page for a price list header.
     */
    public function edit(PriceList $priceList)
    {
        $priceList->load(['currency:id,code,name,symbol']);

        return Inertia::render('Backend/03-Inventory/PriceLists', [
            'mode' => 'edit',
            'priceList' => $priceList,
            'currencies' => $this->currencyOptions(),
            'priceTypes' => self::PRICE_TYPES,
            'roundingMethods' => self::ROUNDING_METHODS,
        ]);
    }

    /**
     * Create a price list header.
     */
    public function store(Request $request)
    {
        $validated = $this->validateList($request);

        $priceList = DB::transaction(function () use ($validated) {
            $validated['code'] = ($validated['code'] ?? null) ?: $this->nextCode();
            $validated['created_by'] = Auth::id();

            return PriceList::create($validated);
        });

        return redirect()
            ->route('admin.inventory.price-lists.index')
            ->with('success', __('PriceLists.created_success'));
    }

    /**
     * Update a price list header.
     */
    public function update(Request $request, PriceList $priceList)
    {
        $validated = $this->validateList($request, $priceList);

        $priceList->update($validated);

        return redirect()
            ->route('admin.inventory.price-lists.index')
            ->with('success', __('PriceLists.updated_success'));
    }

    /**
     * Delete a price list (soft delete, protected against referenced documents).
     */
    public function destroy(PriceList $priceList)
    {
        $referenced = SalesQuotation::where('price_list_id', $priceList->id)->exists()
            || SalesOrder::where('price_list_id', $priceList->id)->exists()
            || SalesInvoice::where('price_list_id', $priceList->id)->exists();

        if ($referenced) {
            return redirect()->back()->withErrors([
                'price_list' => __('PriceLists.delete_blocked_documents'),
            ]);
        }

        $assignedCustomers = Customer::where('price_list_id', $priceList->id)->count();
        $assignedGroups = CustomerGroup::where('price_list_id', $priceList->id)->count();

        // price_list_items cascade on hard delete only, and the list is soft
        // deleted, so the configured tiers are intentionally left intact.
        $priceList->delete();

        return redirect()->back()->with('success', __('PriceLists.deleted_success', [
            'customers' => $assignedCustomers,
            'groups' => $assignedGroups,
        ]));
    }

    /**
     * Add a pricing item (quantity tier) to a price list.
     */
    public function storeItem(Request $request, PriceList $priceList)
    {
        $validated = $this->validateItem($request, $priceList);

        DB::transaction(function () use ($validated, $priceList) {
            PriceListItem::create(array_merge($validated, [
                'price_list_id' => $priceList->id,
            ]));
        });

        return redirect()->back()->with('success', __('PriceLists.item_created_success'));
    }

    /**
     * Update a pricing item.
     */
    public function updateItem(Request $request, PriceList $priceList, PriceListItem $item)
    {
        $this->assertItemBelongsTo($priceList, $item);

        $validated = $this->validateItem($request, $priceList, $item);

        $item->update($validated);

        return redirect()->back()->with('success', __('PriceLists.item_updated_success'));
    }

    /**
     * Remove a pricing item.
     */
    public function destroyItem(PriceList $priceList, PriceListItem $item)
    {
        $this->assertItemBelongsTo($priceList, $item);

        $item->delete();

        return redirect()->back()->with('success', __('PriceLists.item_deleted_success'));
    }

    /**
     * Product lookup for the item editor (existing Products architecture: products.id).
     */
    public function searchProducts(Request $request)
    {
        $search = trim((string) $request->input('query', ''));

        $products = Products::query()
            ->with(['unit:id,name,conversion_factor,base_unit'])
            ->withCount('children')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('product_code', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->select([
                'id', 'name', 'sku', 'barcode', 'product_code', 'unit_id',
                'price', 'sale_price', 'cost_per_item', 'product_type', 'is_variation', 'parent_id', 'status',
            ])
            ->orderBy('name')
            ->limit(25)
            ->get()
            ->map(function (Products $product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'product_code' => $product->product_code,
                    'unit_id' => $product->unit_id,
                    'unit_name' => $product->unit?->name,
                    'price' => $product->price,
                    'sale_price' => $product->sale_price,
                    'product_type' => $product->product_type,
                    'is_variation' => (bool) $product->is_variation,
                    'parent_id' => $product->parent_id,
                    'children_count' => (int) ($product->children_count ?? 0),
                    'status' => $product->status,
                ];
            })
            ->values();

        return response()->json(['products' => $products]);
    }

    /* ---------------------------------------------------------------------
     |  Helpers
     --------------------------------------------------------------------- */

    private function validateList(Request $request, ?PriceList $priceList = null): array
    {
        $validated = $request->validate([
            'code' => [
                'nullable', 'string', 'max:20',
                Rule::unique('price_lists', 'code')->ignore($priceList?->id),
            ],
            'name_ar' => ['required', 'string', 'max:100'],
            'name_en' => ['nullable', 'string', 'max:100'],
            'currency_id' => ['required', 'integer', 'exists:currencies,id'],
            'price_type' => ['required', Rule::in(self::PRICE_TYPES)],
            'valid_from' => ['required', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'rounding_method' => ['nullable', Rule::in(self::ROUNDING_METHODS)],
            'rounding_factor' => ['nullable', 'numeric', 'gte:0'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $validated['rounding_method'] = $validated['rounding_method'] ?? 'none';
        $validated['rounding_factor'] = $validated['rounding_factor'] ?? 0.05;
        $validated['is_default'] = (bool) ($validated['is_default'] ?? false);
        $validated['is_active'] = (bool) ($validated['is_active'] ?? true);

        return $validated;
    }

    private function validateItem(Request $request, PriceList $priceList, ?PriceListItem $item = null): array
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'min_quantity' => ['required', 'numeric', 'gt:0'],
            'unit_price' => ['required', 'numeric', 'gte:0'],
            'discount_percentage' => ['nullable', 'numeric', 'gte:0', 'lte:100'],
            'discount_amount' => ['nullable', 'numeric', 'gte:0'],
            'effective_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:effective_date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'min_quantity.gt' => __('PriceLists.min_quantity_positive'),
        ]);

        // unique(price_list_id, product_id, unit_id, min_quantity)
        $duplicate = PriceListItem::query()
            ->where('price_list_id', $priceList->id)
            ->where('product_id', $validated['product_id'])
            ->where('unit_id', $validated['unit_id'])
            ->where('min_quantity', $validated['min_quantity'])
            ->when($item !== null, function ($query) use ($item) {
                $query->where('id', '!=', $item->id);
            })
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'min_quantity' => __('PriceLists.duplicate_tier'),
            ]);
        }

        $validated['discount_percentage'] = $validated['discount_percentage'] ?? 0;
        $validated['discount_amount'] = $validated['discount_amount'] ?? 0;

        return $validated;
    }

    private function assertItemBelongsTo(PriceList $priceList, PriceListItem $item): void
    {
        if ((int) $item->price_list_id !== (int) $priceList->id) {
            throw ValidationException::withMessages([
                'item' => __('PriceLists.item_not_in_list'),
            ]);
        }
    }

    private function listFilters(Request $request): array
    {
        $sortBy = (string) $request->input('sort_by', 'id');
        $sortDir = strtolower((string) $request->input('sort_dir', 'desc'));

        return [
            'search' => trim((string) $request->input('search', '')),
            'status' => in_array($request->input('status'), ['active', 'inactive'], true) ? (string) $request->input('status') : '',
            'price_type' => in_array($request->input('price_type'), self::PRICE_TYPES, true) ? (string) $request->input('price_type') : '',
            'currency_id' => $request->filled('currency_id') ? (string) $request->input('currency_id') : '',
            'validity' => in_array($request->input('validity'), ['valid', 'scheduled', 'expired'], true) ? (string) $request->input('validity') : '',
            'sort_by' => in_array($sortBy, self::LIST_SORTABLE, true) ? $sortBy : 'id',
            'sort_dir' => $sortDir === 'asc' ? 'asc' : 'desc',
            'per_page' => $this->perPage($request),
        ];
    }

    private function itemFilters(Request $request): array
    {
        $sortBy = (string) $request->input('sort_by', 'min_quantity');
        $sortDir = strtolower((string) $request->input('sort_dir', 'asc'));

        return [
            'search' => trim((string) $request->input('search', '')),
            'product_id' => $request->filled('product_id') ? (string) $request->input('product_id') : '',
            'unit_id' => $request->filled('unit_id') ? (string) $request->input('unit_id') : '',
            'item_status' => in_array($request->input('item_status'), self::ITEM_STATUSES, true) ? (string) $request->input('item_status') : '',
            'sort_by' => in_array($sortBy, self::ITEM_SORTABLE, true) ? $sortBy : 'min_quantity',
            'sort_dir' => $sortDir === 'desc' ? 'desc' : 'asc',
            'per_page' => $this->perPage($request),
        ];
    }

    private function perPage(Request $request): int
    {
        return max(5, min(100, (int) $request->input('per_page', 10)));
    }

    private function applyItemStatusFilter(Builder $query, string $status, string $today): void
    {
        switch ($status) {
            case 'active':
                $query->where(function ($q) use ($today) {
                    $q->whereNull('effective_date')->orWhere('effective_date', '<=', $today);
                })->where(function ($q) use ($today) {
                    $q->whereNull('expiry_date')->orWhere('expiry_date', '>=', $today);
                });
                break;
            case 'scheduled':
                $query->whereNotNull('effective_date')->where('effective_date', '>', $today);
                break;
            case 'expired':
                $query->whereNotNull('expiry_date')->where('expiry_date', '<', $today);
                break;
        }
    }

    /**
     * Date validity of a price list item, mirroring the date checks in
     * ProductPriceResolver (display metadata only).
     */
    private function itemStatus(PriceListItem $item, string $today): string
    {
        if ($item->effective_date !== null && (string) $item->effective_date > $today) {
            return 'scheduled';
        }

        if ($item->expiry_date !== null && (string) $item->expiry_date < $today) {
            return 'expired';
        }

        return 'active';
    }

    private function nextCode(): string
    {
        $lastId = (int) (PriceList::withTrashed()->max('id') ?? 0);

        return 'PL-'.str_pad((string) ($lastId + 1), 4, '0', STR_PAD_LEFT);
    }

    private function currencyOptions()
    {
        return Currency::query()
            ->select('id', 'code', 'name', 'symbol', 'is_base', 'status')
            ->orderBy('code')
            ->get();
    }

    private function unitOptions()
    {
        return ItemUnit::query()
            ->with(['parent:id,name,conversion_factor'])
            ->select('id', 'name', 'unit_type', 'base_unit', 'conversion_factor', 'active')
            ->orderBy('name')
            ->get()
            ->map(function (ItemUnit $unit) {
                return [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'unit_type' => $unit->unit_type,
                    'base_unit' => $unit->base_unit,
                    'conversion_factor' => $unit->conversion_factor,
                    'active' => $unit->active,
                    'parent' => $unit->parent ? $unit->parent->only(['id', 'name', 'conversion_factor']) : null,
                ];
            });
    }
}
