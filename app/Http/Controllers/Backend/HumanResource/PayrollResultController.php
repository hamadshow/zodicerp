<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\PayrollResult;
use App\Services\CompanyContext;

class PayrollResultController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function show(PayrollResult $payrollResult)
    {
        abort_unless((int) $payrollResult->company_id === $this->companyContext->id(), 404);

        return response()->json($payrollResult->load('period', 'employee', 'components'));
    }
}
