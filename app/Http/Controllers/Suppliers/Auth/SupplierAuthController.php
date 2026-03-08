<?php

namespace App\Http\Controllers\Suppliers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Currency;
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
        return Inertia::render('Suppliers/Auth/SupplierLogin');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::guard('supplier')->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended(route('supplier.dashboard'));
        }

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    public function showRegisterForm()
    {
        return Inertia::render('Suppliers/Auth/SupplierRegister');
    }

    public function register(Request $request)
    {
        $request->validate([
            'name_ar' => 'required|string|max:255',
            'primary_phone' => ['required', 'string', 'size:11', 'regex:/^[0-9]+$/'],
            'email' => 'required|string|email|max:255|unique:suppliers',
            'password' => 'required|confirmed|min:8',
        ]);

        // Auto-generate supplier code
        $latest = Supplier::latest('id')->first();
        if ($latest && preg_match('/^VEN-(\d+)$/', $latest->supplier_code, $matches)) {
            $nextId = intval($matches[1]) + 1;
        } else {
            $nextId = 10001;
        }
        $supplierCode = 'VEN-' . $nextId;

        $group = SupplierGroup::firstOrCreate(
            ['code' => 'GRP-DEFAULT'],
            ['name_ar' => 'Default Group', 'name_en' => 'Default Group', 'is_active' => true]
        );

        $currencyId = Currency::whereKey(1)->value('id');
        if (!$currencyId) {
            $currencyId = Currency::where('is_base', true)->value('id')
                ?: Currency::where('status', 'active')->value('id')
                ?: Currency::value('id');
        }

        if (!$currencyId) {
            $currencyId = Currency::query()->insertGetId([
                'id' => 1,
                'code' => 'EGP',
                'name' => 'Egyptian Pound',
                'symbol' => 'E£',
                'decimal_places' => 2,
                'format' => null,
                'is_base' => true,
                'status' => 'active',
                'created_by' => null,
                'updated_by' => null,
                'deleted_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $supplier = Supplier::create([
            'supplier_code' => $supplierCode,
            'name_ar' => $request->name_ar,
            'store_name_json' => $request->store_name_json,
            'primary_phone' => $request->primary_phone,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'supplier_group_id' => $group->id,
            'currency_id' => $currencyId,
            'is_active' => true,
            'is_vendor' => true, // Assuming new registrations are vendors
            'verification_status' => 'pending', // Default status
            'commission_rate' => 0.00,
            'credit_limit' => 0.00,
            'current_balance' => 0.00,
            'available_credit' => 0.00,
            'rating' => 0,
        ]);

        Auth::guard('supplier')->login($supplier);

        return redirect()->route('supplier.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::guard('supplier')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
