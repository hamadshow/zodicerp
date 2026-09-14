<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\PayrollResult;

class PayrollResultController extends Controller
{
    public function show(PayrollResult $payrollResult)
    {
        return response()->json($payrollResult->load('period', 'employee', 'components'));
    }
}
