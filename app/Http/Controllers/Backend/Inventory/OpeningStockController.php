<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Models\OpeningStock;
use App\Models\OpeningStockItem;
use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OpeningStockController extends Controller
{
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
            ->where('type', 'opening');

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

        $warehouses = Warehouses::query()
            ->select(['id', 'name'])
            ->orderBy('id')
            ->get();

        $products = Products::query()
            ->select(['id', 'name', 'sku', 'barcode'])
            ->orderBy('id', 'desc')
            ->limit(2000)
            ->get();

        $units = ItemUnit::query()
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
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

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
            DB::transaction(function () use ($validated, $companyId, $user) {
                // Generate voucher number for opening stock
                $voucherNum = 'OS-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));

                $openingStock = OpeningStock::create([
                    'movement_date' => $validated['movement_date'] ?? null,
                    'type' => 'opening',
                    'direction' => 'in',
                    'voucher_num' => $voucherNum,
                    'warehouse_id' => $validated['warehouse_id'],
                    'company_id' => $companyId,
                    'created_by' => $user->id,
                    'notes' => $validated['notes'] ?? 'OpeningStock',
                ]);

                foreach ($validated['items'] as $item) {
                    OpeningStockItem::create([
                        'stock_movement_id' => $openingStock->id,
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => $item['quantity'],
                        'cost_price' => $item['cost_price'] ?? 0,
                    ]);
                }
            });
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'An error occurred while saving: '.$e->getMessage()]);
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
        $openingStock->load(['warehouse', 'items.product', 'creator']);
        
        $warehouses = \App\Models\Warehouses::query()
            ->select(['id', 'name'])
            ->orderBy('id')
            ->get();

        $products = \App\Models\Products::query()
            ->select(['id', 'name', 'sku', 'barcode'])
            ->orderBy('id', 'desc')
            ->limit(2000)
            ->get();

        $units = \App\Models\ItemUnit::query()
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
     * Update the specified opening stock in storage.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

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
            DB::transaction(function () use ($validated, $id) {
                $openingStock = OpeningStock::where('id', $id)
                    ->firstOrFail();

                $openingStock->update([
                    'movement_date' => $validated['movement_date'] ?? null,
                    'warehouse_id' => $validated['warehouse_id'],
                    'notes' => $validated['notes'] ?? 'OpeningStock',
                ]);

                // Update items: delete old and insert new
                $openingStock->items()->delete();

                foreach ($validated['items'] as $item) {
                    $openingStock->items()->create([
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => $item['quantity'],
                        'cost_price' => $item['cost_price'] ?? 0,
                    ]);
                }
            });
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'An error occurred while updating: '.$e->getMessage()]);
        }

        return redirect()
            ->route('admin.inventory.opening-stock.index', [
                'country' => request()->route('country'),
                'lang' => request()->route('lang'),
            ])
            ->with('success', 'Opening stock updated successfully');
    }

    public function destroy(OpeningStock $openingStock)
    {
        try {
            DB::beginTransaction();

            // 1. Delete items first
            $openingStock->items()->delete();

            // 2. Delete the header
            $openingStock->delete();

            DB::commit();

            return redirect()->back()->with('success', 'Opening stock record deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error deleting opening stock: ' . $e->getMessage());
        }
    }
}
