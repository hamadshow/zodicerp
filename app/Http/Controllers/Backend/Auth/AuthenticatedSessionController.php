<?php

namespace App\Http\Controllers\Backend\Auth;

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
        return Inertia::render('Backend/Auth/Login', [
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

        $request->session()->put('company_id', $user->company_id ?? null);

        $params = [
            'country' => session('country_code', 'sa'),
            'lang' => session('locale', config('app.locale', 'en')),
        ];

        $target = route('dashboard', $params);

        return redirect()->to($target);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $params = [
            'country' => $request->route('country') ?? session('country_code', 'sa'),
            'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'en')),
        ];

        Auth::guard('web')->logout();

        $request->session()->forget('company_id');
        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->to(route('home', $params));
    }
}
