<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\TreasuryTransaction;
use Illuminate\Support\Facades\Cache;

class TreasuryCacheServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $clearCache = function () {
            Cache::forget('treasury_dashboard_data');
        };

        // Clear dashboard cache on any financial movement
        TreasuryTransaction::saved($clearCache);
        TreasuryTransaction::deleted($clearCache);
    }
}
