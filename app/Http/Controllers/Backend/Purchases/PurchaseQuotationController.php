<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Assets\Department;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PurchaseQuotation;
use App\Models\Vendor_Purchases\PurchaseQuotationItem;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use App\Services\SellableProductCatalog;
use App\Services\UnitConversionService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use RuntimeException;

class PurchaseQuotationController extends Controller
{
    private array $explicitIdRequired = [];

    public function __construct(
        private SellableProductCatalog $sellableProductCatalog,
        private UnitConversionService $unitConversion,
    ) {
    }

    public function index(Request $request)
    {
        return $this->renderPage($request);
    }

    public function create(Request $request)
    {
        return $this->renderPage($request, 'create');
    }

    public function show(Request $request, $id)
    {
        $quotation = $this->quotationQuery($this->companyId($request))
            ->with(['items.product', 'items.unit', 'items.warehouse'])
            ->findOrFail($id);

        return $this->renderPage($request, 'view', $quotation);
    }

    public function edit(Request $request, $id)
    {
        $quotation = $this->quotationQuery($this->companyId($request))
            ->with(['items.product', 'items.unit', 'items.warehouse'])
            ->findOrFail($id);

        return $this->renderPage($request, 'edit', $quotation);
    }

    public function store(Request $request)
    {
        $companyId = $this->companyId($request);
        $userId = (int) $request->user()->id;
        $departmentId = Department::query()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('id')
            ->value('id');

        if (! $departmentId) {
            throw ValidationException::withMessages([
                'department_id' => 'An active department is required for this company before creating a quotation.',
            ]);
        }

        $validated = $this->validateQuotation($request, $companyId);
        $totals = $this->calculateTotals($validated['items'], $validated);
        $this->ensureDiscountWithinSubtotal($validated, $totals['subtotal']);

        DB::transaction(function () use ($validated, $totals, $companyId, $userId, $departmentId) {
            $quotation = new PurchaseQuotation();
            $quotation->fill([
                'quotation_number' => $this->newQuotationNumber(),
                'quotation_date' => $validated['quotation_date'],
                'expiry_date' => $validated['expiry_date'],
                'company_id' => $companyId,
                'department_id' => $departmentId,
                'prepared_by' => $userId,
                'vendor_id' => $validated['vendor_id'],
                'vendor_contact_person' => $validated['vendor_contact_person'] ?? null,
                'vendor_phone' => $validated['vendor_phone'] ?? null,
                'vendor_email' => $validated['vendor_email'] ?? null,
                'status' => $validated['status'],
                'priority' => $validated['priority'],
                'subtotal' => $totals['subtotal'],
                'discount_amount' => $validated['discount_amount'] ?? 0,
                'discount_percent' => $this->discountPercent($validated['discount_amount'] ?? 0, $totals['subtotal']),
                'tax_amount' => $totals['tax'],
                'shipping_charges' => $validated['shipping_charges'] ?? 0,
                'other_charges' => $validated['other_charges'] ?? 0,
                'grand_total' => $totals['grand_total'],
                'currency_id' => $validated['currency_id'],
                'exchange_rate' => $validated['exchange_rate'],
                'payment_terms_id' => $validated['payment_terms_id'] ?? null,
                'delivery_terms_id' => $validated['delivery_terms_id'] ?? null,
                'shipping_method' => $validated['shipping_method'] ?? null,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'terms_and_conditions' => $validated['terms_and_conditions'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'created_by' => $userId,
            ]);

            if ($this->requiresExplicitId('purchase_quotations')) {
                $quotation->id = $this->newUniqueId('purchase_quotations');
            }

            $quotation->save();
            $this->syncItems($quotation, $validated['items'], $companyId);
        });

        return redirect()->route('admin.purchases.quotations.index')
            ->with('success', 'Purchase quotation created successfully.');
    }

    public function update(Request $request, $id)
    {
        $companyId = $this->companyId($request);
        $validated = $this->validateQuotation($request, $companyId);
        $totals = $this->calculateTotals($validated['items'], $validated);
        $this->ensureDiscountWithinSubtotal($validated, $totals['subtotal']);

        $quotation = $this->quotationQuery($companyId)
            ->with('items')
            ->findOrFail($id);

        DB::transaction(function () use ($quotation, $validated, $totals, $companyId, $request) {
            $quotation->update([
                'quotation_date' => $validated['quotation_date'],
                'expiry_date' => $validated['expiry_date'],
                'vendor_id' => $validated['vendor_id'],
                'vendor_contact_person' => $validated['vendor_contact_person'] ?? null,
                'vendor_phone' => $validated['vendor_phone'] ?? null,
                'vendor_email' => $validated['vendor_email'] ?? null,
                'status' => $validated['status'],
                'priority' => $validated['priority'],
                'subtotal' => $totals['subtotal'],
                'discount_amount' => $validated['discount_amount'] ?? 0,
                'discount_percent' => $this->discountPercent($validated['discount_amount'] ?? 0, $totals['subtotal']),
                'tax_amount' => $totals['tax'],
                'shipping_charges' => $validated['shipping_charges'] ?? 0,
                'other_charges' => $validated['other_charges'] ?? 0,
                'grand_total' => $totals['grand_total'],
                'currency_id' => $validated['currency_id'],
                'exchange_rate' => $validated['exchange_rate'],
                'payment_terms_id' => $validated['payment_terms_id'] ?? null,
                'delivery_terms_id' => $validated['delivery_terms_id'] ?? null,
                'shipping_method' => $validated['shipping_method'] ?? null,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'terms_and_conditions' => $validated['terms_and_conditions'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'updated_by' => $request->user()->id,
            ]);

            $this->syncItems($quotation, $validated['items'], $companyId);
        });

        return redirect()->route('admin.purchases.quotations.index')
            ->with('success', 'Purchase quotation updated successfully.');
    }

    public function destroy(Request $request, $id)
    {
        $quotation = $this->quotationQuery($this->companyId($request))->findOrFail($id);
        $quotation->delete();

        return redirect()->route('admin.purchases.quotations.index')
            ->with('success', 'Purchase quotation deleted successfully.');
    }

    private function renderPage(Request $request, string $mode = 'list', ?PurchaseQuotation $selectedQuotation = null)
    {
        $companyId = $this->companyId($request);
        $perPage = (int) $request->input('per_page', 10);
        abort_unless(in_array($perPage, [10, 25, 50, 100], true), 422, 'Invalid page size.');

        $query = $this->quotationQuery($companyId)
            ->with(['vendor', 'currency', 'creator', 'items.product', 'items.unit'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function (Builder $builder) use ($search) {
                $builder->where('quotation_number', 'like', "%{$search}%")
                    ->orWhereHas('vendor', function (Builder $vendorQuery) use ($search) {
                        $vendorQuery->where('name_ar', 'like', "%{$search}%")
                            ->orWhere('store_name_json', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $quotations = $query->paginate($perPage)->withQueryString();
        $vendors = $this->vendorOptions($companyId);
        $currencies = $this->currencyOptions($companyId);
        [$products, $units] = $this->productAndUnitOptions($companyId);

        return Inertia::render('Backend/04-Purchases/Purchase_quotations', [
            'quotations' => $quotations,
            'vendors' => $vendors,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $this->warehouseOptions($companyId),
            'paymentTerms' => [
                ['id' => 1, 'name' => 'Net 30'],
                ['id' => 2, 'name' => 'Net 60'],
                ['id' => 3, 'name' => 'Cash on Delivery'],
                ['id' => 4, 'name' => 'Advance Payment'],
            ],
            'deliveryTerms' => [
                ['id' => 1, 'name' => 'EXW - Ex Works'],
                ['id' => 2, 'name' => 'FOB - Free on Board'],
                ['id' => 3, 'name' => 'CIF - Cost, Insurance and Freight'],
                ['id' => 4, 'name' => 'DDP - Delivered Duty Paid'],
            ],
            'filters' => $request->only(['search', 'status', 'per_page']),
            'initialMode' => $mode,
            'selectedQuotation' => $selectedQuotation,
        ]);
    }

    private function vendorOptions(int $companyId)
    {
        return Supplier::query()
            ->where('company_id', $companyId)
            ->where('is_vendor', true)
            ->where('is_active', true)
            ->orderBy('name_ar')
            ->get([
                'id',
                'name_ar',
                'store_name_json',
                'primary_phone',
                'email',
                'currency_id',
            ])
            ->map(fn (Supplier $supplier) => [
                'id' => (int) $supplier->id,
                'name_ar' => $supplier->getTranslated('store_name_json', 'ar') ?: $supplier->name_ar,
                'name_en' => $supplier->getTranslated('store_name_json', 'en') ?: $supplier->name_ar,
                'phone' => $supplier->primary_phone,
                'email' => $supplier->email,
                'currency_id' => $supplier->currency_id,
            ])
            ->values();
    }

    private function currencyOptions(int $companyId)
    {
        $query = Currency::query()->where('status', 'active');
        if (Schema::hasColumn('currencies', 'company_id')) {
            $query->where(function (Builder $builder) use ($companyId) {
                $builder->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        return $query->orderBy('code')->get(['id', 'name', 'code', 'symbol']);
    }

    private function productAndUnitOptions(int $companyId): array
    {
        $products = $this->sellableProductCatalog
            ->sellableQuery($companyId)
            ->select([
                'products.id',
                'products.name',
                'products.name_json',
                'products.sku',
                'products.unit_id',
                'products.parent_id',
                'products.product_type',
                'products.cost_per_item as purchase_price',
                'products.company_id',
            ])
            ->whereNotNull('products.unit_id')
            ->orderBy('products.name')
            ->get();

        $displayNames = $this->sellableProductCatalog->displayNames($products);
        $eligibleUnits = $this->unitConversion->selectableUnitsByProduct($products);
        $baseUnitIds = $this->unitConversion->baseUnitIdsByProduct($products);
        $availableUnits = ItemUnit::query()
            ->active()
            ->where(function (Builder $query) use ($companyId) {
                $query->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->get(['id', 'name', 'unit_type', 'base_unit', 'conversion_factor'])
            ->keyBy('id');

        $products = $products->map(function (Products $product) use ($displayNames, $eligibleUnits, $baseUnitIds, $availableUnits) {
            $options = collect($eligibleUnits[(int) $product->id] ?? []);
            $baseUnitId = $baseUnitIds[(int) $product->id] ?? null;
            if ($baseUnitId === null) {
                Log::warning('A purchase quotation product was omitted because its unit configuration is invalid.', [
                    'product_id' => $product->id,
                    'company_id' => $product->company_id,
                ]);
                $product->setAttribute('units', collect());

                return $product;
            }

            if (! $options->contains(fn (array $unit) => (int) $unit['id'] === $baseUnitId)) {
                $baseUnit = $availableUnits->get($baseUnitId);
                if ($baseUnit) {
                    $options->push([
                        'id' => (int) $baseUnit->id,
                        'name' => (string) $baseUnit->name,
                        'unit_type' => (int) $baseUnit->unit_type,
                        'base_unit' => $baseUnit->base_unit === null ? null : (int) $baseUnit->base_unit,
                        'conversion_factor' => (string) $baseUnit->conversion_factor,
                    ]);
                }
            }

            $product->setAttribute('display_name', $this->sellableProductCatalog->labelFor($product, $displayNames));
            $product->setAttribute('units', $options->unique('id')->sortBy('id')->values());

            return $product;
        })->filter(fn (Products $product) => $product->units->isNotEmpty())->values();

        $usedUnitIds = $products->flatMap(fn (Products $product) => $product->units->pluck('id'))->unique();
        $fallbackUnits = ItemUnit::query()
            ->active()
            ->mainUnits()
            ->where(function (Builder $query) use ($companyId) {
                $query->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->whereIn('id', $usedUnitIds->isNotEmpty() ? $usedUnitIds : [-1])
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (ItemUnit $unit) => ['id' => (int) $unit->id, 'name' => (string) $unit->name]);

        return [
            $products->map(fn (Products $product) => [
                'id' => (int) $product->id,
                'name_en' => (string) ($product->getTranslated('name_json', 'en') ?: $product->name),
                'name_ar' => (string) ($product->getTranslated('name_json', 'ar') ?: $product->name),
                'display_name' => (string) $product->display_name,
                'sku' => (string) $product->sku,
                'purchase_price' => $product->purchase_price,
                'unit_id' => (int) $product->unit_id,
                'product_type' => $product->product_type,
                'units' => $product->units->values(),
            ])->values(),
            $fallbackUnits,
        ];
    }

    private function warehouseOptions(int $companyId)
    {
        $query = Warehouses::query();
        if (Schema::hasColumn('warehouses', 'company_id')) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Warehouses $warehouse) => [
                'id' => (int) $warehouse->id,
                'name_en' => (string) $warehouse->name,
                'name_ar' => (string) $warehouse->name,
            ]);
    }

    private function validateQuotation(Request $request, int $companyId): array
    {
        $vendorRule = Rule::exists('suppliers', 'id')->where(fn ($query) => $query
            ->where('company_id', $companyId)
            ->where('is_vendor', true)
            ->where('is_active', true)
            ->whereNull('deleted_at'));

        $currencyRule = Rule::exists('currencies', 'id')->where(function ($query) use ($companyId) {
            $query->where('status', 'active');
            if (Schema::hasColumn('currencies', 'company_id')) {
                $query->where(function ($companyQuery) use ($companyId) {
                    $companyQuery->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            }
            if (Schema::hasColumn('currencies', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }
        });

        $productRule = Rule::exists('products', 'id')->where(fn ($query) => $query
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->whereNull('deleted_at'));

        $warehouseRule = Rule::exists('warehouses', 'id');
        if (Schema::hasColumn('warehouses', 'company_id')) {
            $warehouseRule->where('company_id', $companyId);
        }
        if (Schema::hasColumn('warehouses', 'deleted_at')) {
            $warehouseRule->whereNull('deleted_at');
        }

        $validated = $request->validate([
            'quotation_date' => ['required', 'date'],
            'expiry_date' => ['required', 'date', 'after_or_equal:quotation_date'],
            'vendor_id' => ['required', 'integer', $vendorRule],
            'vendor_contact_person' => ['nullable', 'string', 'max:150'],
            'vendor_phone' => ['nullable', 'string', 'max:30'],
            'vendor_email' => ['nullable', 'email', 'max:150'],
            'currency_id' => ['required', 'integer', $currencyRule],
            'exchange_rate' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'status' => ['required', Rule::in([
                'draft', 'pending_approval', 'approved', 'sent_to_vendor',
                'vendor_replied', 'converted_to_po', 'rejected', 'cancelled', 'expired',
            ])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'discount_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'shipping_charges' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'other_charges' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'payment_terms_id' => ['nullable', 'integer', Rule::in([1, 2, 3, 4])],
            'delivery_terms_id' => ['nullable', 'integer', Rule::in([1, 2, 3, 4])],
            'shipping_method' => ['nullable', 'string', 'max:100'],
            'shipping_address' => ['nullable', 'string', 'max:65535'],
            'notes' => ['nullable', 'string', 'max:65535'],
            'terms_and_conditions' => ['nullable', 'string', 'max:65535'],
            'internal_notes' => ['nullable', 'string', 'max:65535'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.item_type' => ['required', Rule::in(['product', 'service', 'material', 'asset', 'expense', 'other'])],
            'items.*.product_id' => ['nullable', 'integer', $productRule],
            'items.*.item_name_ar' => ['required', 'string', 'max:500'],
            'items.*.item_name_en' => ['nullable', 'string', 'max:500'],
            'items.*.description_ar' => ['nullable', 'string', 'max:65535'],
            'items.*.description_en' => ['nullable', 'string', 'max:65535'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:999999999999'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'items.*.tax_amount' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'items.*.required_date' => ['nullable', 'date'],
            'items.*.warehouse_id' => ['nullable', 'integer', $warehouseRule],
            'items.*.notes' => ['nullable', 'string', 'max:65535'],
            'items.*.internal_comments' => ['nullable', 'string', 'max:65535'],
        ]);

        $validator = validator($validated, []);
        foreach ($validated['items'] as $index => $item) {
            $discount = (float) ($item['discount_amount'] ?? 0);
            if ($discount > (float) $item['unit_price']) {
                $validator->errors()->add("items.{$index}.discount_amount", 'The per-unit discount may not exceed the unit price.');
            }

            if (! $this->unitIsAccessible((int) $item['unit_id'], $companyId)) {
                $validator->errors()->add("items.{$index}.unit_id", 'The selected unit is inactive or outside your company.');
                continue;
            }

            if (! empty($item['product_id'])) {
                if (! $this->isSellableProduct((int) $item['product_id'], $companyId)) {
                    $validator->errors()->add("items.{$index}.product_id", 'The selected product is not available for this company.');
                    continue;
                }

                try {
                    $this->unitConversion->toBase(
                        (int) $item['product_id'],
                        (int) $item['unit_id'],
                        (string) $item['quantity'],
                    );
                } catch (RuntimeException $exception) {
                    $validator->errors()->add("items.{$index}.unit_id", $exception->getMessage());
                }
            }
        }

        $validator->validate();

        return $validated;
    }

    private function syncItems(PurchaseQuotation $quotation, array $items, int $companyId): void
    {
        $existingItems = $quotation->items->keyBy('id');
        $retainedIds = collect($items)
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($retainedIds->diff($existingItems->keys())->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => 'One or more submitted quotation lines do not belong to this quotation.',
            ]);
        }

        $removedIds = $existingItems->keys()->diff($retainedIds);
        if ($removedIds->isNotEmpty() && Schema::hasTable('purchase_order_items')
            && DB::table('purchase_order_items')->whereIn('quotation_item_id', $removedIds)->exists()) {
            throw ValidationException::withMessages([
                'items' => 'A quotation line already linked to a purchase order cannot be removed.',
            ]);
        }

        if ($removedIds->isNotEmpty()) {
            $quotation->items()->whereIn('id', $removedIds)->delete();
        }

        foreach ($items as $index => $itemData) {
            $attributes = $this->itemAttributes($itemData, $index + 1);
            $itemId = $itemData['id'] ?? null;

            if ($itemId) {
                $existingItems->get((int) $itemId)->fill($attributes)->save();
                continue;
            }

            $item = new PurchaseQuotationItem($attributes);
            if (Schema::hasColumn('purchase_quotation_items', 'company_id')) {
                $item->company_id = $companyId;
            }
            if ($this->requiresExplicitId('purchase_quotation_items')) {
                $item->id = $this->newUniqueId('purchase_quotation_items');
            }
            $quotation->items()->save($item);
        }
    }

    private function itemAttributes(array $item, int $lineNumber): array
    {
        return [
            'line_number' => $lineNumber,
            'item_type' => $item['item_type'],
            'product_id' => $item['product_id'] ?? null,
            'item_name_ar' => $item['item_name_ar'],
            'item_name_en' => $item['item_name_en'] ?? null,
            'description_ar' => $item['description_ar'] ?? null,
            'description_en' => $item['description_en'] ?? null,
            'quantity' => $item['quantity'],
            'unit_id' => $item['unit_id'],
            'unit_price' => $item['unit_price'],
            'discount_percent' => $this->discountPercent(
                $item['discount_amount'] ?? 0,
                (float) $item['unit_price'],
            ),
            'discount_amount' => $item['discount_amount'] ?? 0,
            'tax_amount' => $item['tax_amount'] ?? 0,
            'required_date' => $item['required_date'] ?? null,
            'warehouse_id' => $item['warehouse_id'] ?? null,
            'notes' => $item['notes'] ?? null,
            'internal_comments' => $item['internal_comments'] ?? null,
        ];
    }

    private function calculateTotals(array $items, array $quotation): array
    {
        $subtotal = 0.0;
        $tax = 0.0;

        foreach ($items as $item) {
            $quantity = (float) $item['quantity'];
            $netPrice = (float) $item['unit_price'] - (float) ($item['discount_amount'] ?? 0);
            $lineTotal = round($quantity * $netPrice, 2);
            $tax += round($lineTotal * (float) ($item['tax_amount'] ?? 0) / 100, 2);
            $subtotal += $lineTotal;
        }

        $subtotal = round($subtotal, 2);
        $tax = round($tax, 2);
        $discount = (float) ($quotation['discount_amount'] ?? 0);
        $shipping = (float) ($quotation['shipping_charges'] ?? 0);
        $otherCharges = (float) ($quotation['other_charges'] ?? 0);

        return [
            'subtotal' => $subtotal,
            'tax' => $tax,
            'grand_total' => round($subtotal - $discount + $tax + $shipping + $otherCharges, 2),
        ];
    }

    private function ensureDiscountWithinSubtotal(array $quotation, float $subtotal): void
    {
        if ((float) ($quotation['discount_amount'] ?? 0) > $subtotal) {
            throw ValidationException::withMessages([
                'discount_amount' => 'The quotation discount may not exceed the subtotal.',
            ]);
        }
    }

    private function discountPercent(float|int|string $discountAmount, float $baseAmount): float
    {
        if ($baseAmount <= 0) {
            return 0.0;
        }

        return round((float) $discountAmount / $baseAmount * 100, 2);
    }

    private function isSellableProduct(int $productId, int $companyId): bool
    {
        return $this->sellableProductCatalog
            ->sellableQuery($companyId)
            ->whereKey($productId)
            ->exists();
    }

    private function unitIsAccessible(int $unitId, int $companyId): bool
    {
        return ItemUnit::query()
            ->active()
            ->whereKey($unitId)
            ->where(function (Builder $query) use ($companyId) {
                $query->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->exists();
    }

    private function quotationQuery(int $companyId): Builder
    {
        return PurchaseQuotation::query()->where('company_id', $companyId);
    }

    private function companyId(Request $request): int
    {
        $companyId = (int) ($request->user()?->company_id ?? 0);
        abort_unless($companyId > 0, 403, 'A company context is required for quotations.');

        return $companyId;
    }

    private function newQuotationNumber(): string
    {
        do {
            $number = 'PQ-'.now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (PurchaseQuotation::withTrashed()->where('quotation_number', $number)->exists());

        return $number;
    }

    private function requiresExplicitId(string $table): bool
    {
        if (array_key_exists($table, $this->explicitIdRequired)) {
            return $this->explicitIdRequired[$table];
        }

        if (DB::connection()->getDriverName() !== 'mysql') {
            return $this->explicitIdRequired[$table] = false;
        }

        $column = DB::selectOne(
            'SELECT EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$table, 'id'],
        );

        if (! $column) {
            throw new RuntimeException("Unable to inspect the primary-key configuration for {$table}.");
        }

        return $this->explicitIdRequired[$table] = ! str_contains(strtolower((string) $column->EXTRA), 'auto_increment');
    }

    private function newUniqueId(string $table): int
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $id = random_int(1, PHP_INT_MAX);
            if (! DB::table($table)->where('id', $id)->exists()) {
                return $id;
            }
        }

        throw new RuntimeException("Unable to allocate a unique identifier for {$table}.");
    }
}
