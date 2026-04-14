<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseInvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseInvoice::query()
            ->with(['supplier', 'currency', 'creator', 'items'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('payment_status', $request->input('status'));
        }

        $invoices = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $suppliers = Supplier::where('is_active', true)
            ->select('id', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->where('unit_type', 1)->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();

        // Mock data for terms (should be replaced with actual models later)
        $paymentTerms = [
            ['id' => 1, 'name' => 'Net 30'],
            ['id' => 2, 'name' => 'Net 60'],
            ['id' => 3, 'name' => 'Cash on Delivery'],
            ['id' => 4, 'name' => 'Advance Payment'],
        ];

        return Inertia::render('Backend/04-Purchases/PurchaseInvoice', [
            'invoices' => $invoices,
            'suppliers' => $suppliers,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'paymentTerms' => $paymentTerms,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'invoice_type' => 'required|in:standard,proforma,credit_note,debit_note',
            'payment_status' => 'required|in:unpaid,partial,paid,overdue',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate number if not provided
            $number = $request->invoice_number ?? 'INV-'.date('Ymd').'-'.rand(1000, 9999);

            // Default warehouse if not provided (should be provided in real app)
            $defaultWarehouseId = Warehouses::first()->id ?? 1;
            $warehouseId = $request->warehouse_id ?? $defaultWarehouseId;

            $invoice = PurchaseInvoice::create([
                'invoice_number' => $number,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'supplier_id' => $request->supplier_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'invoice_type' => $request->invoice_type,
                'payment_status' => $request->payment_status,
                'notes' => $request->notes,
                'created_by' => Auth::id(),
                'warehouse_id' => $warehouseId,

                // Financials
                'subtotal' => $request->subtotal ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'discount_amount' => $request->discount_amount ?? 0,
                'shipping_cost' => $request->shipping_cost ?? 0,
                'other_costs' => $request->other_costs ?? 0,
                'total_amount' => $request->total_amount ?? 0,
                'paid_amount' => $request->paid_amount ?? 0,
                // balance_amount is generated

                'payment_terms' => $request->payment_terms_id, // Note: column is payment_terms (string) or use ID if schema changed. Schema says string(255).
            ]);

            foreach ($validated['items'] as $index => $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $item['warehouse_id'] ?? $warehouseId,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'tax_percentage' => $item['tax_percent'] ?? $item['tax_percentage'] ?? 0,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Invoice created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error creating invoice: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $invoice = PurchaseInvoice::findOrFail($id);

        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'invoice_type' => 'required|in:standard,proforma,credit_note,debit_note',
            'payment_status' => 'required|in:unpaid,partial,paid,overdue',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $defaultWarehouseId = Warehouses::first()->id ?? 1;
            $warehouseId = $request->warehouse_id ?? $invoice->warehouse_id ?? $defaultWarehouseId;

            $invoice->update([
                'invoice_number' => $request->invoice_number,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'supplier_id' => $request->supplier_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'invoice_type' => $request->invoice_type,
                'payment_status' => $request->payment_status,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
                'warehouse_id' => $warehouseId,
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'discount_amount' => $request->discount_amount,
                'shipping_cost' => $request->shipping_cost,
                'other_costs' => $request->other_costs,
                'total_amount' => $request->total_amount,
                'paid_amount' => $request->paid_amount,
                'payment_terms' => $request->payment_terms_id,
            ]);

            // Sync items: Delete old and re-create
            $invoice->items()->delete();

            foreach ($validated['items'] as $index => $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $item['warehouse_id'] ?? $warehouseId,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'tax_percentage' => $item['tax_percent'] ?? $item['tax_percentage'] ?? 0,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Invoice updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error updating invoice: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $invoice = PurchaseInvoice::findOrFail($id);
            $invoice->delete(); // Soft delete

            return redirect()->back()->with('success', 'Purchase Invoice deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting invoice: '.$e->getMessage());
        }
    }
}
