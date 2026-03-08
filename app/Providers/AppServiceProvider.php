<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        $this->loadMigrationsFrom([
            database_path('migrations/Assets'),
            database_path('migrations/Budget'),
            database_path('migrations/Client_Sales'),
            database_path('migrations/InvestingStack'),
            database_path('migrations/Taxes'),
            database_path('migrations/Tasks'),
            database_path('migrations/Vendor_Purchases'),
        ]);
    }
}
