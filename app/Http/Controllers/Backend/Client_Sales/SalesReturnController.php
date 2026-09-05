<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Client_Sales\SalesReturn;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use App\Services\Client_Sales\SalesReturnService;
use App\Services\Accounting\JournalReversalService;
use App\Models\Accounting\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesReturnController extends Controller
{
    protected SalesReturnService $returnService;

    public function __construct(SalesReturnService $returnService)
    {
        $this->returnService = $returnService;
    }

    public function index(Request $request)
    {
        $query = SalesReturn::query()
            ->with(['customer', 'warehouse', 'creator', 'invoice', 'details'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($q) use ($search) {
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
        if ($request->filled('return_type')) {
            $query->where('return_type', $request->input('return_type'));
        }
        if ($request->filled('return_reason')) {
            $query->where('return_reason', $request->input('return_reason'));
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSortColumns = [
            'id', 'return_number', 'return_date', 'customer_id', 'invoice_id',
            'warehouse_id', 'return_type', 'return_reason', 'refund_status', 'status',
            'total_amount', 'refund_amount', 'created_at', 'updated_at'
        ];
        if (in_array($sortBy, $allowedSortColumns, true)) {
            if (in_array($sortBy, ['customer_id'], true)) {
                $query->join('customers', 'customers.id', '=', 'sales_returns.customer_id')
                    ->orderBy('customers.name_ar', $sortDir)
                    ->select('sales_returns.*');
            } elseif (in_array($sortBy, ['warehouse_id'], true)) {
                $query->join('warehouses', 'warehouses.id', '=', 'sales_returns.warehouse_id')
                    ->orderBy('warehouses.name', $sortDir)
                    ->select('sales_returns.*');
            } else {
                $query->orderBy($sortBy, $sortDir);
            }
        }

        $perPage = max(5, min(100, (int) $request->input('per_page', 10)));
        $returns = $query->paginate($perPage)->withQueryString();

        $customers = \App\Models\Client_Sales\Customer::where('is_active', true)
            ->select('id', 'name_ar', 'name_en', 'customer_code')
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

        $invoices = SalesInvoice::query()
            ->with(['details.product', 'details.tax', 'customer', 'warehouse', 'currency'])
            ->whereIn('payment_status', ['unpaid', 'partial', 'paid', 'overdue'])
            ->orderByDesc('invoice_date')
            ->select('id', 'invoice_number', 'invoice_date', 'customer_id', 'warehouse_id', 'currency_id', 'exchange_rate', 'total_amount')
            ->limit(500)
            ->get();

        $returnedMapByInvoice = $this->returnService->getPreviouslyReturnedQuantitiesForInvoices($invoices->pluck('id')->all());

        $invoices = $invoices->map(function ($inv) use ($returnedMapByInvoice) {
            $returnedMap = $returnedMapByInvoice[$inv->id] ?? [];
                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'invoice_date' => $inv->invoice_date,
                    'customer_id' => $inv->customer_id,
                    'warehouse_id' => $inv->warehouse_id,
                    'currency_id' => $inv->currency_id,
                    'exchange_rate' => (float) ($inv->exchange_rate ?? 1),
                    'total_amount' => (float) $inv->total_amount,
                    'customer_name_ar' => $inv->customer?->name_ar ?? '',
                    'customer_name_en' => $inv->customer?->name_en ?? '',
                    'warehouse_name_ar' => $inv->warehouse?->name_ar ?? '',
                    'warehouse_name_en' => $inv->warehouse?->name ?? '',
                    'currency_code' => $inv->currency?->code ?? '',
                    'details' => $inv->details->map(function ($detail) use ($returnedMap) {
                        $invoiceQty = (float) $detail->quantity;
                        $key = $detail->id ?: ('s_' . $detail->product_id);
                        $alreadyReturned = $returnedMap[$key] ?? 0;
                        $available = max(0, $invoiceQty - $alreadyReturned);

                        $taxPercentage = (float) ($detail->tax_percentage ?? 0);
                        if ($taxPercentage <= 0 && $detail->tax_id) {
                            $taxType = $detail->tax;
                            if ($taxType) {
                                $taxPercentage = (float) $taxType->rate;
                            }
                        }
                        if ($taxPercentage <= 0 && $detail->tax_amount > 0 && $invoiceQty > 0) {
                            $netAmount = $invoiceQty * (float) $detail->unit_price;
                            if ($netAmount > 0) {
                                $taxPercentage = round(($detail->tax_amount / $netAmount) * 100, 2);
                            }
                        }

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
                            'tax_percentage' => $taxPercentage,
                            'tax_amount' => (float) $detail->tax_amount,
                            'batch_number' => $detail->batch_number ?? '',
                            'serial_number' => $detail->serial_number ?? '',
                            'expiry_date' => $detail->expiry_date,
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Backend/05-Client_Sales/SalesReturn', [
            'returns' => $returns,
            'customers' => $customers,
            'invoices' => $invoices,
            'salesInvoices' => $invoices,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'filters' => $request->only(['search', 'status', 'refund_status', 'return_type', 'return_reason', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'return_date' => 'required|date',
            'received_date' => 'nullable|date',
            'invoice_id' => 'required|exists:sales_invoices,id',
            'customer_id' => 'required|exists:customers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'return_reason' => 'required|in:damaged,defective,wrong_item,excess',
            'return_type' => 'nullable|in:full_return,partial_return,exchange',
            'refund_status' => 'nullable|in:pending,partial,completed,cancelled',
            'status' => 'nullable|in:draft,requested,approved,completed,cancelled',
            'restocking_fee' => 'nullable|numeric|min:0',
            'approval_notes' => 'nullable|string',
            'received_by' => 'nullable|integer|exists:users,id',
            'inspection_notes' => 'nullable|string',
            'customer_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.invoice_detail_id' => 'nullable|exists:sales_invoice_details,id',
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
            $this->returnService->createSalesReturn($request->all());
            DB::commit();
            return redirect()->back()->with('success', 'Sales Return created successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating sales return: ' . $e->getMessage())->withInput();
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'return_date' => 'required|date',
            'received_date' => 'nullable|date',
            'invoice_id' => 'required|exists:sales_invoices,id',
            'customer_id' => 'required|exists:customers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'return_reason' => 'required|in:damaged,defective,wrong_item,excess',
            'return_type' => 'nullable|in:full_return,partial_return,exchange',
            'refund_status' => 'nullable|in:pending,partial,completed,cancelled',
            'status' => 'nullable|in:draft,requested,approved,completed,cancelled',
            'restocking_fee' => 'nullable|numeric|min:0',
            'approval_notes' => 'nullable|string',
            'received_by' => 'nullable|integer|exists:users,id',
            'inspection_notes' => 'nullable|string',
            'customer_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer|exists:sales_return_details,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.invoice_detail_id' => 'nullable|exists:sales_invoice_details,id',
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
            $this->returnService->updateSalesReturn((int) $id, $request->all());
            DB::commit();
            return redirect()->back()->with('success', 'Sales Return updated successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating sales return: ' . $e->getMessage())->withInput();
        }
    }

    public function destroy($id)
    {
        $salesReturn = SalesReturn::withTrashed()->findOrFail($id);
        DB::beginTransaction();
        try {
            if ($salesReturn->trashed()) {
                $salesReturn->restore();
                $message = 'Sales Return restored successfully.';
            } else {
                // P0-06: If posted, create reversal journal
                $header = JournalEntry::where('reference', $salesReturn->return_number)
                    ->where('entry_type', 'SalesReturn')
                    ->first();

                if ($header && in_array($header->status, ['Post', 'posted'])) {
                    app(JournalReversalService::class)->createReversal(
                        $header->entry_code,
                        'Sales Return deletion - ' . $salesReturn->return_number
                    );
                }

                $salesReturn->delete();
                $message = 'Sales Return deleted successfully.';
            }
            DB::commit();
            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage());
        }
    }
}