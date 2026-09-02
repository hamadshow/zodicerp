<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Warehouses;
use App\Models\Products;
use App\Models\ItemUnit;
use App\Services\Inventory\StockAdjustmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    public function __construct(
        protected StockAdjustmentService $adjustmentService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $query = \Illuminate\Support\Facades\DB::table('stock_adjustments')
            ->where('company_id', $companyId)
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('adjustment_number', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        $perPage = max(5, min(100, (int) $request->input('per_page', 15)));
        $total = $query->count();
        $adjustments = $query->limit($perPage)
            ->offset(((int) $request->input('page', 1) - 1) * $perPage)
            ->get();

        $warehouses = Warehouses::select('id', 'name as name_ar')->get();
        $products = Products::select('id', 'name as name_ar', 'sku')->get();
        $units = ItemUnit::select('id', 'name as name_ar')->get();

        return Inertia::render('Backend/03-Inventory/StockAdjustment', [
            'adjustments' => ['data' => $adjustments, 'total' => $total, 'per_page' => $perPage, 'current_page' => (int) $request->input('page', 1)],
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'filters' => $request->only(['search', 'status', 'warehouse_id']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'adjustment_date' => 'required|date',
            'reason' => 'required|in:correction,damage,expiring,found,lost,theft,count差异,other',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.adjustment_quantity' => 'required|numeric',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.reason' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            $adjustment = $this->adjustmentService->createAdjustment($validated);
            return redirect()->back()->with('success', "Stock Adjustment {$adjustment->adjustment_number} created successfully.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating adjustment: ' . $e->getMessage())->withInput();
        }
    }

    public function approve($id)
    {
        try {
            $adjustment = $this->adjustmentService->approveAdjustment((int) $id);
            return redirect()->back()->with('success', "Adjustment {$adjustment->adjustment_number} approved.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function cancel($id)
    {
        try {
            $adjustment = $this->adjustmentService->cancelAdjustment((int) $id);
            return redirect()->back()->with('success', 'Adjustment cancelled.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy($id)
    {
        $adjustment = \Illuminate\Support\Facades\DB::table('stock_adjustments')->where('id', $id)->first();
        if (!$adjustment) {
            return redirect()->back()->with('error', 'Adjustment not found.');
        }

        if ($adjustment->status === 'approved') {
            return redirect()->back()->with('error', 'Approved adjustments cannot be deleted.');
        }

        \Illuminate\Support\Facades\DB::table('stock_adjustment_items')->where('adjustment_id', $id)->delete();
        \Illuminate\Support\Facades\DB::table('stock_adjustments')->where('id', $id)->delete();

        return redirect()->back()->with('success', 'Adjustment deleted.');
    }

    public function stockCard(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $data = $this->adjustmentService->getStockCard(
            (int) $request->input('product_id'),
            $request->input('warehouse_id'),
            $request->input('date_from'),
            $request->input('date_to')
        );

        return response()->json($data);
    }

    public function warehouseReport(Request $request)
    {
        $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
        ]);

        $data = $this->adjustmentService->getWarehouseStockReport((int) $request->input('warehouse_id'));

        return response()->json($data);
    }
}
