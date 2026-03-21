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
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $companyId = $user->company_id ?? null;
        if ($companyId) {
            $companyId = (int) $companyId;
            $exists = DB::table('company')->where('id', $companyId)->exists();
            if (! $exists) {
                $companyId = null;
            }
        }

        if (! $companyId) {
            $fallbackCompanyId = DB::table('company')->orderBy('id')->value('id');
            if ($fallbackCompanyId) {
                $user->company_id = (int) $fallbackCompanyId;
                $user->saveQuietly();
                $companyId = (int) $fallbackCompanyId;
            }
        }

        if ($request->session()->get('company_id') !== $companyId) {
            $request->session()->put('company_id', $companyId);
        }

        if (! $companyId) {
            $routeName = $request->route()?->getName();
            if ($routeName && in_array($routeName, $this->allowedRouteNamesWhenNoCompany, true)) {
                return $next($request);
            }

            $params = [
                'country' => $request->route('country') ?? session('country_code', 'sa'),
                'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
            ];

            return redirect()->route('company.register', $params);
        }

        return $next($request);
    }
}
