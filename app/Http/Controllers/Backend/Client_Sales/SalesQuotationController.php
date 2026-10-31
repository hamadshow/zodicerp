<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Client_Sales\SalesQuotation;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\PriceListItem;
use App\Models\Vendor_Purchases\SalesAgent;
use App\Models\Warehouses;
use App\Services\CompanyContext;
use App\Services\ProductPriceResolver;
use App\Services\ProductSellingGuard;
use App\Services\SellableProductCatalog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Sales Quotations.
 *
 * Pricing contract (single authority chain):
 *   * which price lists a customer may use  -> customers.price_list_id and
 *     customer_groups.price_list_id (the relationship ProductPriceResolver
 *     already consumes), filtered by status/validity/company scope;
 *   * which products/units are quotable     -> SellableProductCatalog rules
 *     plus a valid price_list_items row for the selected list;
 *   * what a line costs                     -> ProductPriceResolver resolved
 *     with an explicit price_list_id (no fallback outside the list).
 *
 * The React page renders the same context (price lists, priced sellable
 * products, priced units, tier prices) so the UI can filter live; the server
 * independently re-validates every submitted document.
 */
class SalesQuotationController extends Controller
{
    public function index(Request $request)
    {
        $companyId = app(CompanyContext::class)->id();

        $query = SalesQuotation::query()
            ->with(['customer', 'currency', 'creator', 'items', 'warehouse'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($q) use ($search) {
                        $q->where('name_en', 'like', "%{$search}%")
                            ->orWhere('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $quotations = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $customers = Customer::where('is_active', true)
            ->select('id', 'name_en', 'name_ar', 'currency_id', 'price_list_id', 'customer_group_id', 'company_id')
            ->with('group:id,price_list_id,name_en,name_ar')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'cost_per_item as purchase_price')
            ->get();
        // All active units (labels for print/export); the unit selector itself
        // only offers units priced in the selected price list per product.
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar', 'unit_type', 'base_unit')
            ->where('active', true)
            ->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();

        $salesAgents = SalesAgent::select('id', 'name_en', 'name_ar')
            ->where('is_active', true)
            ->get();

        $customerAddresses = CustomerAddress::select('id', 'customer_id', 'address_name', 'city_id', 'is_default')
            ->with('city')
            ->get();

        $priceLists = $this->quotingPriceLists($companyId);

        return Inertia::render('Backend/05-Client_Sales/Sales_Quotations', [
            'quotations' => $quotations,
            'customers' => $customers,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'priceLists' => $priceLists,
            'priceListPricing' => $this->buildPricingPayload($priceLists, $companyId),
            'warehouses' => $warehouses,
            'salesAgents' => $salesAgents,
            'customerAddresses' => $customerAddresses,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate($this->documentRules());

            $document = $this->buildValidatedDocument($validated);

            DB::transaction(function () use ($request, $validated, $document) {
                // Auto-generate number if not provided
                $number = 'SQ-'.date('Ymd').'-'.rand(1000, 9999);
                while (SalesQuotation::withTrashed()->where('quotation_number', $number)->exists()) {
                    $number = 'SQ-'.date('Ymd').'-'.rand(1000, 9999);
                }

                $quotation = SalesQuotation::create([
                    'quotation_number' => $number,
                    'quotation_date' => $validated['quotation_date'],
                    'expiry_date' => $validated['expiry_date'] ?? null,
                    'valid_days' => $validated['valid_days'] ?? null,
                    'customer_id' => $validated['customer_id'],
                    'currency_id' => $validated['currency_id'],
                    'exchange_rate' => $validated['exchange_rate'],
                    'status' => $validated['status'],
                    'price_list_id' => $validated['price_list_id'],
                    'warehouse_id' => $validated['warehouse_id'] ?? null,
                    'sales_agent_id' => $validated['sales_agent_id'] ?? null,
                    'probability_percentage' => $validated['probability_percentage'] ?? 0,
                    'followup_date' => $validated['followup_date'] ?? null,
                    'sent_date' => $validated['sent_date'] ?? null,
                    'sent_method' => $validated['sent_method'] ?? null,
                    'customer_notes' => $request->customer_notes,
                    'internal_notes' => $request->internal_notes,
                    'created_by' => Auth::id(),
                    'company_id' => app(CompanyContext::class)->id(),

                    // Financials (server computed)
                    'subtotal' => $document['subtotal'],
                    'discount_percentage' => $validated['discount_percentage'] ?? 0,
                    'discount_amount' => $document['discount_amount'],
                    'tax_amount' => $document['tax_amount'],
                    'shipping_cost' => $document['shipping_cost'],
                    'total_amount' => $document['total_amount'],
                ]);

                foreach ($document['items'] as $item) {
                    $quotation->items()->create($item);
                }
            });

            return redirect()->back()->with('success', 'Sales Quotation created successfully.');

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating quotation: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $quotation = SalesQuotation::findOrFail($id);

        // Company boundary: quotations of another company are invisible (404).
        // Legacy rows created before company scoping carry NULL and stay editable.
        $currentCompanyId = app(CompanyContext::class)->id();
        abort_unless(
            $quotation->company_id === null || (int) $quotation->company_id === $currentCompanyId,
            404
        );

        try {
            $validated = $request->validate($this->documentRules());

            $document = $this->buildValidatedDocument($validated);

            DB::transaction(function () use ($request, $quotation, $validated, $document) {
                $quotation->update([
                    'quotation_date' => $validated['quotation_date'],
                    'expiry_date' => $validated['expiry_date'] ?? null,
                    'valid_days' => $validated['valid_days'] ?? null,
                    'customer_id' => $validated['customer_id'],
                    'currency_id' => $validated['currency_id'],
                    'exchange_rate' => $validated['exchange_rate'],
                    'status' => $validated['status'],
                    'price_list_id' => $validated['price_list_id'],
                    'warehouse_id' => $validated['warehouse_id'] ?? null,
                    'sales_agent_id' => $validated['sales_agent_id'] ?? null,
                    'probability_percentage' => $validated['probability_percentage'] ?? 0,
                    'followup_date' => $validated['followup_date'] ?? null,
                    'sent_date' => $validated['sent_date'] ?? null,
                    'sent_method' => $validated['sent_method'] ?? null,
                    'customer_notes' => $request->customer_notes,
                    'internal_notes' => $request->internal_notes,
                    'subtotal' => $document['subtotal'],
                    'discount_percentage' => $validated['discount_percentage'] ?? 0,
                    'discount_amount' => $document['discount_amount'],
                    'tax_amount' => $document['tax_amount'],
                    'shipping_cost' => $document['shipping_cost'],
                    'total_amount' => $document['total_amount'],
                ]);

                // Sync items: Delete old and re-create
                $quotation->items()->delete();

                foreach ($document['items'] as $item) {
                    $quotation->items()->create($item);
                }
            });

            return redirect()->back()->with('success', 'Sales Quotation updated successfully.');

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error updating quotation: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $quotation = SalesQuotation::findOrFail($id);
            $quotation->delete(); // Soft delete

            return redirect()->back()->with('success', 'Sales Quotation deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting quotation: '.$e->getMessage());
        }
    }

    /* ---------------------------------------------------------------------
     | Validation
     --------------------------------------------------------------------- */

    /**
     * Shape-level rules shared by store and update. Business eligibility
     * (customer <-> price list, product/unit/price against the list) is
     * asserted afterwards in buildValidatedDocument() with field-keyed errors.
     */
    private function documentRules(): array
    {
        $companyId = app(CompanyContext::class)->id();

        return [
            'quotation_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:quotation_date',
            'customer_id' => [
                'required',
                'integer',
                Rule::exists('customers', 'id')->where(function ($query) use ($companyId) {
                    $query->where('company_id', $companyId)->orWhereNull('company_id');
                }),
            ],
            'price_list_id' => 'required|integer|exists:price_lists,id',
            'currency_id' => 'required|integer|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => ['required', Rule::in(SalesQuotation::statuses())],
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'sales_agent_id' => 'nullable|integer|exists:sales_agents,id',
            'valid_days' => 'nullable|integer|min:0',
            'probability_percentage' => 'nullable|numeric|min:0|max:100',
            'followup_date' => 'nullable|date',
            'sent_date' => 'nullable|date',
            'sent_method' => 'nullable|in:email,whatsapp,hand,other',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',

            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            // Quotation lines are whole units; the DB column keeps decimal(12,4)
            // only so unit conversions elsewhere are not constrained.
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_id' => 'required|integer|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.tax_id' => 'nullable|integer',
            'items.*.notes' => 'nullable|string|max:1000',
        ];
    }

    /**
     * Assert the document is legally sellable and return the rows + header
     * totals the server will persist. Every failure is a field-keyed
     * ValidationException so Inertia surfaces it on the exact cell.
     *
     * @return array{items: array<int, array<string, mixed>>, subtotal: string, discount_amount: string, tax_amount: string, shipping_cost: string, total_amount: string}
     */
    private function buildValidatedDocument(array $validated): array
    {
        $companyId = app(CompanyContext::class)->id();
        $customer = Customer::findOrFail($validated['customer_id']);
        $quotationDate = (string) $validated['quotation_date'];

        // 1. The selected price list must be one of the lists assigned to this
        //    customer (directly or through their group) and valid on the date.
        $eligiblePriceListIds = $this->eligiblePriceListIds($customer, $quotationDate, $companyId);
        if (! in_array((int) $validated['price_list_id'], $eligiblePriceListIds, true)) {
            throw ValidationException::withMessages([
                'price_list_id' => 'The selected price list is not eligible for the selected customer.',
            ]);
        }

        $priceListId = (int) $validated['price_list_id'];
        $catalog = app(SellableProductCatalog::class);
        $resolver = app(ProductPriceResolver::class);
        $transactionDate = Carbon::parse($quotationDate);

        $processedItems = [];
        $subtotal = '0.000000';
        $lineDiscounts = '0.000000';
        $lineTaxes = '0.000000';

        foreach ($validated['items'] as $index => $item) {
            $productId = (int) $item['product_id'];
            $unitId = (int) $item['unit_id'];
            $quantity = (string) $item['quantity'];

            // 2. Sellable product (existing guard: never a configurable parent).
            try {
                ProductSellingGuard::assertSellable($productId);
            } catch (ValidationException $e) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => Arr::flatten($e->errors())[0],
                ]);
            }

            // 3. Company/status/variation-link eligibility (same rules the
            //    product selector applies).
            if (! $catalog->sellableQuery($companyId)->where('products.id', $productId)->exists()) {
                $product = Products::withTrashed()->find($productId);
                $label = $product?->name ?? "#{$productId}";

                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => "Product {$label} is not a sellable product of the active company (status, company scope or variation rules).",
                ]);
            }

            // 4. The product must actually be priced in the selected list on
            //    the quotation date — no fallback outside the list.
            $productPricedInList = PriceListItem::query()
                ->where('price_list_id', $priceListId)
                ->where('product_id', $productId)
                ->where(function ($query) use ($quotationDate) {
                    $query->whereNull('effective_date')->orWhere('effective_date', '<=', $quotationDate);
                })
                ->where(function ($query) use ($quotationDate) {
                    $query->whereNull('expiry_date')->orWhere('expiry_date', '>=', $quotationDate);
                })
                ->exists();

            if (! $productPricedInList) {
                $product = Products::withTrashed()->find($productId);
                $label = $product?->name ?? "#{$productId}";

                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => "No valid price exists for product {$label} in the selected price list on {$quotationDate}.",
                ]);
            }

