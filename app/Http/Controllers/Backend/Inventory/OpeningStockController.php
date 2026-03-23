<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OpeningStockController extends Controller
{
    public function index(Request $request)
    {
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

        $openingStocks = \App\Models\OpeningStock::with(['warehouse', 'company', 'creator', 'items.product', 'items.unit'])
            ->orderByDesc('id')
            ->limit(25)
            ->get();

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'openingStocks' => $openingStocks,
        ]);
    }

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

        if (! auth()->check()) {
            return back()->withErrors(['auth' => 'Not authenticated.']);
        }

        $companyId = auth()->user()->company_id;
        if (! $companyId) {
            return back()->withErrors(['general' => 'User is not linked to a company.']);
        }
        $userId = auth()->id();

        try {
            DB::transaction(function () use ($validated, $companyId, $userId) {
                $openingStockId = DB::table('stock_movements')->insertGetId([
                    'movement_date' => $validated['movement_date'] ?? null,
                    'warehouse_id' => $validated['warehouse_id'],
                    'company_id' => $companyId,
                    'created_by' => $userId,
                    'notes' => $validated['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $rows = collect($validated['items'])
                    ->map(function ($item) use ($openingStockId) {
                        return [
                            'stock_movement_id' => $openingStockId,
                            'product_id' => (int) $item['product_id'],
                            'unit_id' => (int) $item['unit_id'],
                            'quantity' => $item['quantity'],
                            'cost_price' => $item['cost_price'] ?? 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    })
                    ->all();

                DB::table('stock_movements_items')->insert($rows);
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
}
