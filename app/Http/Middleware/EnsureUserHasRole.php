<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('login', [
                'country' => session('country_code', 'sa'),
                'lang' => session('locale', 'ar'),
            ]);
        }

        if (method_exists($user, 'hasRole')) {
            if (! $user->hasRole($role)) {
                abort(403);
            }
        } else {
            $userRole = $user->role ?? $role; // Default to required role if null
            if ($userRole !== $role) {
                abort(403);
            }
        }

        return $next($request);
    }
}
