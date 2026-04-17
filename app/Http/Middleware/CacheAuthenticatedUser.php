<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CacheAuthenticatedUser
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Optimize authentication queries - cache the user for 5 minutes within the session
        if (Auth::check()) {
            $authUserId = Auth::id();
            $cacheKey = "user_auth_{$authUserId}";

            // Try to get user from cache first to avoid repeated DB queries
            try {
                Cache::remember($cacheKey, 300, function () {
                    return Auth::user();
                });
            } catch (\Throwable $e) {
                // If caching fails, continue normally
                // This prevents caching issues from breaking auth
            }
        }

        return $next($request);
    }
}
