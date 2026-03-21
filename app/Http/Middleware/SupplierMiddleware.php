<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SupplierMiddleware
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
            return redirect()->route('login', [
                'country' => session('country_code', 'sa'),
                'lang' => session('locale', 'ar'),
            ]);
        }

        $role = strtolower($user->role ?? '');

        if ($role !== 'supplier') {
            $params = [
                'country' => session('country_code', 'sa'),
                'lang' => session('locale', 'ar'),
            ];

            if ($role === 'admin') {
                return redirect()->route('admin.dashboard', $params);
            } elseif ($role === 'customer') {
                return redirect()->route('customer.dashboard', $params);
            }

            abort(403, 'Unauthorized');
        }

        return $next($request);
    }
}
