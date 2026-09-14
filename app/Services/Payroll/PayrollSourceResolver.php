<?php

namespace App\Services\Payroll;

use App\Models\Deduction;
use App\Models\PayrollAdvance;
use App\Models\Reward;
use App\Models\TrafficViolation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class PayrollSourceResolver
{
    public function rewards(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return Reward::query()
            ->where('employee_id', $employeeId)
            ->whereBetween('award_date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['approved', 'delivered'])
            ->lockForUpdate()
            ->get();
    }

    public function deductions(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return Deduction::query()
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->where('status', 'Approved')
            ->lockForUpdate()
            ->get();
    }

    public function advances(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return PayrollAdvance::query()
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->where('status', 'Approved')
            ->lockForUpdate()
            ->get();
    }

    public function trafficViolations(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return TrafficViolation::query()
            ->where('employee_id', $employeeId)
            ->whereBetween('violation_date', [$start->startOfDay(), $end->endOfDay()])
            ->lockForUpdate()
            ->get();
    }
}
