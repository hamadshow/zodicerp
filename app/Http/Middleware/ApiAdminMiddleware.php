<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiAdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Checks authorization using the same logic as AdminMiddleware for system roles,
     * and User/Employee::hasPermission() for dot-notation permission strings.
     *
     * Usage: ->middleware('api.admin:users.delete')
     *        ->middleware('api.admin:accounting.post')
     */
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // System roles bypass all permission checks (matches AdminMiddleware behavior)
        $systemRoles = ['admin', 'superadmin', 'super_admin', 'owner', 'developer', 'programmer', 'technical_administrator'];

        if ($user instanceof \App\Models\User) {
            $role = strtolower($user->role ?? '');
            if (in_array($role, $systemRoles)) {
                return $next($request);
            }

            // For non-system users, check the permission string via hasPermission()
            // hasPermission() checks: 1) system role (already checked above), 2) JSON permissions on pivot roles
            if ($user->hasPermission($ability)) {
                return $next($request);
            }
        }

        if ($user instanceof \App\Models\Employee) {
            // Employees: check permission via hasPermission() which checks JSON permissions on pivot roles
            if ($user->hasPermission($ability)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }
}
