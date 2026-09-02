<?php

namespace App\Traits;

use App\Services\Accounting\FiscalPeriodService;

/**
 * Ensures fiscal period validation before creating journal entries.
 * Used by services and controllers that create JournalEntry records directly.
 */
trait EnsuresFiscalPeriod
{
    /**
     * Validate that the given date falls within an open fiscal period.
     * Throws \Exception if the period is closed or no open period exists.
     */
    protected function ensureOpenFiscalPeriod(string $date): void
    {
        app(FiscalPeriodService::class)->validatePostingDate($date);
    }
}
