<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PurchaseOrder;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::query()
            ->with(['vendor', 'currency', 'creator', 'items'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                    ->orWhereHas('vendor', function ($q) use ($search) {
                        $q->where('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $orders = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $vendors = Supplier::where('is_active', true)
            ->select('id', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_ar')->where('unit_type', 1)->get();
        $warehouses = Warehouses::select('id', 'name as name_ar')->get();

        // Mock data for terms (should be replaced with actual models later)
        $paymentTerms = [
            ['id' => 1, 'name' => 'Net 30'],
            ['id' => 2, 'name' => 'Net 60'],
            ['id' => 3, 'name' => 'Cash on Delivery'],
            ['id' => 4, 'name' => 'Advance Payment'],
        ];

        $deliveryTerms = [
            ['id' => 1, 'name' => 'EXW - Ex Works'],
            ['id' => 2, 'name' => 'FOB - Free on Board'],
            ['id' => 3, 'name' => 'CIF - Cost, Insurance and Freight'],
            ['id' => 4, 'name' => 'DDP - Delivered Duty Paid'],
        ];

        return Inertia::render('Backend/04-Purchases/PurchaseOrder', [
            'orders' => $orders,
            'vendors' => $vendors,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'paymentTerms' => $paymentTerms,
            'deliveryTerms' => $deliveryTerms,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'po_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:po_date',
            'vendor_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => 'required|in:draft,pending_approval,approved,sent_to_vendor,partially_received,fully_received,invoiced,closed,cancelled',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name_ar' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate number if not provided
            $number = 'PO-'.date('Ymd').'-'.rand(1000, 9999);

            $order = PurchaseOrder::create([
                'po_number' => $number,
                'po_date' => $request->po_date,
                'expected_delivery_date' => $request->expected_delivery_date,
                'vendor_id' => $request->vendor_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'priority' => $request->priority ?? 'medium',
                'notes' => $request->notes,
                'created_by' => Auth::id(),

                // Financials
                'subtotal' => $request->subtotal ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'discount_amount' => $request->discount_amount ?? 0,
                'shipping_charges' => $request->shipping_charges ?? 0,
                'grand_total' => $request->grand_total ?? 0,

                // Terms
                'payment_terms_id' => $request->payment_terms_id,
                'delivery_terms_id' => $request->delivery_terms_id,
                'shipping_method' => $request->shipping_method,
                'shipping_address' => $request->shipping_address,
            ]);

            foreach ($request->items as $index => $item) {
                $order->items()->create([
                    'line_number' => $index + 1,
                    'item_type' => $item['item_type'] ?? 'product',
                    'product_id' => $item['product_id'] ?? null,
                    'item_name_ar' => $item['item_name_ar'],
                    'item_name_en' => $item['item_name_en'] ?? '',
                    'ordered_quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_percent' => $item['tax_percent'] ?? 0,
                    // Generated columns handled by DB: pending_quantity, net_price, line_total, tax_total
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Order created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error creating order: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $order = PurchaseOrder::findOrFail($id);

        $validated = $request->validate([
            'po_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:po_date',
            'vendor_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => 'required|in:draft,pending_approval,approved,sent_to_vendor,partially_received,fully_received,invoiced,closed,cancelled',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name_ar' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $order->update([
                'po_date' => $request->po_date,
                'expected_delivery_date' => $request->expected_delivery_date,
                'vendor_id' => $request->vendor_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'priority' => $request->priority,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'discount_amount' => $request->discount_amount,
                'shipping_charges' => $request->shipping_charges,
                'grand_total' => $request->grand_total,
                'payment_terms_id' => $request->payment_terms_id,
                'delivery_terms_id' => $request->delivery_terms_id,
                'shipping_method' => $request->shipping_method,
                'shipping_address' => $request->shipping_address,
            ]);

            // Sync items: Delete old and re-create
            $order->items()->delete();

            foreach ($request->items as $index => $item) {
                $order->items()->create([
                    'line_number' => $index + 1,
                    'item_type' => $item['item_type'] ?? 'product',
                    'product_id' => $item['product_id'] ?? null,
                    'item_name_ar' => $item['item_name_ar'],
                    'item_name_en' => $item['item_name_en'] ?? '',
                    'ordered_quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_percent' => $item['tax_percent'] ?? 0,
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Order updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error updating order: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $order = PurchaseOrder::findOrFail($id);
            $order->delete(); // Soft delete

            return redirect()->back()->with('success', 'Purchase Order deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting order: '.$e->getMessage());
        }
    }
}
