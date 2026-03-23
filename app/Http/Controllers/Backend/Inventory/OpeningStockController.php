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
    /**
     * Display a listing of opening stocks.
     */
    public function index(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403, 'Company not set for this user.');
        }

        $openingStocks = \App\Models\OpeningStock::with(['warehouse', 'company', 'creator', 'items.product', 'items.unit'])
            ->where('notes', 'like', '%OpeningStock%')
            ->where('company_id', $companyId)
            ->orderByDesc('id')
            ->paginate(25);

        $warehouses = Warehouses::query()
            ->select(['id', 'name'])
            ->where('company_id', $companyId)
            ->orderBy('id')
            ->get();

        $products = Products::query()
            ->select(['id', 'name', 'sku', 'barcode'])
            ->where('company_id', $companyId)
            ->orderBy('id', 'desc')
            ->limit(2000)
            ->get();

        $units = ItemUnit::query()
            ->select(['id', 'name'])
            ->where('active', true)
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
     * Show the form for creating a new opening stock.
     */
    public function create()
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

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'openingStocks' => [],
            'pagination' => [],
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'initialShowForm' => true,
        ]);
    }

    /**
     * Store a newly created opening stock in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        if (! $companyId) {
            return back()->withErrors(['general' => 'المستخدم غير مرتبط بشركة.']);
        }
        $userId = $user->id;

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
            DB::transaction(function () use ($validated, $companyId, $userId) {
                // Ensure 'OpeningStock' tag is in notes for filtering
                $notes = $validated['notes'] ?? '';
                if (strpos($notes, 'OpeningStock') === false) {
                    $notes = trim($notes . ' OpeningStock');
                }

                $openingStockId = DB::table('stock_movements')->insertGetId([
                    'movement_date' => $validated['movement_date'] ?? null,
                    'warehouse_id' => $validated['warehouse_id'],
                    'company_id' => $companyId,
                    'created_by' => $userId,
                    'notes' => $notes,
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

    /**
     * Display the specified opening stock.
     */
    public function show($id)
    {
        $openingStock = \App\Models\OpeningStock::with(['warehouse', 'company', 'creator', 'items.product', 'items.unit'])
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

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'openingStock' => $openingStock,
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'initialShowForm' => true,
            'viewing' => true,
        ]);
    }

    /**
     * Remove the specified opening stock from storage.
     */
    public function destroy(Request $request, $id)
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403);
        }

        try {
            DB::transaction(function () use ($id, $companyId) {
                // Ensure the movement belongs to the company before deleting items
                $exists = DB::table('stock_movements')
                    ->where('id', $id)
                    ->where('company_id', $companyId)
                    ->exists();

                if (! $exists) {
                    throw new \Exception('Unauthorized or record not found.');
                }

                DB::table('stock_movements_items')->where('stock_movement_id', $id)->delete();
                DB::table('stock_movements')->where('id', $id)->delete();
            });

            return back()->with('success', 'Opening stock deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'An error occurred while deleting: ' . $e->getMessage()]);
        }
    }
}
