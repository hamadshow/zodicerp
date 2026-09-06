<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;

class CompanyContext
{
    public function id(): int
    {
        $companyId = Auth::user()?->company_id;

        if (! $companyId) {
            throw new \RuntimeException('A company context is required for this operation.');
        }

        return (int) $companyId;
    }
}