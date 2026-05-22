<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\BankPayment;
use App\Models\BankReceipt;
use App\Models\CashPayment;
use App\Models\CashReceipt;
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
        BankReceipt::saved($clearCache);
        BankReceipt::deleted($clearCache);
        
        BankPayment::saved($clearCache);
        BankPayment::deleted($clearCache);
        
        CashReceipt::saved($clearCache);
        CashReceipt::deleted($clearCache);
        
        CashPayment::saved($clearCache);
        CashPayment::deleted($clearCache);
    }
}
