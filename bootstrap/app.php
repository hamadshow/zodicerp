<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            '_boost/*',
            'api/*',
        ]);

        $middleware->redirectTo(
            function (Request $request) {
                $params = [
                    'country' => session('country_code', 'sa'),
                    'lang' => session('locale', 'ar')
                ];
                return route('login', $params);
            }
        );

        $middleware->web(append: [
            \App\Http\Middleware\SetLocalization::class,
            \App\Http\Middleware\EnsureCompanyScope::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'supplier' => \App\Http\Middleware\SupplierMiddleware::class,
            'customer' => \App\Http\Middleware\CustomerMiddleware::class,
            'company.scope' => \App\Http\Middleware\EnsureCompanyScope::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

$app->usePublicPath(__DIR__.'/../public');

return $app;
