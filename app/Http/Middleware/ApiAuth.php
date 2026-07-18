<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class ApiAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // First try Sanctum's authentication (includes both token and SPA session auth)
        if (Auth::guard('sanctum')->check()) {
            Auth::shouldUse('sanctum');
            $request->setUserResolver(fn() => Auth::guard('sanctum')->user());
            return $next($request);
        }
        
        // Then try web guard (session-based)
        if ($request->hasSession() && Auth::guard('web')->check()) {
            Auth::shouldUse('web');
            $request->setUserResolver(fn() => Auth::guard('web')->user());
            return $next($request);
        }
        
        // Try other guards if available
        $guards = ['employee', 'supplier', 'customer'];
        foreach ($guards as $guard) {
            if ($request->hasSession() && Auth::guard($guard)->check()) {
                Auth::shouldUse($guard);
                $request->setUserResolver(fn() => Auth::guard($guard)->user());
                return $next($request);
            }
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        abort(401, 'Unauthenticated');
    }
}
