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

        $target = route('frontend', absolute: false);

        if ($user) {
            if (method_exists($user, 'hasRole')) {
                if ($user->hasRole('admin')) {
                    $target = route('admin', absolute: false);
                } elseif ($user->hasRole('supplier')) {
                    $target = route('suppliers', absolute: false);
                } elseif ($user->hasRole('customer')) {
                    $target = route('customers.dashboard', absolute: false);
                }
            } else {
                $role = $user->role ?? null;
                if ($role === 'admin') {
                    $target = route('admin', absolute: false);
                } elseif ($role === 'supplier') {
                    $target = route('suppliers', absolute: false);
                } elseif ($role === 'customer') {
                    $target = route('customers.dashboard', absolute: false);
                }
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

        return redirect('/login');
    }
}
