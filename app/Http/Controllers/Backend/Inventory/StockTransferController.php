<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        $products = Products::query()
            ->select(['id', 'name', 'product_code', 'barcode', 'sku', 'cost_per_item'])
            ->when($companyId, function ($query) use ($companyId) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            })
            ->where('status', 'active')
            ->orderBy('name')
            ->limit(500)
            ->get();

        $units = ItemUnit::query()
            ->select(['id', 'name', 'company_id', 'conversion_factor', 'unit_type', 'base_unit'])
            ->active()
            ->when($companyId, function ($query) use ($companyId) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            })
            ->orderBy('name')
            ->get();

        $warehouses = Warehouses::query()
            ->select(['id', 'name', 'warehouse_code', 'company_id', 'status'])
            ->where('status', 'active')
            ->when($companyId, function ($query) use ($companyId) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            })
            ->orderBy('name')
            ->get();

        $nextReferenceId = (int) (DB::table('stock_movements')
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where('reference_type', 'stock_transfer')
            ->max('reference_id') ?? 0) + 1;

        $referenceNo = 'TR-'.str_pad((string) $nextReferenceId, 4, '0', STR_PAD_LEFT);

        $transfers = DB::table('stock_movements as m')
            ->leftJoin('stock_movements_details as d', 'm.id', '=', 'd.stock_movement_id')
            ->leftJoin('warehouses as fw', 'fw.id', '=', 'm.from_warehouse_id')
            ->leftJoin('warehouses as tw', 'tw.id', '=', 'm.to_warehouse_id')
            ->when($companyId, fn ($q) => $q->where('m.company_id', $companyId))
            ->where('m.reference_type', 'stock_transfer')
            ->groupBy(
                'm.id',
                'm.voucher_num',
                'm.movement_date',
                'm.from_warehouse_id',
                'm.to_warehouse_id',
                'm.notes',
                'm.company_id',
                'fw.name',
                'tw.name'
            )
            ->orderByDesc('m.id')
            ->limit(500)
            ->get([
                'm.id',
                'm.voucher_num',
                'm.movement_date',
                'm.from_warehouse_id',
                'm.to_warehouse_id',
                'm.notes',
                'm.company_id',
                'fw.name as from_warehouse_name',
                'tw.name as to_warehouse_name',
                DB::raw('COALESCE(SUM(d.quantity), 0) as total_quantity'),
            ]);

        return Inertia::render('Backend/03-Inventory/StockTransfers', [
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'defaultDate' => now()->toDateString(),
            'referenceId' => $nextReferenceId,
            'referenceNo' => $referenceNo,
            'transfers' => $transfers,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        if (! $companyId) {
            return redirect()->back()->with('error', 'Company is not set for this user.');
        }

        $validator = Validator::make($request->all(), [
            'date' => ['required', 'date'],
            'from_warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    $query->where('status', 'active')->where(function ($q) use ($companyId) {
                        $q->whereNull('company_id')->orWhere('company_id', $companyId);
                    });
                }),
            ],
            'to_warehouse_id' => [
                'required',
                'integer',
                'different:from_warehouse_id',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    $query->where('status', 'active')->where(function ($q) use ($companyId) {
                        $q->whereNull('company_id')->orWhere('company_id', $companyId);
                    });
                }),
            ],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where(function ($query) use ($companyId) {
                    $query->where('status', 'active')->where(function ($q) use ($companyId) {
                        $q->whereNull('company_id')->orWhere('company_id', $companyId);
                    });
                }),
            ],
            'items.*.unit_id' => [
                'required',
                'integer',
                Rule::exists('item_units', 'id')->where(function ($query) use ($companyId) {
                    $query->where('active', 1)->where(function ($q) use ($companyId) {
                        $q->whereNull('company_id')->orWhere('company_id', $companyId);
                    });
                }),
            ],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);

        $validator->after(function ($v) use ($request) {
            $items = $request->input('items', []);
            $ids = collect($items)
                ->pluck('product_id')
                ->filter()
                ->map(fn ($id) => (string) $id)
                ->all();
            if (count($ids) !== count(array_unique($ids))) {
                $v->errors()->add('items', 'Duplicate products are not allowed in the transfer.');
            }
        });

        try {
            $validated = $validator->validate();
        } catch (ValidationException $e) {
            Log::warning('StockTransfer store validation failed', [
                'user_id' => $user?->id,
                'company_id' => $companyId,
                'errors' => $e->errors(),
                'input' => $request->all(),
            ]);
            throw $e;
        }

        try {
            DB::beginTransaction();
            
            $nextReferenceId = (int) (DB::table('stock_movements')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->where('reference_type', 'stock_transfer')
                ->lockForUpdate()
                ->max('reference_id') ?? 0) + 1;

            $movementAt = Carbon::parse($validated['date'])->setTimeFromTimeString(now()->format('H:i:s'));
            $voucherNum = 'TR-'.str_pad((string) $nextReferenceId, 4, '0', STR_PAD_LEFT);

            $stockMovementId = DB::table('stock_movements')->insertGetId([
                'movement_date' => Carbon::parse($validated['date'])->toDateString(),
                'type' => 'transfer',
                'direction' => 'out', // Overall direction can be considered out from source
                'reference_id' => $nextReferenceId,
                'reference_type' => 'stock_transfer',
                'voucher_num' => $voucherNum,
                'from_warehouse_id' => (int) $validated['from_warehouse_id'],
                'to_warehouse_id' => (int) $validated['to_warehouse_id'],
                'company_id' => (int) $companyId,
                'notes' => $validated['notes'] ?? null,
                'created_at' => $movementAt,
                'updated_at' => $movementAt,
            ]);

            $rows = [];
            foreach ($validated['items'] as $item) {
                $rows[] = [
                    'stock_movement_id' => (int) $stockMovementId,
                    'product_id' => (int) $item['product_id'],
                    'unit_id' => (int) $item['unit_id'],
                    'quantity' => (float) $item['quantity'],
                    'cost_price' => 0, // Costs are handled separately in ERPs usually
                    'created_at' => $movementAt,
                    'updated_at' => $movementAt,
                ];
            }

            DB::table('stock_movements_details')->insert($rows);

            DB::commit();
            Log::info('StockTransfer saved successfully', [
                'id' => $stockMovementId,
                'voucher_num' => $voucherNum,
                'company_id' => $companyId
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('StockTransfer store failed', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user?->id,
                'company_id' => $companyId,
                'input' => $request->all()
            ]);
            return redirect()->back()->with('error', 'تعذر حفظ التحويل المخزني: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'تم حفظ التحويل المخزني بنجاح.');
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();
            DB::table('stock_movements_details')->where('stock_movement_id', $id)->delete();
            DB::table('stock_movements')->where('id', $id)->delete();
            DB::commit();
            Log::info('StockTransfer deleted successfully', ['id' => $id]);
            return redirect()->back()->with('success', 'تم حذف التحويل بنجاح.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('StockTransfer delete failed', [
                'id' => $id,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->with('error', 'تعذر حذف التحويل: ' . $e->getMessage());
        }
    }
}
