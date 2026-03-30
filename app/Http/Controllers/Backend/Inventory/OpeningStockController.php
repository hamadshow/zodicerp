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
        $openingStocks = OpeningStock::with(['warehouse', 'company', 'creator', 'items.product', 'items.unit'])
            ->where('type', 'opening')
            ->orderByDesc('id')
            ->paginate(25);

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

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'openingStocks' => $openingStocks->items(),
            'pagination' => $openingStocks->linkCollection(),
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
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

    /**
     * Display the specified opening stock.
     */
    public function show(Request $request, $id)
    {
        $openingStock = OpeningStock::with(['warehouse', 'company', 'creator', 'items.product', 'items.unit'])
            ->findOrFail($id);

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
            ->orderBy('id')
            ->get();

        $viewing = $request->query('edit') ? false : true;

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'openingStock' => $openingStock,
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'initialShowForm' => true,
            'viewing' => $viewing,
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

    /**
     * Remove the specified opening stock from storage.
     */
    public function destroy(Request $request, $id)
    {
        try {
            DB::transaction(function () use ($id) {
                $openingStock = OpeningStock::where('id', $id)
                    ->firstOrFail();

                $openingStock->items()->delete();
                $openingStock->delete();
            });

            return back()->with('success', 'Opening stock deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'An error occurred while deleting: ' . $e->getMessage()]);
        }
    }
}
