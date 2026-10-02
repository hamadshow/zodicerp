<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Warehouses;
use App\Models\Products;
use App\Models\ItemUnit;
use App\Services\CompanyContext;
use App\Services\Inventory\StockAdjustmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    public function __construct(
        protected StockAdjustmentService $adjustmentService,
        protected CompanyContext $companyContext,
    ) {}

    public function index(Request $request): Response
    {
        // Company isolation (Phase 1): fail closed — no implicit company fallback.
        $companyId = $this->companyContext->id();

        $query = \Illuminate\Support\Facades\DB::table('stock_adjustments')
            ->where('company_id', $companyId)
            ->selectSub(
                \Illuminate\Support\Facades\DB::table('stock_adjustment_items')
                    ->whereColumn('stock_adjustment_items.adjustment_id', 'stock_adjustments.id')
                    ->selectRaw('COUNT(*)'),
                'items_count'
            )
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
        $total = (clone $query)->count();
        $adjustments = $query->limit($perPage)
            ->offset(((int) $request->input('page', 1) - 1) * $perPage)
            ->get();

        // Option lists are company-scoped so a user can never select another
        // company's warehouse/product/unit (pre-fix these were global).
        $warehouses = Warehouses::query()
            ->where('company_id', $companyId)
            ->select('id', 'name as name_ar')
            ->orderBy('id')
            ->get();
        $products = Products::query()
            ->where('company_id', $companyId)
            ->select('id', 'name as name_ar', 'sku')
            ->orderBy('id', 'desc')
            ->get();
        $units = ItemUnit::query()
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->select('id', 'name as name_ar')
            ->orderBy('id')
            ->get();

        // Stock card support: the page modal loads this prop via an Inertia
        // partial reload (only=['stockCard']) — no raw fetch, CSRF handled by
        // Inertia itself.
        $stockCard = null;
        if ($request->filled('stock_card_product')) {
            $request->validate([
                'stock_card_product' => ['required', 'exists:products,id'],
            ]);
            $this->assertOwnedProduct((int) $request->input('stock_card_product'), $companyId);

            $stockCard = $this->adjustmentService->getStockCard(
                (int) $request->input('stock_card_product'),
                $request->filled('stock_card_warehouse') ? (int) $request->input('stock_card_warehouse') : null,
                $request->input('stock_card_from'),
                $request->input('stock_card_to'),
                $companyId
            );
        }

        return Inertia::render('Backend/03-Inventory/StockAdjustment', [
            'adjustments' => ['data' => $adjustments, 'total' => $total, 'per_page' => $perPage, 'current_page' => (int) $request->input('page', 1)],
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'filters' => $request->only(['search', 'status', 'warehouse_id']),
            'stockCard' => $stockCard,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'adjustment_date' => 'required|date',
            'reason' => 'required|in:correction,damage,expiring,found,lost,theft,count,other',
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
            $this->companyContext->id(); // fail closed without company context

            $adjustment = $this->adjustmentService->approveAdjustment((int) $id);
            return redirect()->back()->with('success', "Adjustment {$adjustment->adjustment_number} approved.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function cancel($id)
    {
        try {
            $this->companyContext->id(); // fail closed without company context

            $adjustment = $this->adjustmentService->cancelAdjustment((int) $id);
            return redirect()->back()->with('success', 'Adjustment cancelled.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy($id)
    {
        $companyId = $this->companyContext->id();

        $adjustment = \Illuminate\Support\Facades\DB::table('stock_adjustments')
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->first();
        if (!$adjustment) {
            return redirect()->back()->with('error', 'Adjustment not found.');
        }

        if ($adjustment->status === 'approved') {
            return redirect()->back()->with('error', 'Approved adjustments cannot be deleted. Cancel the adjustment instead — it reverses the ledger exactly.');
        }

        // Phase 4 audit rule: never destroy evidence of an applied adjustment.
        // Anything that already produced movements must be cancelled (reversed),
        // not deleted.
        $hasMovements = \Illuminate\Support\Facades\DB::table('inventory_movement_headers')
            ->where('reference_id', $id)
            ->whereIn('reference_type', ['stock_adjustment', 'stock_adjustment_reversal'])
            ->exists();
        if ($hasMovements) {
            return redirect()->back()->with('error', 'This adjustment has movement history. Cancel it instead so the reversal stays auditable.');
        }

        \Illuminate\Support\Facades\DB::table('stock_adjustment_items')->where('adjustment_id', $id)->delete();
        \Illuminate\Support\Facades\DB::table('stock_adjustments')->where('id', $id)->delete();

        return redirect()->back()->with('success', 'Adjustment deleted.');
    }

    public function stockCard(Request $request)
    {
        $companyId = $this->companyContext->id();

        $request->validate([
            'product_id' => ['required', 'exists:products,id'],
        ]);

        $this->assertOwnedProduct((int) $request->input('product_id'), $companyId);

        $data = $this->adjustmentService->getStockCard(
            (int) $request->input('product_id'),
            $request->input('warehouse_id'),
            $request->input('date_from'),
            $request->input('date_to'),
            $companyId
        );

        return response()->json($data);
    }

    public function warehouseReport(Request $request)
    {
        $companyId = $this->companyContext->id();

        $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
        ]);

        $this->assertOwnedWarehouse((int) $request->input('warehouse_id'), $companyId);

        $data = $this->adjustmentService->getWarehouseStockReport(
            (int) $request->input('warehouse_id'),
            $companyId
        );

        return response()->json($data);
    }

    /**
     * Cross-company guard for report inputs: the referenced master data must
     * belong to the active company (404 when not — same convention as the
     * hardened Nationality/Profession controllers).
     */
    private function assertOwnedProduct(int $productId, int $companyId): void
    {
        $owner = Products::query()->whereKey($productId)->value('company_id');
        abort_unless((int) $owner === $companyId, 404);
    }

    private function assertOwnedWarehouse(int $warehouseId, int $companyId): void
    {
        $owner = Warehouses::query()->whereKey($warehouseId)->value('company_id');
        abort_unless((int) $owner === $companyId, 404);
    }
}
