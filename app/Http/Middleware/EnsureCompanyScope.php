<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $companyId = $user->company_id ?? null;

        if ($request->session()->get('company_id') !== $companyId) {
            $request->session()->put('company_id', $companyId);
        }

        if (!$companyId) {
            $routeName = $request->route()?->getName();
            if ($routeName && in_array($routeName, $this->allowedRouteNamesWhenNoCompany, true)) {
                return $next($request);
            }

            abort(403, 'Company not set for this user.');
        }

        return $next($request);
    }
}
