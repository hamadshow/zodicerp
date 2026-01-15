<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Http\Requests\Purchases\Auth\LoginRequest;
use App\Http\Requests\Purchases\Auth\RegisterRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Suppliers/Suppliers');
    }

    public function create(): Response
    {
        return Inertia::render('Suppliers/Auth/Register');
    }

    public function store(RegisterRequest $request): RedirectResponse
    {
        $supplier = Supplier::create([
            'supplier_name' => $request->supplier_name,
            'company_name' => $request->company_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'status' => 'active',
        ]);

        return redirect()->route('supplier.login')->with('success', 'Registration successful! Please login.');
    }

    public function login(): Response
    {
        return Inertia::render('Suppliers/Auth/Login', [
            'status' => session('status'),
        ]);
    }

    public function authenticate(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('supplier.dashboard'));
    }

    public function dashboard(): Response
    {
        return Inertia::render('Suppliers/Dashboard');
    }
    
    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('supplier')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('supplier.login');
    }
}
