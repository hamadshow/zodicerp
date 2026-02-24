<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();

        // Check if user is active after authentication
        if (!$user || $user->status !== 'active') {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->withErrors([
                'email' => 'Your account is inactive. Please contact administrator.',
            ])->onlyInput('email');
        }

        $params = [
            'country' => session('country_code', 'sa'),
            'lang' => session('locale', 'ar')
        ];

        $target = route('home', $params);

        if ($user) {
            $role = strtolower($user->role ?? '');
            if ($role === 'admin') {
                $target = route('admin.dashboard', $params);
            } elseif ($role === 'supplier') {
                $target = route('supplier.dashboard', $params);
            } elseif ($role === 'customer') {
                $target = route('customer.dashboard', $params);
            }
        }

        return redirect()->intended($target);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        $params = [
            'country' => session('country_code', 'sa'),
            'lang' => session('locale', 'ar')
        ];

        return redirect()->to(route('home', $params));
    }
}
