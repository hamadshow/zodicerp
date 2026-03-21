<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;

class CustomerAddressController extends Controller
{
    private function getCustomer()
    {
        $user = Auth::guard('customer')->user() ?: Auth::user();
        if (! $user) {
            return null;
        }

        return $user instanceof \App\Models\Client_Sales\Customer
            ? $user
            : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'address_name' => 'required|string|max:255',
            'address_type' => 'required|in:billing,shipping,home,work,other',
            'country_id' => 'nullable|exists:countries,id',
            'city_id' => 'nullable|exists:cities,id',
            'district' => 'nullable|string|max:255',
            'street' => 'nullable|string|max:255',
            'building_number' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
            'is_default' => 'boolean',
            'is_default_billing' => 'boolean',
            'is_default_shipping' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $customer = $this->getCustomer();
        if (! $customer) {
            return Redirect::back()->withErrors(['error' => 'Customer profile not found.']);
        }

        if ($validated['is_default'] ?? false) {
            CustomerAddress::where('customer_id', $customer->id)->update(['is_default' => false]);
        }
        if ($validated['is_default_billing'] ?? false) {
            CustomerAddress::where('customer_id', $customer->id)->update(['is_default_billing' => false]);
        }
        if ($validated['is_default_shipping'] ?? false) {
            CustomerAddress::where('customer_id', $customer->id)->update(['is_default_shipping' => false]);
        }

        CustomerAddress::create(array_merge($validated, [
            'customer_id' => $customer->id,
        ]));

        return Redirect::back()->with('success', 'Address added successfully.');
    }

    public function update(Request $request, CustomerAddress $address)
    {
        $customer = $this->getCustomer();
        if (! $customer || $address->customer_id !== $customer->id) {
            abort(403);
        }

        $validated = $request->validate([
            'address_name' => 'required|string|max:255',
            'address_type' => 'required|in:billing,shipping,home,work,other',
            'country_id' => 'nullable|exists:countries,id',
            'city_id' => 'nullable|exists:cities,id',
            'district' => 'nullable|string|max:255',
            'street' => 'nullable|string|max:255',
            'building_number' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
            'is_default' => 'boolean',
            'is_default_billing' => 'boolean',
            'is_default_shipping' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        if ($validated['is_default'] ?? false) {
            CustomerAddress::where('customer_id', $customer->id)->where('id', '!=', $address->id)->update(['is_default' => false]);
        }
        if ($validated['is_default_billing'] ?? false) {
            CustomerAddress::where('customer_id', $customer->id)->where('id', '!=', $address->id)->update(['is_default_billing' => false]);
        }
        if ($validated['is_default_shipping'] ?? false) {
            CustomerAddress::where('customer_id', $customer->id)->where('id', '!=', $address->id)->update(['is_default_shipping' => false]);
        }

        $address->update($validated);

        return Redirect::back()->with('success', 'Address updated successfully.');
    }

    public function destroy(CustomerAddress $address)
    {
        $customer = $this->getCustomer();

        if (! $customer || $address->customer_id !== $customer->id) {
            abort(403);
        }

        $address->delete();

        return Redirect::back()->with('success', 'Address deleted successfully.');
    }
}