            // 5. The unit must be one of the units priced for this product in
            //    the selected price list, active and valid on the date.
            if (! $this->isPricedUnit($priceListId, $productId, $unitId, $quotationDate)) {
                $unit = ItemUnit::find($unitId);
                $unitLabel = $unit?->name ?? "#{$unitId}";

                throw ValidationException::withMessages([
                    "items.{$index}.unit_id" => "Unit {$unitLabel} is not a priced unit for this product in the selected price list.",
                ]);
            }

            $product = Products::findOrFail($productId);

            // 5. Authoritative price for (list, product, unit, quantity, date).
            //    Explicit price_list_id: no fallback to customer-group or
            //    product base prices outside the selected list.
            //
            //    Price list min_quantity tiers are stored in BASE units (the
            //    price list screen derives a unit's minimum from its own
            //    conversion factor), so the resolver must compare against the
            //    entered quantity expressed in base units. The line amount
            //    below keeps using the entered quantity in the selected unit
            //    x the per-unit price: the conversion factor is applied once,
            //    for tier matching only.
            $conversionFactor = $this->conversionFactorFor($unitId);
            $baseQuantity = bcmul($quantity, $conversionFactor, 4);

            $resolved = $resolver->resolve([
                'product' => $product,
                'customer' => $customer,
                'unit_id' => $unitId,
                'quantity' => $baseQuantity,
                'transaction_date' => $transactionDate,
                'price_list_id' => $priceListId,
            ]);

