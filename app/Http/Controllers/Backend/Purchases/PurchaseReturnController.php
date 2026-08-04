<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Models\Vendor_Purchases\PurchaseReturn;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use App\Services\Vendor_Purchases\PurchaseReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseReturnController extends Controller
{
    protected PurchaseReturnService $returnService;

    public function __construct(PurchaseReturnService $returnService)
    {
        $this->returnService = $returnService;
    }

    public function index(Request $request)
    {
        $query = PurchaseReturn::query()
            ->with(['supplier', 'warehouse', 'creator', 'invoice', 'details'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name_ar', 'like', "%{$search}%");
                    })
                    ->orWhereHas('invoice', function ($q) use ($search) {
                        $q->where('invoice_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('refund_status')) {
            $query->where('refund_status', $request->input('refund_status'));
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSortColumns = [
            'id', 'return_number', 'return_date', 'supplier_id', 'invoice_id',
            'warehouse_id', 'return_type', 'refund_status', 'status', 'total_amount',
            'created_at', 'updated_at'
        ];
        if (in_array($sortBy, $allowedSortColumns, true)) {
            if (in_array($sortBy, ['supplier_id'], true)) {
                $query->join('suppliers', 'suppliers.id', '=', 'purchase_returns.supplier_id')
                    ->orderBy('suppliers.name_ar', $sortDir)
                    ->select('purchase_returns.*');
            } elseif (in_array($sortBy, ['warehouse_id'], true)) {
                $query->join('warehouses', 'warehouses.id', '=', 'purchase_returns.warehouse_id')
                    ->orderBy('warehouses.name', $sortDir)
                    ->select('purchase_returns.*');
            } else {
                $query->orderBy($sortBy, $sortDir);
            }
        }

        $perPage = max(5, min(100, (int) $request->input('per_page', 10)));
        $returns = $query->paginate($perPage)->withQueryString();

        $suppliers = Supplier::where('is_active', true)
            ->select('id', 'name_ar', 'currency_id')
            ->orderBy('name_ar')
            ->get();

        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku')
            ->orderBy('id')
            ->get();

        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')
            ->orderBy('name')
            ->get();

        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')
            ->orderBy('name')
            ->get();

        $invoices = PurchaseInvoice::query()
            ->with(['items.product', 'supplier', 'warehouse', 'currency'])
            ->whereIn('payment_status', ['unpaid', 'partial', 'paid', 'overdue'])
            ->orderByDesc('invoice_date')
            ->select('id', 'invoice_number', 'invoice_date', 'supplier_id', 'warehouse_id', 'currency_id', 'exchange_rate', 'total_amount')
            ->limit(500)
            ->get()
            ->map(function ($inv) {
                $returnedMap = $this->returnService->getPreviouslyReturnedQuantities($inv->id);
                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'invoice_date' => $inv->invoice_date,
                    'supplier_id' => $inv->supplier_id,
                    'warehouse_id' => $inv->warehouse_id,
                    'currency_id' => $inv->currency_id,
                    'exchange_rate' => (float) ($inv->exchange_rate ?? 1),
                    'total_amount' => (float) $inv->total_amount,
                    'supplier_name_ar' => $inv->supplier?->name_ar ?? '',
                    'supplier_name_en' => $inv->supplier?->name_ar ?? '',
                    'warehouse_name_ar' => $inv->warehouse?->name ?? '',
                    'warehouse_name_en' => $inv->warehouse?->name ?? '',
                    'currency_code' => $inv->currency?->code ?? '',
                    'details' => $inv->items->map(function ($detail) use ($returnedMap) {
                        $invoiceQty = (float) $detail->quantity;
                        $key = $detail->id ?: ('p_' . $detail->product_id);
                        $alreadyReturned = $returnedMap[$key] ?? 0;
                        $available = max(0, $invoiceQty - $alreadyReturned);
                        return [
                            'id' => $detail->id,
                            'product_id' => $detail->product_id,
                            'item_name_ar' => $detail->product?->name_ar ?? '',
                            'item_name_en' => $detail->product?->name_en ?? '',
                            'invoice_qty' => $invoiceQty,
                            'returned_qty' => $alreadyReturned,
                            'available_qty' => $available,
                            'unit_id' => $detail->unit_id,
                            'unit_price' => (float) $detail->unit_price,
                            'discount_percentage' => (float) ($detail->discount_percentage ?? 0),
                            'discount_amount' => (float) ($detail->discount_amount ?? 0),
                            'tax_percentage' => (float) ($detail->tax_percentage ?? 0),
                            'batch_number' => $detail->batch_number ?? '',
                            'serial_number' => $detail->serial_number ?? '',
                            'expiry_date' => $detail->expiry_date,
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Backend/04-Purchases/PurchasesReturn', [
            'returns' => $returns,
            'suppliers' => $suppliers,
            'invoices' => $invoices,
            'purchaseInvoices' => $invoices,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'filters' => $request->only(['search', 'status', 'refund_status', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'return_date' => 'required|date',
            'received_date' => 'nullable|date',
            'invoice_id' => 'required|exists:purchase_invoices,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'return_reason' => 'required|in:damaged,defective,wrong_item,excess_quantity,quality_issue,expired,other',
            'return_type' => 'nullable|in:full_return,partial_return,exchange',
            'refund_status' => 'nullable|in:pending,partial,completed,cancelled',
            'status' => 'nullable|in:draft,requested,approved,completed,cancelled',
            'restocking_fee' => 'nullable|numeric|min:0',
            'approval_notes' => 'nullable|string',
            'received_by' => 'nullable|integer|exists:users,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.invoice_detail_id' => 'nullable|exists:purchase_invoice_details,id',
            'items.*.return_qty' => 'required|numeric|min:0',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_percentage' => 'nullable|numeric|min:0',
            'items.*.batch_number' => 'nullable|string|max:100',
            'items.*.serial_number' => 'nullable|string|max:100',
            'items.*.return_reason_details' => 'nullable|string',
            'items.*.condition' => 'nullable|in:new,used,damaged,defective',
            'items.*.inspection_notes' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();
            $this->returnService->createPurchaseReturn($request->all());
            DB::commit();
            return redirect()->back()->with('success', 'Purchase Return created successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating purchase return: ' . $e->getMessage())->withInput();
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'return_date' => 'required|date',
            'received_date' => 'nullable|date',
            'invoice_id' => 'required|exists:purchase_invoices,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'return_reason' => 'required|in:damaged,defective,wrong_item,excess_quantity,quality_issue,expired,other',
            'return_type' => 'nullable|in:full_return,partial_return,exchange',
            'refund_status' => 'nullable|in:pending,partial,completed,cancelled',
            'status' => 'nullable|in:draft,requested,approved,completed,cancelled',
            'restocking_fee' => 'nullable|numeric|min:0',
            'approval_notes' => 'nullable|string',
            'received_by' => 'nullable|integer|exists:users,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer|exists:purchase_return_details,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.invoice_detail_id' => 'nullable|exists:purchase_invoice_details,id',
            'items.*.return_qty' => 'required|numeric|min:0',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_percentage' => 'nullable|numeric|min:0',
            'items.*.batch_number' => 'nullable|string|max:100',
            'items.*.serial_number' => 'nullable|string|max:100',
            'items.*.return_reason_details' => 'nullable|string',
            'items.*.condition' => 'nullable|in:new,used,damaged,defective',
            'items.*.inspection_notes' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();
            $this->returnService->updatePurchaseReturn((int) $id, $request->all());
            DB::commit();
            return redirect()->back()->with('success', 'Purchase Return updated successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating purchase return: ' . $e->getMessage())->withInput();
        }
    }

    public function destroy($id)
    {
        $purchaseReturn = PurchaseReturn::withTrashed()->findOrFail($id);
        DB::beginTransaction();
        try {
            if ($purchaseReturn->trashed()) {
                $purchaseReturn->restore();
                $message = 'Purchase Return restored successfully.';
            } else {
                $purchaseReturn->delete();
                $message = 'Purchase Return deleted successfully.';
            }
            DB::commit();
            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage());
        }
    }
}
