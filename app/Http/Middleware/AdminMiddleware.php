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
        
        if (!$user) {
            // Check other guards just in case
            if (Auth::guard('customer')->check()) {
                $user = Auth::guard('customer')->user();
            } elseif (Auth::guard('supplier')->check()) {
                $user = Auth::guard('supplier')->user();
            }
        }

        if (!$user) {
            return redirect()->route('login', [
                'country' => session('country_code', 'sa'),
                'lang' => session('locale', 'ar')
            ]);
        }

        if (Auth::check() && $user instanceof \App\Models\User) {
            return $next($request);
        }

        $role = strtolower($user->role ?? '');

        if ($role !== 'admin') {
            $params = [
                'country' => session('country_code', 'sa'),
                'lang' => session('locale', 'ar')
            ];

            if ($role === 'customer' || Auth::guard('customer')->check()) {
                return redirect()->route('customer.dashboard', $params);
            } elseif ($role === 'supplier' || Auth::guard('supplier')->check()) {
                return redirect()->route('supplier.dashboard', $params);
            }

            abort(403, 'Unauthorized');
        }

        return $next($request);
    }
}
