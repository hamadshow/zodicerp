<?php

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollResult;
use App\Models\PayrollResultComponent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollCalculationService
{
    public function __construct(private readonly PayrollSourceResolver $sources)
    {
    }

    public function calculate(PayrollPeriod|int $period, int $employeeId, bool $recalculate = false): PayrollResult
    {
        return DB::transaction(function () use ($period, $employeeId, $recalculate): PayrollResult {
            $periodId = $period instanceof PayrollPeriod ? $period->getKey() : $period;
            $lockedPeriod = PayrollPeriod::query()->lockForUpdate()->findOrFail($periodId);

            $employee = Employee::query()->lockForUpdate()->findOrFail($employeeId);
            $result = PayrollResult::query()
                ->where('payroll_period_id', $lockedPeriod->getKey())
                ->where('employee_id', $employee->getKey())
                ->lockForUpdate()
                ->first();

            if ($result && $lockedPeriod->status === 'reviewed') {
                throw ValidationException::withMessages(['period' => 'Reviewed payroll periods cannot be recalculated.']);
            }
            if ($lockedPeriod->status === 'calculated' && $result && ! $recalculate) {
                throw ValidationException::withMessages(['period' => 'Recalculation must be explicit before review.']);
            }
            if (in_array($lockedPeriod->status, ['reviewed', 'approved', 'posted', 'closed'], true)) {
                throw ValidationException::withMessages(['period' => 'Payroll period cannot be calculated in its current state.']);
            }

            if (! $result) {
                $result = PayrollResult::create([
                    'payroll_period_id' => $lockedPeriod->getKey(),
                    'employee_id' => $employee->getKey(),
                ]);
                $result->refresh();
            }

            $result->components()->delete();
            $start = CarbonImmutable::parse($lockedPeriod->start_date)->startOfDay();
            $end = CarbonImmutable::parse($lockedPeriod->end_date)->endOfDay();
            $rewards = $this->sources->rewards($employee->getKey(), $start, $end);
            $deductions = $this->sources->deductions($employee->getKey(), $start, $end);
            $advances = $this->sources->advances($employee->getKey(), $start, $end);
            $violations = $this->sources->trafficViolations($employee->getKey(), $start, $end);

            $components = [];
            $components[] = $this->component(
                $result,
                'basic_salary:employee:'.$employee->getKey(),
                'earning',
                'employee_salary:period:'.$lockedPeriod->getKey(),
                $employee->getKey(),
                'Basic salary',
                $this->decimal($employee->salary),
                $employee->updated_at,
            );

            foreach ($rewards as $reward) {
                $this->assertSourceOwner($employee->getKey(), $reward->employee_id);
                $components[] = $this->component($result, 'reward:'.$reward->getKey(), 'earning', 'reward', $reward->getKey(), 'Reward', $this->decimal($reward->reward_value), $reward->updated_at, $reward->toArray());
            }
            foreach ($deductions as $deduction) {
                $this->assertSourceOwner($employee->getKey(), $deduction->employee_id);
                $components[] = $this->component($result, 'deduction:'.$deduction->getKey(), 'deduction', 'deduction', $deduction->getKey(), 'Deduction', $this->decimal($deduction->amount), $deduction->updated_at, $deduction->toArray());
            }
            foreach ($advances as $advance) {
                $this->assertSourceOwner($employee->getKey(), $advance->employee_id);
                $components[] = $this->component($result, 'payroll_advance:'.$advance->getKey(), 'deduction', 'payroll_advance', $advance->getKey(), 'Payroll advance', $this->decimal($advance->amount), $advance->updated_at, $advance->toArray());
            }
            foreach ($violations as $violation) {
                $this->assertSourceOwner($employee->getKey(), $violation->employee_id);
                $components[] = $this->component($result, 'traffic_violation:'.$violation->getKey(), 'deduction', 'traffic_violation', $violation->getKey(), 'Traffic violation', $this->decimal($violation->fine_amount), $violation->updated_at, $violation->toArray());
            }

            foreach ($components as $component) {
                $this->assertSourceAvailable($component['source_type'], $component['source_id'], $result->getKey());
                PayrollResultComponent::create($component);
            }

            $basic = $this->decimal($employee->salary);
            $rewardsTotal = $this->sumComponents($components, 'earning') ;
            $rewardsTotal = $this->sub($rewardsTotal, $basic);
            $manualDeductions = $this->sumBySource($components, 'deduction');
            $advancesTotal = $this->sumBySource($components, 'payroll_advance');
            $violationsTotal = $this->sumBySource($components, 'traffic_violation');
            $gross = $this->add($basic, $rewardsTotal);
            $totalDeductions = $this->add($manualDeductions, $advancesTotal);
            $totalDeductions = $this->add($totalDeductions, $violationsTotal);

            $result->update([
                'basic_salary' => $basic,
                'allowances' => '0.00',
                'overtime' => '0.00',
                'total_rewards' => $rewardsTotal,
                'gross_salary' => $gross,
                'attendance_deductions' => '0.00',
                'leave_deductions' => '0.00',
                'manual_deductions' => $manualDeductions,
                'total_advances' => $advancesTotal,
                'traffic_violations' => $violationsTotal,
                'total_deductions' => $totalDeductions,
                'net_salary' => $this->sub($gross, $totalDeductions),
                'calculated_at' => now(),
                'reviewed_at' => null,
                'approved_at' => null,
            ]);

            if ($lockedPeriod->status === 'draft') {
                $lockedPeriod->update(['status' => 'calculated']);
            }

            return $result->fresh(['components', 'employee', 'period']);
        }, 3);
    }

    private function assertSourceOwner(int $employeeId, mixed $sourceEmployeeId): void
    {
        if ((int) $sourceEmployeeId !== $employeeId) {
            throw ValidationException::withMessages(['source' => 'Payroll source belongs to a different employee.']);
        }
    }

    private function assertSourceAvailable(string $sourceType, int $sourceId, int $resultId): void
    {
        $existing = PayrollResultComponent::query()
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->where('payroll_result_id', '!=', $resultId)
            ->lockForUpdate()
            ->exists();
        if ($existing) {
            throw ValidationException::withMessages(['source' => "{$sourceType}:{$sourceId} has already been consumed."]);
        }
    }

    private function component(PayrollResult $result, string $key, string $type, string $sourceType, int $sourceId, string $description, string $amount, mixed $updatedAt, ?array $snapshot = null): array
    {
        return [
            'payroll_result_id' => $result->getKey(),
            'component_key' => $key,
            'component_type' => $type,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'description' => $description,
            'amount' => $amount,
            'source_snapshot' => $snapshot ?? ['employee_id' => $sourceId, 'amount' => $amount],
            'source_updated_at' => $updatedAt,
        ];
    }

    private function sumComponents(array $components, string $type): string
    {
        return array_reduce($components, fn (string $sum, array $component): string => $component['component_type'] === $type ? $this->add($sum, $component['amount']) : $sum, '0.00');
    }

    private function sumBySource(array $components, string $sourceType): string
    {
        return array_reduce($components, fn (string $sum, array $component): string => $component['source_type'] === $sourceType ? $this->add($sum, $component['amount']) : $sum, '0.00');
    }

    private function decimal(mixed $value): string
    {
        $value = trim((string) ($value ?? '0'));
        if ($value === '' || ! preg_match('/^-?\d+(?:\.\d+)?$/', $value)) {
            throw new \InvalidArgumentException('Invalid decimal value.');
        }
        $negative = str_starts_with($value, '-');
        $unsigned = ltrim($value, '-');
        [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '');
        $fraction = str_pad(substr($fraction, 0, 2), 2, '0');
        $normalized = ltrim($whole, '0').'.'.$fraction;
        if (str_starts_with($normalized, '.')) {
            $normalized = '0'.$normalized;
        }
        return $negative && $normalized !== '0.00' ? '-'.$normalized : $normalized;
    }

    private function add(string $left, string $right): string
    {
        return bcadd($left, $right, 2);
    }

    private function sub(string $left, string $right): string
    {
        return bcsub($left, $right, 2);
    }
}
