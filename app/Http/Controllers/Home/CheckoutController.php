<?php

namespace App\Http\Controllers\Home;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Client_Sales\SalesInvoiceDetail;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Products;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\ItemUnit;
use App\Models\Categories;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function store(Request $request)
    {
        Log::info("Checkout: Start processing order submission.");
        
        try {
            $validated = $request->validate([
                'full_name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'phone' => 'required|string|max:20',
                'address' => 'required|string',
                'city' => 'required|string|max:100',
                'country' => 'required|string|max:100',
                'payment_method' => 'required|string|in:cod,card',
            ]);
            Log::info("Checkout: Validation passed.");
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error("Checkout: Validation failed.", ['errors' => $e->errors()]);
            throw $e;
        }

        $cart = $request->session()->get('cart', []);
        if (empty($cart)) {
            Log::warning("Checkout: Cart is empty.");
            return back()->withErrors(['cart' => 'Your cart is empty.']);
        }

        $user = Auth::guard('customer')->user() ?: Auth::user();
        $customer = null;

        if ($user) {
            $customer = $user instanceof \App\Models\Client_Sales\Customer 
                ? $user 
                : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();
            Log::info("Checkout: User found.", ['user_id' => $user->id, 'customer_found' => !!$customer]);
        }

        if (!$customer) {
            Log::info("Checkout: Customer not found, creating or finding by email.");
            $customerGroup = \App\Models\Client_Sales\CustomerGroup::where('is_active', true)->first() 
                ?: \App\Models\Client_Sales\CustomerGroup::first();
            
            if (!$customerGroup) {
                // Create a default group if none exists
                $customerGroup = \App\Models\Client_Sales\CustomerGroup::create([
                    'code' => 'DEF-GRP',
                    'name_en' => 'Default Group',
                    'name_ar' => 'المجموعة الافتراضية',
                    'is_active' => true
                ]);
            }
            
            $country = \App\Models\Country::where('name_en', $validated['country'])
                ->orWhere('name_ar', $validated['country'])
                ->first();
            $city = \App\Models\City::where('name', $validated['city'])
                ->first();

            $customer = Customer::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'customer_code' => 'CUS-' . strtoupper(uniqid()),
                    'name_en' => $validated['full_name'],
                    'name_ar' => $validated['full_name'],
                    'mobile' => $validated['phone'],
                    'customer_group_id' => $customerGroup->id ?? 1,
                    'country_id' => $country->id ?? null,
                    'city_id' => $city->id ?? null,
                    'is_active' => true,
                ]
            );
            Log::info("Checkout: Customer ensured.", ['customer_id' => $customer->id]);
        }

        $shippingAddress = CustomerAddress::where('customer_id', $customer->id)
            ->where('is_default', true)
            ->first();

        if (!$shippingAddress) {
            Log::info("Checkout: Shipping address not found, creating.");
            $country = \App\Models\Country::where('name_en', $validated['country'])
                ->orWhere('name_ar', $validated['country'])
                ->first();
            $city = \App\Models\City::where('name', $validated['city'])
                ->first();

            $shippingAddress = CustomerAddress::create([
                'customer_id' => $customer->id,
                'address_type' => 'shipping',
                'address_name' => 'Default Shipping',
                'phone' => $validated['phone'],
                'street' => $validated['address'],
                'country_id' => $country->id ?? null,
                'city_id' => $city->id ?? null,
                'is_default' => true,
                'is_default_shipping' => true,
            ]);
            Log::info("Checkout: Shipping address created.", ['address_id' => $shippingAddress->id]);
        }

        DB::beginTransaction();
        try {
            Log::info("Checkout: DB Transaction started.");
            $currency = Currency::where('code', 'EGP')->first() ?: Currency::first();
            $warehouse = Warehouses::first();
            $defaultUnit = ItemUnit::first();

            $subtotal = 0;
            $itemsData = [];

            foreach ($cart as $itemKey => $cartItem) {
                $product = Products::find($cartItem['product_id']);
                if (!$product) {
                    Log::warning("Checkout: Product not found.", ['product_id' => $cartItem['product_id']]);
                    continue;
                }

                $qty = (int) ($cartItem['quantity'] ?? 1);
                $price = (float) ($product->sale_price ?? $product->price ?? 0);
                $subtotal += $price * $qty;

                $itemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_id' => $product->unit_id ?: ($defaultUnit->id ?? 1),
                    'unit_price' => $price,
                    'attribute_data' => $cartItem['variants'] ?? null,
                ];
            }

            $tax = 0;
            $shipping = 0;
            $total = $subtotal + $tax + $shipping;

            Log::info("Checkout: Creating SalesInvoice.", [
                'customer_id' => $customer->id,
                'subtotal' => $subtotal,
                'total' => $total,
                'items_count' => count($itemsData)
            ]);
            
            $invoiceData = [
                'invoice_number' => 'SINV-' . date('Ymd') . '-' . strtoupper(uniqid()),
                'customer_id' => $customer->id,
                'currency_id' => $currency->id ?? 1,
                'exchange_rate' => $currency->exchange_rate ?? 1,
                'invoice_date' => now(),
                'due_date' => now()->addDays(7),
                'posting_date' => now(),
                'warehouse_id' => $warehouse->id ?? 1,
                'subtotal' => $subtotal,
                'tax_amount' => $tax,
                'shipping_cost' => $shipping,
                'total_amount' => $total,
                'payment_status' => 'unpaid',
                'invoice_type' => 'standard',
                'shipping_address_id' => $shippingAddress->id,
                'created_by' => Auth::id(),
            ];

            Log::debug("Checkout: Invoice data prepared.", $invoiceData);

            $invoice = SalesInvoice::create($invoiceData);

            Log::info("Checkout: SalesInvoice created successfully.", ['invoice_id' => $invoice->id, 'invoice_number' => $invoice->invoice_number]);

            foreach ($itemsData as $index => $item) {
                Log::debug("Checkout: Creating detail for item $index.", $item);
                SalesInvoiceDetail::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $warehouse->id ?? 1,
                    'quantity' => $item['quantity'],
                    'delivered_quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'base_line_total' => $item['unit_price'] * $item['quantity'] * ($currency->exchange_rate ?? 1),
                    'attribute_data' => $item['attribute_data'],
                ]);
            }

            DB::commit();
            Log::info("Checkout: DB Transaction committed successfully.", ['invoice_number' => $invoice->invoice_number]);
            
            // Clear cart
            $request->session()->forget('cart');
            $request->session()->forget('cart_version');
            Log::info("Checkout: Cart cleared, redirecting to success.");

            return redirect()->route('checkout.success', ['invoice' => $invoice->invoice_number]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Checkout: Transaction failed.", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors(['error' => 'Failed to place order: ' . $e->getMessage()]);
        }
    }

    public function success(Request $request)
    {
        $invoiceNumber = $request->query('invoice');
        
            Log::debug("Checkout: success method called with invoice: " . ($invoiceNumber ?? 'null'));
        
        if (!$invoiceNumber) {
            Log::error("OrderSuccess: No invoice number provided.");
            return redirect()->route('frontend');
        }

        $invoice = SalesInvoice::where('invoice_number', $invoiceNumber)
            ->with(['customer', 'details.product'])
            ->first();

        if (!$invoice) {
            Log::error("OrderSuccess: Invoice not found: " . $invoiceNumber);
            return redirect()->route('frontend');
        }

        Log::debug("OrderSuccess: Invoice found.", ['invoice_id' => $invoice->id]);

        try {
            $orderData = [
                'id' => $invoice->id,
                'number' => $invoice->invoice_number,
                'date' => $invoice->invoice_date ? $invoice->invoice_date->toDateString() : now()->toDateString(),
                'total' => (float) $invoice->total_amount,
                'customer_name' => optional($invoice->customer)->name_ar ?? optional($invoice->customer)->name_en ?? 'Customer',
                'email' => optional($invoice->customer)->email ?? '',
                'items' => $invoice->details->map(function ($detail) {
                    return [
                        'name' => optional($detail->product)->name ?? 'Product',
                        'qty' => (float) $detail->quantity,
                        'price' => (float) $detail->unit_price,
                        'total' => (float) $detail->line_total,
                    ];
                }),
            ];
            
            Log::debug("OrderSuccess: Rendering with data.", $orderData);

            $categories = Categories::where(function ($query) {
                $query->whereNull('parent_id')->orWhere('parent_id', 0);
            })
                ->where('status', 'active')
                ->with('children')
                ->orderBy('order')
                ->orderBy('name')
                ->get();

            return Inertia::render('Home/Checkout/OrderSuccess', [
                'order' => $orderData,
                'categories' => $categories
            ]);
        } catch (\Exception $e) {
            Log::error("OrderSuccess Rendering Error: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->route('frontend')->with('error', 'Error displaying order success page.');
        }
    }
}
