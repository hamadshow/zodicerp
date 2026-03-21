<?php

namespace App\Http\Controllers\Home\Auth;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerAuthController extends Controller
{
    public function showLoginForm()
    {
        request()->session()->forget('company_id');

        return Inertia::render('Home/Auth/CustomerLogin');
    }

    public function login(Request $request)
    {
        $request->session()->forget('company_id');

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::guard('customer')->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended(route('home'));
        }

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    public function showRegisterForm()
    {
        return Inertia::render('Home/Auth/CustomerRegister');
    }

    public function register(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:customers',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|confirmed|min:6',
            'terms' => 'accepted',
        ]);

        $group = CustomerGroup::firstOrCreate(
            ['code' => 'GRP-DEFAULT'],
            ['name_ar' => 'Default Group', 'name_en' => 'Default Group', 'is_active' => true]
        );

        // Generate a customer code
        $latestCustomer = Customer::latest('id')->first();
        $nextId = $latestCustomer ? $latestCustomer->id + 1 : 1;
        $customerCode = 'CUST-'.str_pad($nextId, 6, '0', STR_PAD_LEFT);

        // Combine names
        $fullName = $request->first_name.' '.$request->last_name;

        $customer = Customer::create([
            'name_ar' => $fullName,
            'name_en' => $fullName,
            'email' => $request->email,
            'mobile' => $request->phone,
            'password' => Hash::make($request->password),
            'customer_code' => $customerCode,
            'customer_group_id' => $group->id,
            'is_active' => true,
            'registration_date' => now(),
        ]);

        Auth::guard('customer')->login($customer);

        return redirect()->route('home');
    }

    public function logout(Request $request)
    {
        $params = [
            'country' => $request->route('country') ?? session('country_code', 'sa'),
            'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'en')),
        ];

        Auth::guard('customer')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home', $params);
    }
}
