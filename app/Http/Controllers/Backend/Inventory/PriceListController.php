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
use App\Models\ProductVariation;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\PriceListItem;
use App\Exports\PriceListItemsExport;
use App\Services\CompanyContext;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

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

    private const ITEM_SORTABLE = ['name', 'sku', 'pricing_items_count'];

    public function __construct(private CompanyContext $companyContext) {}

    /**
     * Company scope helper: master data keeps the established
     * "company_id = active OR NULL" convention (same as UnitConversionService).
     */
    private function scopeCompany($query, ?int $companyId = null)
    {
        $companyId ??= $this->companyContext->id();

        return $query->where(function ($q) use ($companyId) {
            $q->where('company_id', $companyId)->orWhereNull('company_id');
        });
    }

    /**
     * Price lists (server-side paginated listing).
     */
    public function index(Request $request)
    {
        $filters = $this->listFilters($request);
        $today = Carbon::now()->format('Y-m-d');
        $companyId = $this->companyContext->id();

        $query = $this->scopeCompany(PriceList::query())
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
                'total' => $this->scopeCompany(PriceList::query(), $companyId)->count(),
                'active' => $this->scopeCompany(PriceList::query(), $companyId)->where('is_active', true)->count(),
                'scheduled' => $this->scopeCompany(PriceList::query(), $companyId)->where('valid_from', '>', $today)->count(),
                'expired' => $this->scopeCompany(PriceList::query(), $companyId)->whereNotNull('valid_to')->where('valid_to', '<', $today)->count(),
                'items' => PriceListItem::query()
                    ->whereHas('priceList', fn ($q) => $this->scopeCompany($q, $companyId))
                    ->count(),
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
     * A single price list with one row per eligible product and its pricing records.
     */
    public function show(Request $request, PriceList $priceList)
    {
        $this->assertOwnedPriceList($priceList);
        $priceList->load(['currency:id,code,name,symbol']);

        $filters = $this->itemFilters($request);
        $today = Carbon::now()->format('Y-m-d');
        $companyId = $this->companyContext->id();
        $priceListId = (int) $priceList->id;

        $applyPriceRecordFilters = function ($query, bool $includeValidity = true) use ($priceListId, $filters, $today) {
            $query->selectRaw('1')
                ->from('price_list_items')
                ->where('price_list_items.price_list_id', $priceListId)
                ->whereColumn('price_list_items.product_id', 'products.id');

            if ($filters['unit_id'] !== '') {
                $query->where('price_list_items.unit_id', (int) $filters['unit_id']);
            }

            if ($includeValidity) {
                switch ($filters['item_status']) {
                    case 'active':
                        $query->where(function ($dateQuery) use ($today) {
                            $dateQuery->whereNull('price_list_items.effective_date')
                                ->orWhere('price_list_items.effective_date', '<=', $today);
                        })->where(function ($dateQuery) use ($today) {
                            $dateQuery->whereNull('price_list_items.expiry_date')
                                ->orWhere('price_list_items.expiry_date', '>=', $today);
                        });
                        break;
                    case 'scheduled':
                        $query->whereNotNull('price_list_items.effective_date')
                            ->where('price_list_items.effective_date', '>', $today);
                        break;
                    case 'expired':
                        $query->whereNotNull('price_list_items.expiry_date')
                            ->where('price_list_items.expiry_date', '<', $today);
                        break;
                }
            }
        };

        $countQuery = PriceListItem::query()
            ->selectRaw('count(*)')
            ->where('price_list_id', $priceListId)
            ->whereColumn('price_list_items.product_id', 'products.id');
        if ($filters['unit_id'] !== '') {
            $countQuery->where('unit_id', (int) $filters['unit_id']);
        }

        $totalRecordsQuery = PriceListItem::query()
            ->selectRaw('count(*)')
            ->where('price_list_id', $priceListId)
            ->whereColumn('price_list_items.product_id', 'products.id');

        $productsQuery = $this->eligibleSellableProductsQuery($companyId)
            ->with([
                'unit:id,name,conversion_factor,unit_type,base_unit',
                'unit.parent:id,name,conversion_factor',
                'brand:id,name',
                'parent:id,name,brand_id,product_type',
                'parent.brand:id,name',
            ])
            ->select([
                'products.id', 'products.name', 'products.sku', 'products.barcode',
                'products.product_code', 'products.unit_id', 'products.brand_id',
                'products.product_type', 'products.is_variation', 'products.parent_id',
                'products.status', 'products.company_id',
            ])
            ->selectSub($countQuery, 'pricing_items_count');
        $productsQuery->selectSub($totalRecordsQuery, 'total_pricing_records_count');

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $productsQuery->where(function ($query) use ($search) {
                $query->where('products.name', 'like', "%{$search}%")
                    ->orWhere('products.sku', 'like', "%{$search}%")
                    ->orWhere('products.product_code', 'like', "%{$search}%")
                    ->orWhere('products.barcode', 'like', "%{$search}%")
                    ->orWhereHas('parent', fn ($parentQuery) => $parentQuery
                        ->where('name', 'like', "%{$search}%"))
                    ->orWhereExists(function ($variationQuery) use ($search) {
                        $variationQuery->selectRaw('1')
                            ->from('product_variations')
                            ->join('product_variation_items as variation_items', 'variation_items.variation_id', '=', 'product_variations.id')
                            ->join('item_attributes_details as attribute_details', function ($join) {
                                $join->on('attribute_details.id', '=', 'variation_items.attribute_value')
                                    ->on('attribute_details.attribute_set_id', '=', 'variation_items.attribute_id');
                            })
                            ->whereColumn('product_variations.product_id', 'products.id')
                            ->whereColumn('product_variations.configurable_product_id', 'products.parent_id')
                            ->whereNull('attribute_details.deleted_at')
                            ->where('attribute_details.title', 'like', "%{$search}%");
                    });
            });
        }

        if ($filters['product_id'] !== '') {
            $productsQuery->where('products.id', (int) $filters['product_id']);
        }

        if ($filters['price_status'] === 'with_price') {
            $productsQuery->whereExists(fn ($query) => $applyPriceRecordFilters($query));
        } elseif ($filters['price_status'] === 'without_price') {
            $productsQuery->whereNotExists(fn ($query) => $applyPriceRecordFilters($query, false));
        } elseif ($filters['item_status'] !== '') {
            $productsQuery->whereExists(fn ($query) => $applyPriceRecordFilters($query));
        }

        if ($filters['item_status'] !== '' && $filters['price_status'] === 'without_price') {
            $productsQuery->whereRaw('1 = 0');
        }

        $products = $productsQuery
            ->orderBy($filters['sort_by'] === 'pricing_items_count'
                ? 'pricing_items_count'
                : 'products.'.$filters['sort_by'], $filters['sort_dir'])
            ->orderBy('products.id')
            ->paginate($filters['per_page'])
            ->withQueryString();

        $displayNames = $this->variationDisplayNames($products->getCollection());
        $productUnitOptions = $this->unitOptionsByProducts($products->getCollection(), $companyId);
        $products->through(function (Products $product) use ($displayNames, $productUnitOptions) {
            $displayName = $displayNames[$product->id] ?? $product->name;
            $row = $product->only([
                'id', 'name', 'sku', 'barcode', 'product_code', 'unit_id',
                'product_type', 'is_variation', 'parent_id', 'status',
            ]);
            $row['unit'] = $product->unit
                ? array_merge($product->unit->only([
                    'id', 'name', 'conversion_factor', 'unit_type', 'base_unit',
                ]), [
                    'parent' => $product->unit->parent?->only(['id', 'name', 'conversion_factor']),
                ])
                : null;
            $row['unit_options'] = $productUnitOptions[$product->id] ?? [];
            $row['display_name'] = $displayName;
            $row['pricing_items_count'] = (int) $product->pricing_items_count;
            $row['total_pricing_records_count'] = (int) $product->total_pricing_records_count;
            $row['price_status'] = $row['pricing_items_count'] > 0 ? 'with_price' : 'without_price';

            return $row;
        });

        $productFilterProduct = null;
        if ($filters['product_id'] !== '') {
            $selectedProducts = $this->eligibleSellableProductsQuery($companyId)
                ->with(['parent:id,name,brand_id,product_type', 'parent.brand:id,name', 'brand:id,name'])
                ->where('products.id', (int) $filters['product_id'])
                ->get(['products.id', 'products.name', 'products.sku', 'products.parent_id', 'products.product_type', 'products.brand_id']);
            $selectedNames = $this->variationDisplayNames($selectedProducts);
            if ($selectedProducts->isNotEmpty()) {
                $selectedProduct = $selectedProducts->first();
                $productFilterProduct = [
                    'id' => $selectedProduct->id,
                    'display_name' => $selectedNames[$selectedProduct->id] ?? $selectedProduct->name,
                    'sku' => $selectedProduct->sku,
                ];
            }
        }

        return Inertia::render('Backend/03-Inventory/PriceLists', [
            'mode' => 'detail',
            'priceList' => array_merge($priceList->toArray(), [
                'currency' => $priceList->currency?->only(['id', 'code', 'name', 'symbol']),
            ]),
            'products' => $products,
            'productFilterProduct' => $productFilterProduct,
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
     * Load all pricing records for one eligible product in a price list.
     */
    public function productItems(PriceList $priceList, Products $product)
    {
        $this->assertOwnedPriceList($priceList);
        $companyId = $this->companyContext->id();

        abort_unless(
            $this->eligibleSellableProductsQuery($companyId)
                ->where('products.id', $product->id)
                ->exists(),
            404
        );

        $today = Carbon::now()->format('Y-m-d');
        $items = PriceListItem::query()
            ->where('price_list_id', $priceList->id)
            ->where('product_id', $product->id)
            ->with(['unit:id,name,conversion_factor,unit_type,base_unit', 'unit.parent:id,name,conversion_factor'])
            ->orderBy('unit_id')
            ->orderBy('min_quantity')
            ->get()
            ->map(fn (PriceListItem $item) => [
                'id' => $item->id,
                'unit_id' => $item->unit_id,
                'unit' => $item->unit ? array_merge($item->unit->only([
                    'id', 'name', 'conversion_factor', 'unit_type', 'base_unit',
                ]), [
                    'parent' => $item->unit->parent?->only(['id', 'name', 'conversion_factor']),
                ]) : null,
                'min_quantity' => $item->min_quantity,
                'unit_price' => $item->unit_price,
                'discount_percentage' => $item->discount_percentage,
                'discount_amount' => $item->discount_amount,
                'final_price' => $item->final_price,
                'effective_date' => $item->effective_date?->toDateString(),
                'expiry_date' => $item->expiry_date?->toDateString(),
                'status' => $this->itemStatus($item, $today),
                'notes' => $item->notes,
            ])
            ->values();

        return response()->json(['items' => $items]);
    }

    /**
     * Export every pricing record in the selected price list.
     */
    public function exportItems(PriceList $priceList)
    {
        $this->assertOwnedPriceList($priceList);
        $priceList->load('currency:id,code');

        return Excel::download(
            new PriceListItemsExport($priceList),
            'price-list-'.$priceList->id.'.xlsx'
        );
    }

    /**
     * Import pricing tiers atomically into the selected price list.
     */
    public function importItems(Request $request, PriceList $priceList)
    {
        $this->assertOwnedPriceList($priceList);

        $rows = array_values($request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:5000'],
            'rows.*' => ['required', 'array'],
        ])['rows']);

        $rules = [
            'product_id' => ['required', 'integer'],
            'unit_id' => ['required', 'integer'],
            'min_quantity' => ['required', 'numeric', 'decimal:0,4', 'gt:0', 'max:99999999.9999'],
            'unit_price' => ['required', 'numeric', 'decimal:0,4', 'gte:0', 'max:99999999999.9999'],
            'discount_percentage' => ['nullable', 'numeric', 'decimal:0,2', 'gte:0', 'lte:100'],
            'discount_amount' => ['nullable', 'numeric', 'decimal:0,2', 'gte:0', 'max:9999999999999.99'],
            'effective_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:effective_date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];

        $validatedRows = [];
        $rowErrors = [];
        $batchTiers = [];

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $validator = Validator::make($row, $rules);

            if ($validator->fails()) {
                $rowErrors[] = __('PriceLists.import_row_error', [
                    'row' => $line,
                    'errors' => implode('; ', $validator->errors()->all()),
                ]);
                continue;
            }

            try {
                $validated = $this->validateItemData($validator->validated(), $priceList);
                $tierKey = implode(':', [
                    $validated['product_id'],
                    $validated['unit_id'],
                    number_format((float) $validated['min_quantity'], 4, '.', ''),
                ]);

                if (isset($batchTiers[$tierKey])) {
                    throw ValidationException::withMessages([
                        'min_quantity' => __('PriceLists.duplicate_tier'),
                    ]);
                }

                $batchTiers[$tierKey] = true;
                $validatedRows[] = $validated;
            } catch (ValidationException $exception) {
                $rowErrors[] = __('PriceLists.import_row_error', [
                    'row' => $line,
                    'errors' => implode('; ', collect($exception->errors())->flatten()->all()),
                ]);
            }
        }

        if ($rowErrors !== []) {
            throw ValidationException::withMessages([
                'rows' => $rowErrors,
            ]);
        }

        DB::transaction(function () use ($validatedRows, $priceList) {
            foreach ($validatedRows as $row) {
                PriceListItem::create($row + ['price_list_id' => $priceList->id]);
            }
        });

        return response()->json([
            'imported' => count($validatedRows),
            'message' => __('PriceLists.import_success', ['count' => count($validatedRows)]),
        ]);
    }

    /**
     * Dedicated edit page for a price list header.
     */
    public function edit(PriceList $priceList)
    {
        $this->assertOwnedPriceList($priceList);

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
        $this->assertOwnedPriceList($priceList);

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
        $this->assertOwnedPriceList($priceList);

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
        $this->assertOwnedPriceList($priceList);

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
        $this->assertOwnedPriceList($priceList);
        $this->assertItemBelongsTo($priceList, $item);

        $validated = $this->validateItem($request, $priceList, $item);

        DB::transaction(fn () => $item->update($validated));

        return redirect()->back()->with('success', __('PriceLists.item_updated_success'));
    }

    /**
     * Remove a pricing item.
     */
    public function destroyItem(PriceList $priceList, PriceListItem $item)
    {
        $this->assertOwnedPriceList($priceList);
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
        $companyId = $this->companyContext->id();

        $products = Products::query()
            ->where('company_id', $companyId)
            ->whereNull('parent_id')
            ->whereIn('product_type', Products::PRODUCT_TYPES)
            ->where('status', 'active')
            ->with([
                'unit:id,name,conversion_factor,base_unit',
                'brand:id,name',
                'variations.product' => function ($query) {
                    $query->select([
                        'id', 'name', 'sku', 'barcode', 'product_code', 'unit_id', 'brand_id',
                        'product_type', 'is_variation', 'parent_id', 'status',
                    ])->where('company_id', $this->companyContext->id())
                        ->where('status', 'active')
                        ->with(['unit:id,name,conversion_factor,base_unit', 'brand:id,name']);
                },
                'variations.items.attribute.details',
            ])
            ->withCount('children')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('product_code', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%")
                        ->orWhereHas('variations.product', function ($childQuery) use ($search) {
                            $childQuery->where('sku', 'like', "%{$search}%")
                                ->orWhere('product_code', 'like', "%{$search}%")
                                ->orWhere('barcode', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('variations.items.attribute.details', function ($detailQuery) use ($search) {
                            $detailQuery->where('item_attributes_details.title', 'like', "%{$search}%");
                        });
                });
            })
            ->select([
                'id', 'name', 'sku', 'barcode', 'product_code', 'unit_id', 'brand_id',
                'product_type', 'is_variation', 'parent_id', 'status',
            ])
            ->orderBy('name')
            ->limit(25)
            ->get();

        $selectableProducts = collect();
        $sellableProducts = collect();

        foreach ($products as $product) {
            if ($product->product_type !== Products::PRODUCT_TYPE_VARIATION) {
                $sellableProducts->push($product);
                $selectableProducts->push($this->priceListProductOption($product, $product->name));

                continue;
            }

            $validVariations = $product->variations
                ->filter(function (ProductVariation $variation) use ($product) {
                    $child = $variation->product;

                    return $child
                        && (int) $child->parent_id === (int) $product->id
                        && $child->product_type === Products::PRODUCT_TYPE_SIMPLE;
                })
                ->groupBy(fn (ProductVariation $variation) => (int) $variation->product_id);

            if ($validVariations->isEmpty()) {
                Log::warning('Variation product has no valid child products for price-list selection.', [
                    'product_id' => $product->id,
                ]);

                continue;
            }

            foreach ($validVariations as $childId => $links) {
                if ($links->count() !== 1) {
                    Log::warning('Child product has multiple variation links; omitted from price-list selection.', [
                        'product_id' => (int) $childId,
                        'configurable_product_id' => $product->id,
                        'variation_link_count' => $links->count(),
                    ]);

                    continue;
                }

                $variation = $links->first();
                $child = $variation->product;
                $attributeValues = $this->variationAttributeValues($variation);
                if (
                    $search !== ''
                    && ! $this->productMatchesSearch($product, $search)
                    && ! $this->variationMatchesSearch($child, $attributeValues, $search)
                ) {
                    continue;
                }

                $brand = $product->brand?->name ?: $child->brand?->name;
                $displayName = $this->compositeVariationName(
                    $product->name,
                    $attributeValues,
                    $brand
                );

                $sellableProducts->push($child);
                $selectableProducts->push($this->priceListProductOption($child, $displayName));
            }
        }

        $unitOptionsByProduct = $this->unitOptionsByProducts($sellableProducts, $companyId);
        $products = $selectableProducts
            ->sortBy(fn (array $product) => Str::lower($product['display_name']))
            ->take(25)
            ->map(function (array $product) use ($unitOptionsByProduct) {
                $product['unit_options'] = $unitOptionsByProduct[$product['id']] ?? [];

                return $product;
            })
            ->values();

        return response()->json(['products' => $products]);
    }

    /**
     * The product's unit_id identifies its head unit. item_units.base_unit is
     * a self-referencing FK; only active unit_type=2 children are selectable.
     *
     * @param  Collection<int, Products>  $products
     * @return array<int, array<int, array<string, mixed>>>
     */
    private function unitOptionsByProducts(Collection $products, int $companyId): array
    {
        $baseUnitIds = $products
            ->pluck('unit_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($baseUnitIds->isEmpty()) {
            return [];
        }

        $units = ItemUnit::query()
            ->where('active', true)
            ->where(function ($query) use ($companyId) {
                $query->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->where(function ($query) use ($baseUnitIds) {
                $query->whereIn('id', $baseUnitIds)
                    ->orWhereIn('base_unit', $baseUnitIds);
            })
            ->with('parent:id,name,conversion_factor')
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'unit_type', 'base_unit', 'conversion_factor', 'active', 'company_id'])
            ->groupBy('base_unit');

        $unitsById = $units->flatten(1)->keyBy('id');
        $optionsByProduct = [];

        foreach ($products as $product) {
            $baseId = (int) $product->unit_id;
            $base = $unitsById->get($baseId);
            if (! $base) {
                $optionsByProduct[$product->id] = [];

                continue;
            }

            $subunits = $units->get($baseId, collect())
                ->filter(
                    fn (ItemUnit $unit) => (int) $unit->unit_type === 2
                )
                ->unique('id')
                ->values();

            $nameCounts = $subunits
                ->countBy(fn (ItemUnit $unit) => Str::lower(trim($unit->name)));
            $options = $subunits->map(function (ItemUnit $unit) use ($nameCounts) {
                $name = trim($unit->name);
                $displayName = $nameCounts[Str::lower($name)] > 1
                    ? $name.' ('.trim((string) $unit->conversion_factor).')'
                    : $name;

                return [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'display_name' => $displayName,
                    'unit_type' => $unit->unit_type,
                    'base_unit' => $unit->base_unit,
                    'conversion_factor' => $unit->conversion_factor,
                    'active' => $unit->active,
                    'parent' => $unit->parent?->only(['id', 'name', 'conversion_factor']),
                ];
            });

            $labelCounts = $options->countBy(fn (array $unit) => Str::lower($unit['display_name']));
            $optionsByProduct[$product->id] = $options
                ->map(function (array $unit) use ($labelCounts) {
                    if ($labelCounts[Str::lower($unit['display_name'])] > 1) {
                        $unit['display_name'] .= ' (#'.$unit['id'].')';
                    }

                    return $unit;
                })
                ->values()
                ->all();
        }

        return $optionsByProduct;
    }

    /**
     * Sellable records are active root simple/service products and active
     * simple child SKUs connected to an active variation parent.
     */
    private function eligibleSellableProductsQuery(int $companyId): Builder
    {
        return Products::query()
            ->where('products.company_id', $companyId)
            ->where('products.status', 'active')
            ->where(function ($query) use ($companyId) {
                $query->where(function ($rootQuery) {
                    $rootQuery->whereNull('products.parent_id')
                        ->whereIn('products.product_type', [
                            Products::PRODUCT_TYPE_SIMPLE,
                            Products::PRODUCT_TYPE_SERVICE,
                        ]);
                })->orWhere(function ($variationQuery) use ($companyId) {
                    $variationQuery->where('products.product_type', Products::PRODUCT_TYPE_SIMPLE)
                        ->whereNotNull('products.parent_id')
                        ->whereExists(function ($parentQuery) use ($companyId) {
                            $parentQuery->selectRaw('1')
                                ->from('products as variation_parents')
                                ->whereColumn('variation_parents.id', 'products.parent_id')
                                ->where('variation_parents.company_id', $companyId)
                                ->where('variation_parents.product_type', Products::PRODUCT_TYPE_VARIATION)
                                ->where('variation_parents.status', 'active')
                                ->whereNull('variation_parents.deleted_at');
                        })
                        ->whereExists(function ($linkQuery) {
                            $linkQuery->selectRaw('1')
                                ->from('product_variations')
                                ->whereColumn('product_variations.product_id', 'products.id')
                                ->whereColumn('product_variations.configurable_product_id', 'products.parent_id');
                        })
                        ->whereRaw(
                            '(select count(*) from product_variations as selectable_variations where selectable_variations.product_id = products.id and selectable_variations.configurable_product_id = products.parent_id) = 1'
                        );
                });
            });
    }

    /**
     * Build display-only names for child SKUs without changing their stored names.
     *
     * @param  Collection<int, Products>  $products
     * @return array<int, string>
     */
    private function variationDisplayNames(Collection $products): array
    {
        $children = $products
            ->filter(fn ($product) => $product instanceof Products
                && $product->parent_id !== null
                && $product->product_type === Products::PRODUCT_TYPE_SIMPLE)
            ->keyBy(fn (Products $product) => (int) $product->id);

        if ($children->isEmpty()) {
            return [];
        }

        $variations = ProductVariation::query()
            ->with(['items.attribute.details'])
            ->whereIn('product_id', $children->keys())
            ->get()
            ->groupBy('product_id');

        $displayNames = [];

        foreach ($children as $child) {
            $parent = $child->parent;
            if (! $parent || $parent->product_type !== Products::PRODUCT_TYPE_VARIATION) {
                continue;
            }

            $links = $variations->get($child->id, collect())
                ->filter(fn (ProductVariation $variation) => (int) $variation->configurable_product_id === (int) $parent->id);

            if ($links->isEmpty()) {
                continue;
            }

            if ($links->count() !== 1) {
                Log::warning('Child product has multiple variation links; composite price-list name was omitted.', [
                    'product_id' => $child->id,
                    'configurable_product_id' => $parent->id,
                    'variation_link_count' => $links->count(),
                ]);

                continue;
            }

            $values = $this->variationAttributeValues($links->first());
            $brand = $parent->brand?->name ?: $child->brand?->name;
            $displayNames[$child->id] = $this->compositeVariationName($parent->name, $values, $brand);
        }

        return $displayNames;
    }

    private function variationAttributeValues(ProductVariation $variation): array
    {
        return $variation->items
            ->sort(function ($left, $right) {
                $leftOrder = $left->attribute?->order ?? PHP_INT_MAX;
                $rightOrder = $right->attribute?->order ?? PHP_INT_MAX;
                $order = $leftOrder <=> $rightOrder;

                return $order !== 0 ? $order : ((int) $left->attribute_id <=> (int) $right->attribute_id);
            })
            ->map(function ($item) {
                $detail = $item->attribute?->details
                    ->first(fn ($detail) => (int) $detail->id === (int) $item->attribute_value);

                return trim((string) ($detail?->title ?? ''));
            })
            ->filter(fn (string $value) => $value !== '')
            ->values()
            ->all();
    }

    private function productMatchesSearch(Products $product, string $search): bool
    {
        foreach ([$product->name, $product->sku, $product->product_code, $product->barcode] as $value) {
            if ($value !== null && Str::contains(Str::lower((string) $value), Str::lower($search))) {
                return true;
            }
        }

        return false;
    }

    private function variationMatchesSearch(Products $product, array $attributeValues, string $search): bool
    {
        if ($this->productMatchesSearch($product, $search)) {
            return true;
        }

        foreach ($attributeValues as $value) {
            if (Str::contains(Str::lower($value), Str::lower($search))) {
                return true;
            }
        }

        return false;
    }

    private function compositeVariationName(string $baseName, array $values, ?string $brand): string
    {
        $parts = [];

        foreach (array_merge([$baseName], $values, [$brand]) as $part) {
            $part = trim((string) ($part ?? ''));
            if ($part === '') {
                continue;
            }

            $normalizedPart = Str::lower($part);
            $normalizedParts = array_map(fn (string $existing) => Str::lower($existing), $parts);
            if (in_array($normalizedPart, $normalizedParts, true)) {
                continue;
            }

            $existingName = Str::lower(implode(', ', $parts));
            $partPattern = '/(?<![\pL\pN])'.preg_quote($normalizedPart, '/').'(?![\pL\pN])/u';
            if (preg_match($partPattern, $existingName) === 1) {
                continue;
            }

            $parts[] = $part;
        }

        return implode(', ', $parts);
    }

    private function priceListProductOption(Products $product, string $displayName): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'display_name' => $displayName,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'product_code' => $product->product_code,
            'unit_id' => $product->unit_id,
            'unit' => $product->unit?->only(['id', 'name', 'conversion_factor', 'base_unit']),
            'unit_name' => $product->unit?->name,
            'product_type' => $product->product_type,
            'is_variation' => (bool) $product->is_variation,
            'parent_id' => $product->parent_id,
            'children_count' => (int) ($product->children_count ?? 0),
            'status' => $product->status,
        ];
    }

    /* ---------------------------------------------------------------------
     |  Helpers
     --------------------------------------------------------------------- */

    /**
     * Route-model bound price lists must belong to the active company
     * (404, as the hardened Nationality/Profession controllers).
     */
    private function assertOwnedPriceList(PriceList $priceList): void
    {
        $companyId = $this->companyContext->id();

        if ($priceList->company_id !== null && (int) $priceList->company_id !== $companyId) {
            abort(404);
        }
    }

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

        if ($priceList === null) {
            $validated['company_id'] = $this->companyContext->id();
        }

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

        return $this->validateItemData($validated, $priceList, $item);
    }

    private function validateItemData(array $validated, PriceList $priceList, ?PriceListItem $item = null): array
    {
        $companyId = $this->companyContext->id();
        $isEligibleProduct = $this->eligibleSellableProductsQuery($companyId)
            ->where('products.id', (int) $validated['product_id'])
            ->exists();
        $isUnchangedCompanyProduct = $item !== null
            && (int) $item->product_id === (int) $validated['product_id']
            && Products::query()
                ->where('id', (int) $validated['product_id'])
                ->where('company_id', $companyId)
                ->exists();

        if (! $isEligibleProduct && ! $isUnchangedCompanyProduct) {
            throw ValidationException::withMessages([
                'product_id' => __('PriceLists.product_not_eligible'),
            ]);
        }

        $product = Products::query()
            ->where('id', (int) $validated['product_id'])
            ->first(['id', 'unit_id']);
        $allowedUnitIds = $product
            ? collect($this->unitOptionsByProducts(collect([$product]), $companyId)[$product->id] ?? [])
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
            : collect();
        $isCompanyUnit = $allowedUnitIds->contains((int) $validated['unit_id']);

        if (! $isCompanyUnit) {
            throw ValidationException::withMessages([
                'unit_id' => __('PriceLists.unit_not_eligible'),
            ]);
        }

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
        $sortBy = (string) $request->input('sort_by', 'name');
        $sortDir = strtolower((string) $request->input('sort_dir', 'asc'));

        return [
            'search' => trim((string) $request->input('search', '')),
            'product_id' => $request->filled('product_id') ? (string) $request->input('product_id') : '',
            'price_status' => in_array($request->input('price_status'), ['with_price', 'without_price'], true)
                ? (string) $request->input('price_status')
                : '',
            'unit_id' => $request->filled('unit_id') ? (string) $request->input('unit_id') : '',
            'item_status' => in_array($request->input('item_status'), self::ITEM_STATUSES, true) ? (string) $request->input('item_status') : '',
            'sort_by' => in_array($sortBy, self::ITEM_SORTABLE, true) ? $sortBy : 'name',
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
        $companyId = $this->companyContext->id();

        return ItemUnit::query()
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->orWhereNull('company_id');
            })
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
