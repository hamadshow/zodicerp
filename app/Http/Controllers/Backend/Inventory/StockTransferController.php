<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Models\TransferStock;
use App\Models\TransferStockItem;
use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use App\Services\UnitConversionService;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $stockTransfers = TransferStock::with(['fromWarehouse', 'toWarehouse', 'company', 'creator'])
            ->where('type', 'transfer')
            ->where(function ($query) {
                $query->whereNull('reference_type')->orWhere('reference_type', 'stock_transfer');
            })
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

        return Inertia::render('Backend/03-Inventory/TransferStock', [
            'transferStocks' => $stockTransfers->items(),
            'pagination' => $stockTransfers->linkCollection(),
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'initialShowForm' => false,
        ]);
    }

    public function show(Request $request, $id)
    {
        $transfer = TransferStock::with(['fromWarehouse', 'toWarehouse', 'company', 'creator', 'items.product', 'items.unit'])
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
            ->where('unit_type', 1)
            ->orderBy('id')
            ->get();

        $viewing = $request->query('edit') ? false : true;

        return Inertia::render('Backend/03-Inventory/TransferStock', [
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'initialShowForm' => true,
            'viewing' => $viewing,
            'transfer' => $transfer,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        $validated = $request->validate([
            'movement_date' => ['required', 'date'],
            'from_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'integer', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,id',
            ],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $userNotes = trim((string) ($validated['notes'] ?? ''));
        $notes = $userNotes !== ''
            ? 'TransferStock | '.$userNotes
            : 'TransferStock';

        try {
            DB::transaction(function () use ($validated, $companyId, $user, $notes) {
                $unitConversion = app(UnitConversionService::class);
                $weightedAverage = app(WeightedAverageCostService::class);
                // Generate a simple voucher number: TR-YYYYMMDD-Random
                $voucherNum = 'TR-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));

                $transfer = TransferStock::create([
                    'movement_date' => $validated['movement_date'],
                    'type' => 'transfer',
                    'direction' => 'out', // Out from 'from_warehouse' to 'to_warehouse'
                    'voucher_num' => $voucherNum,
                    'warehouse_id' => (int) $validated['from_warehouse_id'],
                    'from_warehouse_id' => (int) $validated['from_warehouse_id'],
                    'to_warehouse_id' => (int) $validated['to_warehouse_id'],
                    'company_id' => $companyId,
                    'created_by' => $user->id,
                    'reference_id' => null,
                    'reference_type' => 'stock_transfer',
                    'notes' => $notes,
                ]);
                $transfer->update(['reference_id' => $transfer->id]);

                $destination = TransferStock::create([
                    'movement_date' => $validated['movement_date'],
                    'type' => 'transfer',
                    'direction' => 'in',
                    'voucher_num' => $voucherNum.'-IN',
                    'warehouse_id' => (int) $validated['to_warehouse_id'],
                    'from_warehouse_id' => (int) $validated['from_warehouse_id'],
                    'to_warehouse_id' => (int) $validated['to_warehouse_id'],
                    'company_id' => $companyId,
                    'created_by' => $user->id,
                    'reference_id' => $transfer->id,
                    'reference_type' => 'stock_transfer_destination',
                    'notes' => $notes,
                ]);

                foreach ($validated['items'] as $item) {
                    // Use product's cost_per_item as the transfer cost basis
                    $product = Products::where('id', (int) $item['product_id'])->first();
                    $costPrice = (float) ($product->cost_per_item ?? 0);
                    $conversion = $unitConversion->toBase(
                        (int) $item['product_id'],
                        (int) $item['unit_id'],
                        (string) $item['quantity']
                    );

                    TransferStockItem::create([
                        'stock_movement_id' => $transfer->id,
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => $conversion['base_quantity'],
                        'original_quantity' => $item['quantity'],
                        'conversion_factor_snapshot' => $conversion['conversion_factor'],
                        'cost_price' => $costPrice,
                    ]);
                    $sourceLine = $transfer->items()->latest('id')->firstOrFail();
                    $outbound = $weightedAverage->applyOutbound(
                        (int) $item['product_id'],
                        (int) $validated['from_warehouse_id'],
                        $conversion['base_quantity'],
                        'stock_transfer_source',
                        (int) $sourceLine->id,
                        (string) $validated['movement_date'],
                        (int) $transfer->id,
                        (int) $sourceLine->id,
                    );
                    $sourceLine->update(['cost_price' => $outbound->unit_cost]);

                    $destinationLine = TransferStockItem::create([
                        'stock_movement_id' => $destination->id,
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => $conversion['base_quantity'],
                        'original_quantity' => $item['quantity'],
                        'conversion_factor_snapshot' => $conversion['conversion_factor'],
                        'cost_price' => $outbound->unit_cost,
                    ]);
                    $weightedAverage->applyInbound(
                        (int) $item['product_id'],
                        (int) $validated['to_warehouse_id'],
                        $conversion['base_quantity'],
                        (string) $outbound->unit_cost,
                        'stock_transfer_destination',
                        (int) $destinationLine->id,
                        (string) $validated['movement_date'],
                        $destination->id,
                        (int) $destinationLine->id,
                    );
                }
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

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        $validated = $request->validate([
            'movement_date' => ['required', 'date'],
            'from_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'integer', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,id',
            ],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $userNotes = trim((string) ($validated['notes'] ?? ''));
        $notes = $userNotes !== ''
            ? 'TransferStock | '.$userNotes
            : 'TransferStock';

        try {
            DB::transaction(function () use ($validated, $id, $notes) {
                if (DB::table('inventory_cost_transactions')
                    ->whereIn('source_id', DB::table('inventory_movement_lines')
                        ->where('stock_movement_id', $id)
                        ->pluck('id'))
                    ->exists()) {
                    throw new \RuntimeException('Posted stock transfers cannot be edited.');
                }
                $unitConversion = app(UnitConversionService::class);
                $transfer = TransferStock::where('id', $id)
                    ->firstOrFail();

                $transfer->update([
                    'movement_date' => $validated['movement_date'],
                    'warehouse_id' => (int) $validated['from_warehouse_id'],
                    'from_warehouse_id' => (int) $validated['from_warehouse_id'],
                    'to_warehouse_id' => (int) $validated['to_warehouse_id'],
                    'notes' => $notes,
                ]);

                // Delete old items and insert new ones
                $transfer->items()->delete();

                foreach ($validated['items'] as $item) {
                    // Use product's cost_per_item as the transfer cost basis
                    $product = Products::where('id', (int) $item['product_id'])->first();
                    $costPrice = (float) ($product->cost_per_item ?? 0);
                    $conversion = $unitConversion->toBase(
                        (int) $item['product_id'],
                        (int) $item['unit_id'],
                        (string) $item['quantity']
                    );

                    $transfer->items()->create([
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => $conversion['base_quantity'],
                        'original_quantity' => $item['quantity'],
                        'conversion_factor_snapshot' => $conversion['conversion_factor'],
                        'cost_price' => $costPrice,
                    ]);
                }
            });
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'حدث خطأ أثناء التحديث: '.$e->getMessage()]);
        }

        return redirect()
            ->route('admin.inventory.stock-transfers.index', [
                'country' => $request->route('country'),
                'lang' => $request->route('lang'),
            ])
            ->with('success', 'تم تحديث التحويل المخزني بنجاح');
    }

    public function destroy(Request $request, $id)
    {
        try {
            DB::transaction(function () use ($id) {
                $transfer = TransferStock::where('id', $id)
                    ->firstOrFail();

                if (DB::table('inventory_cost_transactions')
                    ->whereIn('source_id', DB::table('inventory_movement_lines')
                        ->whereIn('stock_movement_id', [$transfer->id])
                        ->pluck('id'))
                    ->exists()) {
                    throw new \RuntimeException('Posted stock transfers cannot be deleted.');
                }

                $transfer->items()->delete();
                DB::table('inventory_movement_headers')
                    ->where('reference_id', $transfer->id)
                    ->where('reference_type', 'stock_transfer_destination')
                    ->delete();
                $transfer->delete();
            });

            return back()->with('success', 'تم حذف التحويل بنجاح');
        } catch (\Exception $e) {
            return back()->withErrors(['general' => 'حدث خطأ أثناء الحذف: ' . $e->getMessage()]);
        }
    }
}
