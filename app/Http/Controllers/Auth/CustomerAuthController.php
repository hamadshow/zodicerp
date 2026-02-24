<?php

namespace App\Http\Controllers\Auth;

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
        return Inertia::render('Auth/CustomerLogin');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::guard('customer')->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended('/customer/dashboard');
        }

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    public function showRegisterForm()
    {
        return Inertia::render('Auth/CustomerRegister');
    }

    public function register(Request $request)
    {
        $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:customers',
            'password' => 'required|confirmed|min:8',
            'customer_code' => 'required|string|unique:customers',
        ]);

        $group = CustomerGroup::firstOrCreate(
            ['code' => 'GRP-DEFAULT'],
            ['name_ar' => 'Default Group', 'name_en' => 'Default Group', 'is_active' => true]
        );

        $customer = Customer::create([
            'name_ar' => $request->name_ar,
            'name_en' => $request->name_en,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'customer_code' => $request->customer_code,
            'customer_group_id' => $group->id,
            'is_active' => true,
        ]);

        Auth::guard('customer')->login($customer);

        return redirect('/customer/dashboard');
    }

    public function logout(Request $request)
    {
        Auth::guard('customer')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
