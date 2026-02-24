<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\CustomerAddress;
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
        // try to find a customer with the same email.
        $customer = $user instanceof \App\Models\Client_Sales\Customer 
            ? $user 
            : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();

        $addresses = [];
        if ($customer) {
            $addresses = CustomerAddress::where('customer_id', $customer->id)
                ->with(['country', 'city'])
                ->latest()
                ->get();
        }

        return Inertia::render('Home/User/Dashboard', [
            'addresses' => $addresses,
            'countries' => Country::where('status', 'active')->get(['id', 'name_en', 'name_ar', 'name']),
            'cities' => City::where('status', 'active')->get(['id', 'name', 'country_id']),
        ]);
    }
}
