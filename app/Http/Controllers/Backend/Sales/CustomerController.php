<?php

namespace App\Http\Controllers\Backend\Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Country;
use App\Models\City;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(): Response
    {
        $user = Auth::guard('customer')->user() ?: Auth::user();
        
        // Find the customer record. If the logged in user is not a Customer model, 
        // try to find a customer with the same email or phone.
        $customer = $user instanceof \App\Models\Client_Sales\Customer 
            ? $user 
            : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();

        // If no customer record found, try to find by mobile/phone if email didn't work
        if (!$customer && $user) {
            $phone = $user->phone ?? $user->mobile;
            if ($phone) {
                $customer = \App\Models\Client_Sales\Customer::where('mobile', $phone)
                    ->orWhere('primary_phone', $phone)
                    ->first();
            }
        }

        $addresses = [];
        $orders = [];
        
        if ($customer) {
            $addresses = CustomerAddress::where('customer_id', $customer->id)
                ->with(['country', 'city'])
                ->latest()
                ->get();
            
            $rawOrders = SalesInvoice::where('customer_id', $customer->id)
                ->with(['details.product'])
                ->latest()
                ->get();

            $orders = $rawOrders->map(function ($invoice) {
                    return [
                        'id' => $invoice->id,
                        'number' => $invoice->invoice_number,
                        'date' => $invoice->invoice_date ? $invoice->invoice_date->toDateString() : null,
                        'total' => (float) $invoice->total_amount,
                        'status' => $invoice->payment_status,
                        'items_count' => $invoice->details->count(),
                    ];
                });
        }

        return Inertia::render('Home/User/Dashboard', [
            'addresses' => $addresses,
            'orders' => $orders,
            'countries' => Country::where('status', 'active')->get(['id', 'name_en', 'name_ar', 'name']),
            'cities' => City::where('status', 'active')->get(['id', 'name', 'country_id']),
        ]);
    }
}
