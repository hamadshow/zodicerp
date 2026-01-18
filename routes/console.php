<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Ad;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ads:disable-expired', function () {
    Ad::whereNotNull('expired_at')
        ->where('expired_at', '<=', now())
        ->where('status', 'published')
        ->update(['status' => 'expired']);
})->purpose('Disable expired ads');

Schedule::command('ads:disable-expired')->hourly();
