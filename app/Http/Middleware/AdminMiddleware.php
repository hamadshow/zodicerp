<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user) {
            // Check other guards just in case
            if (Auth::guard('customer')->check()) {
                $user = Auth::guard('customer')->user();
            } elseif (Auth::guard('supplier')->check()) {
                $user = Auth::guard('supplier')->user();
            }
        }

        if (! $user) {
            $country = $request->segment(1) ?: session('country_code', 'sa');
            $lang = $request->segment(2) ?: session('locale', 'ar');
            return redirect()->to("/{$country}/{$lang}/login");
        }

        if (Auth::check() && $user instanceof \App\Models\User) {
            // Also check role for safety, though previously it was allowed
            $role = strtolower($user->role ?? '');
            if (in_array($role, ['admin', 'superadmin'])) {
                return $next($request);
            }
        }

        $role = strtolower($user->role ?? '');

        if (! in_array($role, ['admin', 'superadmin'])) {
            $country = $request->segment(1) ?: session('country_code', 'sa');
            $lang = $request->segment(2) ?: session('locale', 'ar');

            if ($role === 'customer' || Auth::guard('customer')->check()) {
                return redirect()->to("/{$country}/{$lang}/customer/dashboard");
            } elseif ($role === 'supplier' || Auth::guard('supplier')->check()) {
                return redirect()->to("/{$country}/{$lang}/supplier/dashboard");
            }

            abort(403, 'Unauthorized');
        }

        return $next($request);
    }
}
