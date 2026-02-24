<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Client_Sales\SalesInvoiceDetail;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Products;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\ItemUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'address' => 'required|string',
            'city' => 'required|string|max:100',
            'country' => 'required|string|max:100',
            'payment_method' => 'required|string|in:cod,card',
        ]);

        $cart = $request->session()->get('cart', []);
        if (empty($cart)) {
            return back()->withErrors(['cart' => 'Your cart is empty.']);
        }

        $user = Auth::guard('customer')->user() ?: Auth::user();
        $customer = null;

        if ($user) {
            $customer = $user instanceof \App\Models\Client_Sales\Customer 
                ? $user 
                : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();
        }

        // If no customer found, we might want to create one or handle as guest
        // For now, let's assume we need a customer. 
        // If not found, find or create by email.
        if (!$customer) {
            $customerGroup = \App\Models\Client_Sales\CustomerGroup::first();
            $customer = Customer::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'customer_code' => 'CUS-' . strtoupper(uniqid()),
                    'name_en' => $validated['full_name'],
                    'name_ar' => $validated['full_name'], // Set name_ar as name_en for now
                    'mobile' => $validated['phone'],
                    'customer_group_id' => $customerGroup->id ?? 1,
                    'is_active' => true,
                ]
            );
        }

        // Handle shipping address
        $shippingAddress = CustomerAddress::where('customer_id', $customer->id)
            ->where('is_default', true)
            ->first();

        if (!$shippingAddress) {
            $shippingAddress = CustomerAddress::create([
                'customer_id' => $customer->id,
                'address_type' => 'shipping',
                'address_name' => 'Default Shipping',
                'phone' => $validated['phone'],
                'street' => $validated['address'],
                'is_default' => true,
                'is_default_shipping' => true,
            ]);
        }

        DB::beginTransaction();
        try {
            $currency = Currency::where('code', 'EGP')->first() ?: Currency::first();
            $warehouse = Warehouses::first();
            $defaultUnit = ItemUnit::first();

            $subtotal = 0;
            $itemsData = [];

            foreach ($cart as $itemKey => $cartItem) {
                $product = Products::find($cartItem['product_id']);
                if (!$product) continue;

                $qty = (int) ($cartItem['quantity'] ?? 1);
                $price = (float) ($product->sale_price ?? $product->price ?? 0);
                $lineTotal = $price * $qty;
                $subtotal += $lineTotal;

                $itemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_id' => $product->unit_id ?: ($defaultUnit->id ?? 1),
                    'unit_price' => $price,
                    'line_total' => $lineTotal,
                    'attribute_data' => $cartItem['variants'] ?? null,
                ];
            }

            $tax = 0;
            $shipping = 0;
            $total = $subtotal + $tax + $shipping;

            $invoice = SalesInvoice::create([
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
            ]);

            foreach ($itemsData as $item) {
                SalesInvoiceDetail::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $warehouse->id ?? 1,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'base_line_total' => $item['line_total'] * ($currency->exchange_rate ?? 1),
                    'attribute_data' => $item['attribute_data'],
                ]);
            }

            DB::commit();
            
            // Clear cart
            $request->session()->forget('cart');
            $request->session()->forget('cart_version');

            return redirect()->route('home')->with('success', 'Order placed successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to place order: ' . $e->getMessage()]);
        }
    }
}
