<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Client_Sales\SalesOrder;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = SalesOrder::query()
            ->with(['customer', 'currency', 'creator', 'details', 'warehouse'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($q) use ($search) {
                        $q->where('name_en', 'like', "%{$search}%")
                            ->orWhere('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $orders = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $customers = Customer::where('is_active', true)
            ->select('id', 'name_en', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();

        // Fetch addresses for all customers (can be optimized to fetch on demand)
        $customerAddresses = CustomerAddress::select('id', 'customer_id', 'address_name', 'city_id', 'is_default')
            ->with('city')
            ->get();

        return Inertia::render('Backend/05-Client_Sales/Sales_Orders', [
            'orders' => $orders,
            'customers' => $customers,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'customerAddresses' => $customerAddresses,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_date' => 'required|date',
            'delivery_date' => 'nullable|date|after_or_equal:order_date',
            'customer_id' => 'required|exists:customers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => 'required|in:draft,confirmed,processing,shipped,delivered,cancelled',
            'priority' => 'required|in:low,normal,high,urgent',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate number if not provided
            $number = 'SO-'.date('Ymd').'-'.rand(1000, 9999);

            $order = SalesOrder::create([
                'order_number' => $number,
                'order_date' => $request->order_date,
                'delivery_date' => $request->delivery_date,
                'customer_id' => $request->customer_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'priority' => $request->priority,
                'shipping_address_id' => $request->shipping_address_id,
                'warehouse_id' => $request->warehouse_id,
                'customer_notes' => $request->customer_notes,
                'internal_notes' => $request->internal_notes,
                'created_by' => Auth::id(),

                // Financials
                'subtotal' => $request->subtotal ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'discount_amount' => $request->discount_amount ?? 0,
                'shipping_cost' => $request->shipping_cost ?? 0,
                'total_amount' => $request->total_amount ?? 0,
            ]);

            foreach ($request->items as $item) {
                $order->details()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Sales Order created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error creating order: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $order = SalesOrder::findOrFail($id);

        $validated = $request->validate([
            'order_date' => 'required|date',
            'customer_id' => 'required|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.unit_id' => 'required|exists:item_units,id',
        ]);

        DB::beginTransaction();
        try {
            $order->update([
                'order_date' => $request->order_date,
                'delivery_date' => $request->delivery_date,
                'customer_id' => $request->customer_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'priority' => $request->priority,
                'shipping_address_id' => $request->shipping_address_id,
                'warehouse_id' => $request->warehouse_id,
                'customer_notes' => $request->customer_notes,
                'internal_notes' => $request->internal_notes,
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'discount_amount' => $request->discount_amount,
                'shipping_cost' => $request->shipping_cost,
                'total_amount' => $request->total_amount,
            ]);

            // Sync items: Delete old and re-create
            $order->details()->delete();

            foreach ($request->items as $item) {
                $order->details()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Sales Order updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error updating order: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $order = SalesOrder::findOrFail($id);
            $order->delete(); // Soft delete

            return redirect()->back()->with('success', 'Sales Order deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting order: '.$e->getMessage());
        }
    }
}
