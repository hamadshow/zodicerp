<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403, 'Company not set for this user.');
        }

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

        return Inertia::render('Backend/03-Inventory/TransferStock', [
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
        ]);
    }

    public function store(Request $request)
    {
        if (! auth()->check()) {
            return back()->withErrors(['auth' => 'غير مصدق عليه.']);
        }

        $companyId = auth()->user()->company_id;
        if (! $companyId) {
            return back()->withErrors(['general' => 'المستخدم غير مرتبط بشركة.']);
        }

        $allowedWarehouseIds = Warehouses::query()
            ->where('company_id', $companyId)
            ->pluck('id')
            ->all();

        if ($allowedWarehouseIds === []) {
            return back()->withErrors(['general' => 'لا توجد مستودعات مرتبطة بشركتك لإتمام التحويل.']);
        }

        $validated = $request->validate([
            'movement_date' => ['required', 'date'],
            'from_warehouse_id' => ['required', 'integer', Rule::in($allowedWarehouseIds)],
            'to_warehouse_id' => ['required', 'integer', Rule::in($allowedWarehouseIds), 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where('company_id', $companyId),
            ],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $userNotes = trim((string) ($validated['notes'] ?? ''));
        $notes = $userNotes !== ''
            ? 'TransferStock | '.$userNotes
            : 'TransferStock';

        $userId = auth()->id();

        try {
            DB::transaction(function () use ($validated, $companyId, $userId, $notes) {
                $headerId = DB::table('stock_movements')->insertGetId([
                    'movement_date' => $validated['movement_date'],
                    'warehouse_id' => (int) $validated['from_warehouse_id'],
                    'from_warehouse_id' => (int) $validated['from_warehouse_id'],
                    'to_warehouse_id' => (int) $validated['to_warehouse_id'],
                    'company_id' => $companyId,
                    'created_by' => $userId,
                    'notes' => $notes,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $rows = collect($validated['items'])
                    ->map(function (array $item) use ($headerId) {
                        return [
                            'stock_movement_id' => $headerId,
                            'product_id' => (int) $item['product_id'],
                            'unit_id' => (int) $item['unit_id'],
                            'quantity' => $item['quantity'],
                            'cost_price' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    })
                    ->all();

                DB::table('stock_movements_items')->insert($rows);
            });
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'حدث خطأ أثناء الحفظ: '.$e->getMessage()]);
        }

        return redirect()
            ->route('admin.inventory.stock-transfers.index', [
                'country' => $request->route('country'),
                'lang' => $request->route('lang'),
            ])
            ->with('success', 'تم حفظ التحويل المخزني بنجاح');
    }
}
