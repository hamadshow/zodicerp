<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

class EnsureProfessionCsrf extends ValidateCsrfToken
{
    public function handle($request, Closure $next)
    {
        if ($request->bearerToken()) {
            return $next($request);
        }

        return parent::handle($request, $next);
    }
}