            if ((int) ($resolved['price_list_id'] ?? 0) !== $priceListId || $resolved['final_price'] === null) {
                $minimumTier = PriceListItem::query()
                    ->where('price_list_id', $priceListId)
                    ->where('product_id', $productId)
                    ->where('unit_id', $unitId)
                    ->where(function ($query) use ($quotationDate) {
                        $query->whereNull('effective_date')->orWhere('effective_date', '<=', $quotationDate);
                    })
                    ->where(function ($query) use ($quotationDate) {
                        $query->whereNull('expiry_date')->orWhere('expiry_date', '>=', $quotationDate);
                    })
                    ->min('min_quantity');

                if ($minimumTier !== null && bccomp($baseQuantity, (string) $minimumTier, 4) < 0) {
                    // State the minimum in the selected unit (base minimum /
                    // conversion factor, rounded up), not in base units.
                    $minimumInUnit = $this->minimumQuantityInUnit((string) $minimumTier, $conversionFactor);

                    throw ValidationException::withMessages([
                        "items.{$index}.quantity" => 'Quantity is below the minimum priced quantity ('.$minimumInUnit.') for this product in the selected price list.',
                    ]);
                }

                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => 'No valid price exists for this product in the selected price list on '.$quotationDate.'.',
                ]);
            }

            // 6. Submitted price must be the authorized price (no override
            //    permission exists in this application).
            $authorizedPrice = $resolved['final_price'];
            if (bccomp((string) $item['unit_price'], $authorizedPrice, 4) !== 0) {
                throw ValidationException::withMessages([
                    "items.{$index}.unit_price" => 'Unit price must match the selected price list price ('.$authorizedPrice.').',
                ]);
            }

            $unitPrice = bcadd($authorizedPrice, '0', 4);
            $lineDiscount = bcadd((string) ($item['discount_amount'] ?? 0), '0', 6);
            $lineTax = bcadd((string) ($item['tax_amount'] ?? 0), '0', 6);
            $lineGross = bcmul($quantity, $unitPrice, 6);

            $subtotal = bcadd($subtotal, $lineGross, 6);
            $lineDiscounts = bcadd($lineDiscounts, $lineDiscount, 6);
            $lineTaxes = bcadd($lineTaxes, $lineTax, 6);

            $processedItems[] = [
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_id' => $unitId,
                'unit_price' => $unitPrice,
                'discount_percentage' => bcadd((string) ($item['discount_percentage'] ?? 0), '0', 2),
                'discount_amount' => $lineDiscount,
                'tax_id' => $item['tax_id'] ?? null,
                'tax_amount' => $lineTax,
                'notes' => $item['notes'] ?? null,
            ];
        }

        // 7. Header totals, same order the form uses:
        //    subtotal - item discounts + item taxes - global discount + shipping.
        $shipping = bcadd((string) ($validated['shipping_cost'] ?? 0), '0', 6);
        $globalDiscount = bcadd((string) ($validated['discount_amount'] ?? 0), '0', 6);

        $total = bcsub(bcadd($subtotal, $lineTaxes, 6), $lineDiscounts, 6);
        $total = bcsub($total, $globalDiscount, 6);
        $total = bcadd($total, $shipping, 6);

        return [
            'items' => $processedItems,
            'subtotal' => $this->money2($subtotal),
            'discount_amount' => $this->money2($globalDiscount),
            'tax_amount' => $this->money2($lineTaxes),
            'shipping_cost' => $this->money2($shipping),
            'total_amount' => $this->money2($total),
        ];
    }

    /* ---------------------------------------------------------------------
     | Customer <-> price list eligibility
     --------------------------------------------------------------------- */

    /**
     * Price lists the customer may quote against on the given date: the list
     * assigned to the customer, plus the list assigned to their group (the
     * same candidate chain ProductPriceResolver walks), restricted to lists
     * of the active company that are active and valid on the date.
     *
     * @return array<int, int>
     */
    private function eligiblePriceListIds(Customer $customer, string $date, int $companyId): array
    {
        $candidateIds = [(int) $customer->price_list_id];

        $group = $customer->group;
        if ($group === null && (int) $customer->customer_group_id > 0) {
            $group = CustomerGroup::find($customer->customer_group_id);
        }
        if ($group) {
            $candidateIds[] = (int) $group->price_list_id;
        }

        $candidateIds = array_values(array_unique(array_filter($candidateIds)));
        if (empty($candidateIds)) {
            return [];
        }

        return PriceList::query()
            ->where(function ($query) use ($companyId) {
                $query->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->where('is_active', true)
            ->whereIn('id', $candidateIds)
            ->where('valid_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('valid_to')->orWhere('valid_to', '>=', $date);
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /* ---------------------------------------------------------------------
     | Form context payload (products / units / tier prices per price list)
     --------------------------------------------------------------------- */

    /**
     * Every price list the form may offer for quoting (active, company
     * scoped). Validity dates are sent so the client can filter them against
     * the quotation date without another round trip; the server re-checks.
     */
    private function quotingPriceLists(int $companyId)
    {
        return PriceList::query()
            ->where(function ($query) use ($companyId) {
                $query->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->where('is_active', true)
            ->with('currency:id,code,name')
            ->orderBy('id')
            ->get()
            ->map(function (PriceList $list) {
                return [
                    'id' => $list->id,
                    'code' => $list->code,
                    'name_en' => $list->name_en,
                    'name_ar' => $list->name_ar,
                    'price_type' => $list->price_type,
                    'currency_id' => $list->currency_id,
                    'currency_code' => $list->currency?->code,
                    'valid_from' => $list->valid_from?->format('Y-m-d'),
                    'valid_to' => $list->valid_to?->format('Y-m-d'),
                    'is_active' => (bool) $list->is_active,
                ];
            })
            ->values();
    }

    /**
     * Per price list: the sellable products that have price rows in that
     * list, their priced units, and every quantity tier (dates included so
     * the client can filter by quotation date). Products without a valid
     * priced unit are omitted entirely — they cannot become quotation lines.
     *
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $priceLists
     * @return array<int, array<string, mixed>>
     */
    private function buildPricingPayload($priceLists, int $companyId): array
    {
        $catalog = app(SellableProductCatalog::class);
        $payload = [];

        foreach ($priceLists as $list) {
            $items = PriceListItem::query()
                ->where('price_list_id', $list['id'])
                ->get();

            $payload[] = [
                'price_list_id' => $list['id'],
                'products' => $this->pricedProductRows($items, $catalog, $companyId),
            ];
        }

        return $payload;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, PriceListItem>  $items
     * @return array<int, array<string, mixed>>
     */
    private function pricedProductRows($items, SellableProductCatalog $catalog, int $companyId): array
    {
        if ($items->isEmpty()) {
            return [];
        }

        $products = $catalog->sellableQuery($companyId)
            ->whereIn('products.id', $items->pluck('product_id')->unique()->values())
            ->with([
                'parent:id,name,brand_id,product_type',
                'parent.brand:id,name',
                'brand:id,name',
            ])
            ->get([
                'products.id', 'products.name', 'products.sku', 'products.product_type',
                'products.parent_id', 'products.unit_id', 'products.brand_id',
                'products.status', 'products.company_id',
            ])
            ->keyBy('id');

        if ($products->isEmpty()) {
            return [];
        }

        $displayNames = $catalog->displayNames($products->values());

        $units = ItemUnit::query()
            ->where('active', true)
            ->whereIn('id', $items->pluck('unit_id')->unique()->values())
            ->get(['id', 'name', 'unit_type', 'base_unit', 'conversion_factor', 'active'])
            ->keyBy('id');

        $rows = [];

        foreach ($items->groupBy('product_id') as $productId => $productItems) {
            $product = $products->get((int) $productId);
            if (! $product) {
                continue;
            }

            $unitRows = [];
            $tiers = [];

            foreach ($productItems as $item) {
                $unit = $units->get((int) $item->unit_id);
                if (! $unit) {
                    // Inactive or missing unit: not selectable, so its price
                    // rows cannot produce a valid quotation line either.
                    continue;
                }

                if (! isset($unitRows[$unit->id])) {
                    $unitRows[$unit->id] = [
                        'id' => $unit->id,
                        'name' => $unit->name,
                        'unit_type' => $unit->unit_type,
                        'base_unit' => $unit->base_unit,
                        'conversion_factor' => $unit->conversion_factor,
                    ];
                }

                $tiers[(string) $unit->id][] = [
                    'min_quantity' => $item->min_quantity,
                    'final_price' => $this->clampedFinalPrice($item),
                    'effective_date' => $item->effective_date?->format('Y-m-d'),
                    'expiry_date' => $item->expiry_date?->format('Y-m-d'),
                ];
            }

            if (empty($tiers)) {
                continue;
            }

            foreach ($tiers as $unitId => $unitTiers) {
                usort($unitTiers, fn ($a, $b) => bccomp((string) $a['min_quantity'], (string) $b['min_quantity'], 4));
                $tiers[$unitId] = $unitTiers;
            }

            $unitRows = $this->disambiguateUnitLabels(array_values($unitRows));

            $rows[] = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'product_type' => $product->product_type,
                'parent_id' => $product->parent_id,
                'display_name' => $catalog->labelFor($product, $displayNames),
                'unit_id' => $product->unit_id,
                'units' => $unitRows,
                'tiers' => $tiers,
            ];
        }

        usort($rows, fn ($a, $b) => strcasecmp((string) $a['display_name'], (string) $b['display_name']));

        return $rows;
    }

    /**
     * Same disambiguation the price list screen uses: identical unit names
     * inside one product's priced units get the conversion factor, then the
     * id, appended so every option stays distinguishable.
     */
    private function disambiguateUnitLabels(array $units): array
    {
        $nameCounts = [];
        foreach ($units as $unit) {
            $key = Str::lower(trim($unit['name']));
            $nameCounts[$key] = ($nameCounts[$key] ?? 0) + 1;
        }

        foreach ($units as &$unit) {
            $key = Str::lower(trim($unit['name']));
            $unit['display_name'] = $unit['name'];
            if ($nameCounts[$key] > 1) {
                $unit['display_name'] .= ' ('.trim((string) $unit['conversion_factor']).')';
            }
        }
        unset($unit);

        $labelCounts = [];
        foreach ($units as $unit) {
            $key = Str::lower($unit['display_name']);
            $labelCounts[$key] = ($labelCounts[$key] ?? 0) + 1;
        }

        foreach ($units as &$unit) {
            $key = Str::lower($unit['display_name']);
            if ($labelCounts[$key] > 1) {
                $unit['display_name'] .= ' (#'.$unit['id'].')';
            }
        }
        unset($unit);

        return $units;
    }

    /**
     * Final (post-discount) tier price, clamped at zero exactly like
     * ProductPriceResolver clamps it.
     */
    private function clampedFinalPrice(PriceListItem $item): string
    {
        $final = $item->final_price;

        if ($final === null) {
            $unitPrice = (string) ($item->unit_price ?? '0');
            $percent = (string) ($item->discount_percentage ?? '0');
            $amount = (string) ($item->discount_amount ?? '0');
            $discountedPercent = bcmul($unitPrice, bcdiv($percent, '100', 6), 4);
            $final = bcsub(bcsub($unitPrice, $discountedPercent, 4), $amount, 4);
        }

        if (bccomp((string) $final, '0', 4) < 0) {
            return '0.0000';
        }

        return bcadd((string) $final, '0', 4);
    }

    /**
     * Is the unit priced for the product in the list, active, and valid on
     * the quotation date? (Quantity tiers are checked by the resolver.)
     */
    private function isPricedUnit(int $priceListId, int $productId, int $unitId, string $date): bool
    {
        $unit = ItemUnit::find($unitId);
        if (! $unit || ! $unit->active) {
            return false;
        }

        return PriceListItem::query()
            ->where('price_list_id', $priceListId)
            ->where('product_id', $productId)
            ->where('unit_id', $unitId)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_date')->orWhere('effective_date', '<=', $date);
            })
            ->where(function ($query) use ($date) {
                $query->whereNull('expiry_date')->orWhere('expiry_date', '>=', $date);
            })
            ->exists();
    }

    private function money2(string $value): string
    {
        return number_format(round((float) $value, 2), 2, '.', '');
    }

    /**
     * Base units per selected unit (ItemUnit.conversion_factor — the same
     * field the price list screen derives min_quantity from). Anything
     * missing or non-positive is treated as 1 so a misconfigured unit can
     * never inflate the entered quantity.
     */
    private function conversionFactorFor(int $unitId): string
    {
        $factor = (string) (ItemUnit::query()->where('id', $unitId)->value('conversion_factor') ?? '1');

        if (! is_numeric($factor) || bccomp($factor, '0', 4) <= 0) {
            return '1.0000';
        }

        return $factor;
    }

    /**
     * A base-unit minimum expressed back in the selected unit, rounded up
     * (a 24-piece minimum on a dozen unit is "from quantity 2").
     */
    private function minimumQuantityInUnit(string $minimumBase, string $conversionFactor): string
    {
        $inUnit = bcdiv($minimumBase, $conversionFactor, 4);
        $whole = (int) $inUnit;

        if (bccomp($inUnit, (string) $whole, 4) > 0) {
            $whole += 1;
        }

        return (string) $whole;
    }
}
