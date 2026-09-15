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
use App\Services\ProductPriceResolver;
use App\Services\ProductSellingGuard;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->where('unit_type', 1)->get();
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
            'status' => ['required', Rule::in(SalesOrder::statuses())],
            'priority' => 'required|in:low,normal,high,urgent',
            'warehouse_id' => 'required|exists:warehouses,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
        ]);

            DB::beginTransaction();
        try {
            $priceResolver = new ProductPriceResolver();
            $PRICE_SCALE = 4;
            $TOTAL_SCALE = 6;

            $customer = Customer::findOrFail($request->customer_id);
            $transactionDate = Carbon::parse($request->order_date);

            $number = 'SO-'.date('Ymd').'-'.rand(1000, 9999);

            $subtotal = '0.000000';
            $lineDetails = [];

            foreach ($request->items as $item) {
                ProductSellingGuard::assertSellable($item['product_id']);

                $product = Products::findOrFail($item['product_id']);

                $resolved = $priceResolver->resolve([
                    'product' => $product,
                    'customer' => $customer,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'transaction_date' => $transactionDate,
                ]);

                $finalUnitPrice = $resolved['final_price'] ?? '0.0000';
                $discountPct = $resolved['discount_percentage'] ?? '0.00';
                $discountAmt = $resolved['discount_amount'] ?? '0.00';

                $qtyStr = bcadd((string) $item['quantity'], '0', $TOTAL_SCALE);
                $unitPriceStr = bcadd((string) $finalUnitPrice, '0', $PRICE_SCALE);

                $lineSubtotal = bcmul($unitPriceStr, $qtyStr, $TOTAL_SCALE);
                $subtotal = bcadd($subtotal, $lineSubtotal, $TOTAL_SCALE);

                $lineDetails[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $unitPriceStr,
                    'discount_percentage' => bcadd((string) $discountPct, '0', 2),
                    'discount_amount' => bcadd((string) $discountAmt, '0', 2),
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            $headerTax = bcadd((string) ($request->tax_amount ?? '0'), '0', $TOTAL_SCALE);
            $headerDiscount = bcadd((string) ($request->discount_amount ?? '0'), '0', $TOTAL_SCALE);
            $shippingCost = bcadd((string) ($request->shipping_cost ?? '0'), '0', $TOTAL_SCALE);

            $totalAmount = bcadd($subtotal, $headerTax, $TOTAL_SCALE);
            $totalAmount = bcsub($totalAmount, $headerDiscount, $TOTAL_SCALE);
            $totalAmount = bcadd($totalAmount, $shippingCost, $TOTAL_SCALE);

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
                'subtotal' => bcadd($subtotal, '0', $PRICE_SCALE),
                'tax_amount' => bcadd($headerTax, '0', $PRICE_SCALE),
                'discount_amount' => bcadd($headerDiscount, '0', $PRICE_SCALE),
                'shipping_cost' => bcadd($shippingCost, '0', $PRICE_SCALE),
                'total_amount' => bcadd($totalAmount, '0', $PRICE_SCALE),
            ]);

            foreach ($lineDetails as $detail) {
                $order->details()->create($detail);
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
            'currency_id' => 'required|exists:currencies,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'status' => ['required', Rule::in(SalesOrder::statuses())],
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:item_units,id',
        ]);

        if (! $order->canTransitionTo($validated['status'])) {
            return redirect()->back()->withErrors([
                'status' => "Cannot transition sales order from {$order->status} to {$validated['status']}.",
            ]);
        }

        DB::beginTransaction();
        try {
            $priceResolver = new ProductPriceResolver();
            $customer = Customer::findOrFail($validated['customer_id']);
            $transactionDate = Carbon::parse($validated['order_date']);
            $processedItems = [];
            foreach ($validated['items'] as $item) {
                ProductSellingGuard::assertSellable((int) $item['product_id']);
                $product = Products::findOrFail((int) $item['product_id']);
                $resolved = $priceResolver->resolve([
                    'product' => $product,
                    'customer' => $customer,
                    'quantity' => (string) $item['quantity'],
                    'unit_id' => (int) $item['unit_id'],
                    'transaction_date' => $transactionDate,
                ]);
                if ($resolved['final_price'] === null) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ["No selling price could be resolved for {$product->name}."],
                    ]);
                }
                $processedItems[] = [
                    ...$item,
                    'unit_price' => $resolved['final_price'],
                    'discount_percentage' => $resolved['discount_percentage'] ?? 0,
                    'discount_amount' => $resolved['discount_amount'] ?? 0,
                ];
            }

            $subtotal = '0.000000';
            $lineDiscount = '0.000000';
            $lineTax = '0.000000';
            foreach ($processedItems as $item) {
                $subtotal = bcadd($subtotal, bcmul((string) $item['quantity'], (string) $item['unit_price'], 6), 6);
                $lineDiscount = bcadd($lineDiscount, (string) ($item['discount_amount'] ?? '0'), 6);
                $lineTax = bcadd($lineTax, (string) ($item['tax_amount'] ?? '0'), 6);
            }
            $shippingCost = bcadd((string) ($request->shipping_cost ?? '0'), '0', 6);
            $totalAmount = bcadd(bcsub(bcadd($subtotal, $lineTax, 6), $lineDiscount, 6), $shippingCost, 6);

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
                'subtotal' => $subtotal,
                'tax_amount' => $lineTax,
                'discount_amount' => $lineDiscount,
                'shipping_cost' => $shippingCost,
                'total_amount' => $totalAmount,
            ]);

            // Sync items: Delete old and re-create
            $order->details()->delete();

            foreach ($processedItems as $item) {
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
