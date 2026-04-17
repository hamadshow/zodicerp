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
            $country = $request->segment(1) ?: session('country_code', 'sa');
            $lang = $request->segment(2) ?: session('locale', 'ar');
            return redirect()->to("/{$country}/{$lang}/login");
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
