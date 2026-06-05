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
        $user = Auth::user() ?: Auth::guard('employee')->user();

        if (! $user) {
            // Check other guards
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

        // Allow System Users (User model with admin role)
        if ($user instanceof \App\Models\User) {
            $role = strtolower($user->role ?? '');
            $systemRoles = ['admin', 'superadmin', 'super_admin', 'owner', 'developer', 'programmer', 'technical_administrator'];
            if (in_array($role, $systemRoles)) {
                return $next($request);
            }
        }

        // Allow Employees if they have any backend permission
        if ($user instanceof \App\Models\Employee) {
            // If they have any permission defined in roles, allow them to access admin area
            // Specific page access will be handled by Gates/Policies
            if ($user->roles()->exists()) {
                return $next($request);
            }
        }

        $role = strtolower($user->role ?? '');

        if ($role === 'customer' || Auth::guard('customer')->check()) {
            $country = $request->segment(1) ?: session('country_code', 'sa');
            $lang = $request->segment(2) ?: session('locale', 'ar');
            return redirect()->to("/{$country}/{$lang}/customer/dashboard");
        } elseif ($role === 'supplier' || Auth::guard('supplier')->check()) {
            $country = $request->segment(1) ?: session('country_code', 'sa');
            $lang = $request->segment(2) ?: session('locale', 'ar');
            return redirect()->to("/{$country}/{$lang}/supplier/dashboard");
        }

        abort(403, 'Unauthorized');
    }
}
