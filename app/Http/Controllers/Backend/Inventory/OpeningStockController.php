<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Models\OpeningStock;
use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use App\Services\CompanyContext;
use App\Services\Inventory\OpeningStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OpeningStockController extends Controller
{
    public function __construct(
        private CompanyContext $companyContext,
        private OpeningStockService $openingStockService,
    ) {}

    /**
     * Company-scoped option lists shared by index/show. Master-data tables
     * keep the established "company_id = active OR NULL" convention
     * (same as UnitConversionService); transactional reads are strict.
     */
    private function scopedOptionLists(int $companyId): array
    {
        return [
            'warehouses' => Warehouses::query()
                ->where('company_id', $companyId)
                ->select(['id', 'name'])
                ->orderBy('id')
                ->get(),
            'products' => Products::query()
                ->where('company_id', $companyId)
                ->select(['id', 'name', 'sku', 'barcode'])
                ->orderBy('id', 'desc')
                ->limit(2000)
                ->get(),
            'units' => ItemUnit::query()
                ->where(function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)->orWhereNull('company_id');
                })
                ->select(['id', 'name'])
                ->where('active', true)
                ->where('unit_type', 1)
                ->orderBy('id')
                ->get(),
        ];
    }

    /**
     * Referenced warehouse/product must belong to the active company.
     * (Validation `exists:` rules alone would accept any company's rows.)
     */
    private function assertOwned(array $validated, int $companyId): void
    {
        $warehouseOwner = Warehouses::query()->whereKey($validated['warehouse_id'])->value('company_id');
        abort_unless((int) $warehouseOwner === $companyId, 404, 'Warehouse not found.');

        $productOwners = Products::query()
            ->whereIn('id', array_map('intval', array_column($validated['items'], 'product_id')))
            ->pluck('company_id', 'id');
        foreach ($validated['items'] as $item) {
            abort_unless(
                (int) ($productOwners[$item['product_id']] ?? 0) === $companyId,
                404,
                'Product not found.'
            );
        }
    }
    /**
     * Display a listing of opening stocks.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $warehouseId = $request->input('warehouse_id');
        $sortBy = $request->input('sort_by', 'id');
        $sortDir = $request->input('sort_dir', 'desc');
        $perPage = (int) $request->input('per_page', 25);
        if ($perPage < 1) {
            $perPage = 25;
        }
        if (!in_array(strtolower($sortDir), ['asc', 'desc'], true)) {
            $sortDir = 'desc';
        }

        $allowedSorts = [
            'id',
            'movement_date',
            'warehouse_id',
            'voucher_num',
            'created_at',
        ];

        if (!in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'id';
        }

        $query = OpeningStock::with(['warehouse', 'company', 'creator', 'items.product', 'items.unit'])
            ->where('type', 'opening')
            ->where('company_id', $this->companyContext->id());

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('voucher_num', 'like', '%' . $search . '%')
                    ->orWhere('notes', 'like', '%' . $search . '%')
                    ->orWhereHas('warehouse', function ($sub) use ($search) {
                        $sub->where('name', 'like', '%' . $search . '%')
                            ->orWhere('name_en', 'like', '%' . $search . '%')
                            ->orWhere('name_ar', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('items', function ($sub) use ($search) {
                        $sub->whereHas('product', function ($p) use ($search) {
                            $p->where('name', 'like', '%' . $search . '%')
                                ->orWhere('name_en', 'like', '%' . $search . '%')
                                ->orWhere('name_ar', 'like', '%' . $search . '%')
                                ->orWhere('sku', 'like', '%' . $search . '%')
                                ->orWhere('barcode', 'like', '%' . $search . '%');
                        });
                    });
            });
        }

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($sortBy === 'warehouse_id') {
            $query->join('warehouses', 'inventory_movement_headers.warehouse_id', '=', 'warehouses.id')
                ->orderBy('warehouses.name', $sortDir)
                ->select('inventory_movement_headers.*');
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $openingStocks = $query->paginate($perPage)->withQueryString();

        // Products list deduped: a product family shares the parent's name;
        // variations must not flood the picker (behavior-preserving cap).
        $products = Products::query()
            ->where('company_id', $this->companyContext->id())
            ->whereNull('parent_id')
            ->select(['id', 'name', 'sku', 'barcode'])
            ->orderBy('id', 'desc')
            ->limit(2000)
            ->get();

        $warehouses = Warehouses::query()
            ->where('company_id', $this->companyContext->id())
            ->select(['id', 'name'])
            ->orderBy('id')
            ->get();

        $units = ItemUnit::query()
            ->where(function ($q) {
                $q->where('company_id', $this->companyContext->id())->orWhereNull('company_id');
            })
            ->select(['id', 'name'])
            ->where('active', true)
            ->where('unit_type', 1)
            ->orderBy('id')
            ->get();

        $filters = [
            'search' => $search,
            'warehouse_id' => $warehouseId,
            'sort_by' => $sortBy,
            'sort_dir' => $sortDir,
            'per_page' => $perPage,
        ];

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'openingStocks' => [
                'data' => $openingStocks->items(),
                'current_page' => $openingStocks->currentPage(),
                'last_page' => $openingStocks->lastPage(),
                'total' => $openingStocks->total(),
                'per_page' => $openingStocks->perPage(),
                'from' => $openingStocks->firstItem(),
                'to' => $openingStocks->lastItem(),
            ],
            'pagination' => $openingStocks->linkCollection(),
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'filters' => $filters,
            'initialShowForm' => false,
        ]);
    }

    /**
     * Store a newly created opening stock in storage.
     *
     * Phase 3: delegates to OpeningStockService (unit conversion, D1 WAC
     * seeding, derived quantity, full rollback on any failure).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'movement_date' => ['nullable', 'date'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $this->openingStockService->create($validated);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'An error occurred while saving: '.$e->getMessage()])->withInput();
        }

        return redirect()
            ->route('admin.inventory.opening-stock.index', [
                'country' => request()->route('country'),
                'lang' => request()->route('lang'),
            ])
            ->with('success', 'Opening stock saved successfully');
    }

    public function show(OpeningStock $openingStock)
    {
        // Cross-company records must not be viewable (404, as Nationality/Profession).
        abort_unless((int) $openingStock->company_id === $this->companyContext->id(), 404);

        $openingStock->load(['warehouse', 'items.product', 'creator']);

        $warehouses = Warehouses::query()
            ->where('company_id', $this->companyContext->id())
            ->select(['id', 'name'])
            ->orderBy('id')
            ->get();

        $products = Products::query()
            ->where('company_id', $this->companyContext->id())
            ->select(['id', 'name', 'sku', 'barcode'])
            ->orderBy('id', 'desc')
            ->limit(2000)
            ->get();

        $units = ItemUnit::query()
            ->where(function ($q) {
                $q->where('company_id', $this->companyContext->id())->orWhereNull('company_id');
            })
            ->select(['id', 'name'])
            ->where('active', true)
            ->where('unit_type', 1)
            ->orderBy('id')
            ->get();
        
        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'viewing' => true,
            'openingStock' => $openingStock,
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'openingStocks' => [],
            'pagination' => [],
            'initialShowForm' => true,
        ]);
    }

    /**
     * Replace an opening stock document's items (D4: reversal-and-replacement
     * via OpeningStockService). Routed since Phase 3.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'movement_date' => ['nullable', 'date'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $this->openingStockService->update((int) $id, $validated);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            abort(404);
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'An error occurred while updating: '.$e->getMessage()])->withInput();
        }

        return redirect()
            ->route('admin.inventory.opening-stock.index', [
                'country' => request()->route('country'),
                'lang' => request()->route('lang'),
            ])
            ->with('success', 'Opening stock updated successfully');
    }

    /**
     * Reverse an opening stock record (D4). Lines and WAC effects are negated
     * exactly; the header stays as an audit row (direction flipped to 'out').
     */
    public function destroy(OpeningStock $openingStock)
    {
        // Cross-company records must not be deletable.
        abort_unless((int) $openingStock->company_id === $this->companyContext->id(), 404);

        try {
            $this->openingStockService->delete((int) $openingStock->id);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting opening stock: '.$e->getMessage());
        }

        return redirect()->back()->with('success', 'Opening stock record reversed successfully');
    }
}
