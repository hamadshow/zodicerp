<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyScope
{
    protected array $allowedRouteNamesWhenNoCompany = [
        'company.register',
        'company.register.store',
        'logout',
        'profile.edit',
        'profile.update',
        'profile.destroy',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // تم تعطيل تقييد الوصول حسب الشركة
        return $next($request);
    }
}
