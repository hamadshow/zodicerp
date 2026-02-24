<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Vendor_Purchases\SupplierGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SupplierAuthController extends Controller
{
    public function showLoginForm()
    {
        return Inertia::render('Auth/SupplierLogin');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::guard('supplier')->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended('/suppliers/dashboard');
        }

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    public function showRegisterForm()
    {
        return Inertia::render('Auth/SupplierRegister');
    }

    public function register(Request $request)
    {
        $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:suppliers',
            'password' => 'required|confirmed|min:8',
            'supplier_code' => 'required|string|unique:suppliers',
        ]);

        $group = SupplierGroup::firstOrCreate(
            ['code' => 'GRP-DEFAULT'],
            ['name_ar' => 'Default Group', 'name_en' => 'Default Group', 'is_active' => true]
        );

        $supplier = Supplier::create([
            'name_ar' => $request->name_ar,
            'name_en' => $request->name_en,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'supplier_code' => $request->supplier_code,
            'supplier_group_id' => $group->id,
            'is_active' => true,
        ]);

        Auth::guard('supplier')->login($supplier);

        return redirect('/suppliers/dashboard');
    }

    public function logout(Request $request)
    {
        Auth::guard('supplier')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/suppliers');
    }
}
