<?php

namespace App\Services\Payroll;

use App\Models\Attendance;
use App\Models\Deduction;
use App\Models\PayrollAdvance;
use App\Models\Reward;
use App\Models\TrafficViolation;
use App\Models\Vacation;
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
            ->whereRaw('LOWER(status) = ?', ['approved'])
            ->lockForUpdate()
            ->get();
    }

    public function advances(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return PayrollAdvance::query()
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->whereRaw('LOWER(status) = ?', ['approved'])
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

    /**
     * Attendance aggregates for the period (overtime hours, absent days,
     * late incidents). Company scoping is inherited via the attendance
     * rows' company_id filter.
     */
    public function attendanceSummary(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = Attendance::query()
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->lockForUpdate()
            ->get(['status', 'overtime']);

        return [
            'absent_days' => (int) $rows->where('status', 'absent')->count(),
            'late_incidents' => (int) $rows->where('status', 'late')->count(),
            'overtime_hours' => (float) $rows->sum('overtime'),
        ];
    }

    /**
     * Approved unpaid-leave days overlapping the period.
     */
    public function unpaidLeaveDays(int $employeeId, CarbonImmutable $start, CarbonImmutable $end): int
    {
        return (int) Vacation::query()
            ->where('employee_id', $employeeId)
            ->where('leave_type', 'unpaid')
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->sum('total_days');
    }
}
