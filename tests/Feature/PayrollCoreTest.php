<?php

namespace Tests\Feature;

use App\Models\Deduction;
use App\Models\Employee;
use App\Models\PayrollAdvance;
use App\Models\PayrollPeriod;
use App\Models\PayrollResult;
use App\Models\Reward;
use App\Models\SalaryReceipt;
use App\Models\TrafficViolation;
use App\Models\User;
use App\Services\Payroll\PayrollCalculationService;
use App\Services\Payroll\PayrollWorkflowService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PayrollCoreTest extends TestCase
{
    private array $employeeIds = [];
    private array $userIds = [];
    private array $periodIds = [];
    private array $sourceIds = [
        'rewards' => [],
        'deductions' => [],
        'advances' => [],
        'violations' => [],
    ];

    protected function tearDown(): void
    {
        SalaryReceipt::whereIn('payroll_result_id', PayrollResult::whereIn('payroll_period_id', $this->periodIds)->pluck('id'))->delete();
        PayrollPeriod::whereIn('id', $this->periodIds)->delete();
        TrafficViolation::whereIn('id', $this->sourceIds['violations'])->delete();
        PayrollAdvance::whereIn('id', $this->sourceIds['advances'])->delete();
        Deduction::whereIn('id', $this->sourceIds['deductions'])->delete();
        Reward::whereIn('id', $this->sourceIds['rewards'])->delete();
        Employee::whereIn('id', $this->employeeIds)->delete();
        User::whereIn('id', $this->userIds)->delete();
        parent::tearDown();
    }

    public function test_period_is_created_and_overlaps_are_rejected(): void
    {
        $period = $this->period('September 2026', '2026-09-01', '2026-09-30');
        $this->expectException(ValidationException::class);
        $this->createPeriod('Overlapping', '2026-09-15', '2026-10-15');
        $this->assertDatabaseHas('payroll_periods', ['id' => $period->id, 'status' => 'draft']);
    }

    public function test_calculation_uses_server_side_sources_and_decimal_snapshots(): void
    {
        $employee = $this->employee('1500.10');
        $period = $this->period('October 2026', '2026-10-01', '2026-10-31');
        $this->reward($employee, '100.25', 'approved');
        $this->deduction($employee, '25.10', 'Approved');
        $this->advance($employee, '50.05', 'Approved');
        $this->violation($employee, '10.10');

        $result = app(PayrollCalculationService::class)->calculate($period, $employee->id);

        $this->assertSame('1500.10', $result->basic_salary);
        $this->assertSame('1600.35', $result->gross_salary);
        $this->assertSame('85.25', $result->total_deductions);
        $this->assertSame('1515.10', $result->net_salary);
        $this->assertSame('calculated', $period->fresh()->status);
        $this->assertCount(5, $result->components);
        $this->assertDatabaseHas('payroll_result_components', ['component_key' => 'basic_salary:employee:'.$employee->id]);
    }

    public function test_period_employee_and_source_identity_are_unique(): void
    {
        $employee = $this->employee('1000.00');
        $period = $this->period('November 2026', '2026-11-01', '2026-11-30');
        $result = app(PayrollCalculationService::class)->calculate($period, $employee->id);
        $this->assertSame($result->id, PayrollResult::where('payroll_period_id', $period->id)->where('employee_id', $employee->id)->value('id'));

        $this->expectException(QueryException::class);
        DB::table('payroll_results')->insert([
            'payroll_period_id' => $period->id,
            'employee_id' => $employee->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_recalculation_rebuilds_components_before_review_but_is_rejected_after_review(): void
    {
        $employee = $this->employee('1000.00');
        $period = $this->period('December 2026', '2026-12-01', '2026-12-31');
        $reward = $this->reward($employee, '10.00', 'approved');
        $reward->update(['award_date' => '2026-12-10']);
        $service = app(PayrollCalculationService::class);
        $first = $service->calculate($period, $employee->id);
        $reward->update(['reward_value' => '20.00']);
        $second = $service->calculate($period->fresh(), $employee->id, true);
        $this->assertNotSame($first->net_salary, $second->net_salary);
        $this->assertSame(1, $second->components()->where('component_key', 'reward:'.$reward->id)->count());

        app(PayrollWorkflowService::class)->transition($period->fresh(), 'reviewed');
        $this->expectException(ValidationException::class);
        $service->calculate($period->fresh(), $employee->id, true);
    }

    public function test_approved_and_closed_periods_cannot_transition_back_or_recalculate(): void
    {
        $employee = $this->employee('1000.00');
        $period = $this->period('January 2027', '2027-01-01', '2027-01-31');
        $service = app(PayrollCalculationService::class);
        $service->calculate($period, $employee->id);
        $workflow = app(PayrollWorkflowService::class);
        $workflow->transition($period->fresh(), 'reviewed');
        $workflow->transition($period->fresh(), 'approved');
        $this->expectException(ValidationException::class);
        $workflow->transition($period->fresh(), 'calculated');
    }

    public function test_source_cannot_be_consumed_in_another_result(): void
    {
        $employee = $this->employee('1000.00');
        $source = $this->reward($employee, '20.00', 'approved');
        $firstPeriod = $this->period('February 2027', '2027-02-01', '2027-02-28');
        $secondPeriod = $this->period('March 2027', '2027-03-01', '2027-03-31');
        $source->update(['award_date' => '2027-02-10']);
        app(PayrollCalculationService::class)->calculate($firstPeriod, $employee->id);
        $source->update(['award_date' => '2027-03-01']);

        $this->expectException(ValidationException::class);
        app(PayrollCalculationService::class)->calculate($secondPeriod, $employee->id);
    }

    public function test_failed_recalculation_rolls_back_component_rebuild(): void
    {
        $employee = $this->employee('1000.00');
        $firstPeriod = $this->period('May 2027', '2027-05-01', '2027-05-31');
        $secondPeriod = $this->period('June 2027', '2027-06-01', '2027-06-30');
        $oldReward = $this->reward($employee, '10.00', 'approved');
        $oldReward->update(['award_date' => '2027-05-10']);
        $conflictingReward = $this->reward($employee, '20.00', 'approved');
        $conflictingReward->update(['award_date' => '2027-06-10']);
        $service = app(PayrollCalculationService::class);
        $firstResult = $service->calculate($firstPeriod, $employee->id);
        $service->calculate($secondPeriod, $employee->id);
        $conflictingReward->update(['award_date' => '2027-05-10']);

        $this->expectException(ValidationException::class);
        try {
            $service->calculate($firstPeriod->fresh(), $employee->id, true);
        } finally {
            $this->assertDatabaseHas('payroll_result_components', [
                'payroll_result_id' => $firstResult->id,
                'component_key' => 'reward:'.$oldReward->id,
            ]);
        }
    }

    public function test_salary_receipt_uses_approved_snapshot_and_rejects_client_totals(): void
    {
        $employee = $this->employee('1000.00');
        $period = $this->period('April 2027', '2027-04-01', '2027-04-30');
        $result = app(PayrollCalculationService::class)->calculate($period, $employee->id);
        $workflow = app(PayrollWorkflowService::class);
        $workflow->transition($period->fresh(), 'reviewed');
        $workflow->transition($period->fresh(), 'approved');
        $user = User::create(['username' => 'payroll_admin_'.uniqid(), 'email' => 'payroll_admin_'.uniqid().'@test.invalid', 'password' => bcrypt('password'), 'role' => 'admin']);
        $this->userIds[] = $user->id;

        $this->actingAs($user, 'sanctum')->postJson('/api/salary-receipts', [
            'payroll_result_id' => $result->id,
            'payment_date' => '2027-04-30',
            'payment_method' => 'Bank Transfer',
            'gross_salary' => '999999.99',
            'total_deductions' => '0.00',
            'total_advances' => '0.00',
            'total_rewards' => '999999.99',
            'net_salary' => '999999.99',
        ])->assertUnprocessable();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/salary-receipts', [
            'payroll_result_id' => $result->id,
            'payment_date' => '2027-04-30',
            'payment_method' => 'Bank Transfer',
        ])->assertCreated();
        $this->assertSame('1000.00', (string) $response->json('data.gross_salary'));
        $this->assertSame($result->id, $response->json('data.payroll_result_id'));

        $this->actingAs($user, 'sanctum')->postJson('/api/salary-receipts', [
            'payroll_result_id' => $result->id,
            'payment_date' => '2027-04-30',
            'payment_method' => 'Bank Transfer',
        ])->assertUnprocessable();
    }

    private function employee(string $salary): Employee
    {
        $employee = Employee::create([
            'name' => 'Payroll Test Employee '.uniqid(),
            'first_name' => 'Payroll',
            'last_name' => 'Test',
            'email' => 'payroll_'.uniqid().'@test.invalid',
            'password' => bcrypt('password'),
            'salary' => $salary,
            'status' => 'active',
        ]);
        $this->employeeIds[] = $employee->id;
        return $employee;
    }

    private function period(string $name, string $start, string $end): PayrollPeriod
    {
        return $this->createPeriod($name, $start, $end);
    }

    private function createPeriod(string $name, string $start, string $end): PayrollPeriod
    {
        $overlap = PayrollPeriod::whereDate('start_date', '<=', $end)->whereDate('end_date', '>=', $start)->exists();
        if ($overlap) {
            throw ValidationException::withMessages(['start_date' => 'Payroll period overlaps an existing period.']);
        }
        $period = PayrollPeriod::create(['name' => $name, 'start_date' => $start, 'end_date' => $end, 'status' => 'draft']);
        $this->periodIds[] = $period->id;
        return $period;
    }

    private function reward(Employee $employee, string $amount, string $status): Reward
    {
        $id = $this->nextId('rewards');
        DB::table('rewards')->insert(['id' => $id, 'employee_id' => $employee->id, 'reward_type' => 'monetary', 'reward_value' => $amount, 'award_date' => '2026-10-10', 'status' => $status, 'reason' => 'Test reward', 'created_at' => now(), 'updated_at' => now()]);
        $reward = Reward::findOrFail($id);
        $this->sourceIds['rewards'][] = $reward->id;
        return $reward;
    }

    private function deduction(Employee $employee, string $amount, string $status): Deduction
    {
        $id = $this->nextId('deductions');
        DB::table('deductions')->insert(['id' => $id, 'employee_id' => $employee->id, 'type' => 'Other', 'amount' => $amount, 'date' => '2026-10-10', 'reason' => 'Test deduction', 'status' => $status, 'created_at' => now(), 'updated_at' => now()]);
        $deduction = Deduction::findOrFail($id);
        $this->sourceIds['deductions'][] = $deduction->id;
        return $deduction;
    }

    private function advance(Employee $employee, string $amount, string $status): PayrollAdvance
    {
        $id = $this->nextId('payroll_advances');
        DB::table('payroll_advances')->insert(['id' => $id, 'employee_id' => $employee->id, 'amount' => $amount, 'date' => '2026-10-10', 'repayment_plan' => 'one-time', 'status' => $status, 'created_at' => now(), 'updated_at' => now()]);
        $advance = PayrollAdvance::findOrFail($id);
        $this->sourceIds['advances'][] = $advance->id;
        return $advance;
    }

    private function violation(Employee $employee, string $amount): TrafficViolation
    {
        $id = $this->nextId('traffic_violations');
        DB::table('traffic_violations')->insert(['id' => $id, 'employee_id' => $employee->id, 'vehicle_plate' => 'TEST-1', 'vehicle_type' => 'car', 'driver_license' => 'TEST-LICENSE', 'violation_type' => 'test', 'severity' => 'minor', 'violation_date' => '2026-10-10', 'fine_amount' => $amount, 'location' => 'test', 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
        $violation = TrafficViolation::findOrFail($id);
        $this->sourceIds['violations'][] = $violation->id;
        return $violation;
    }

    private function nextId(string $table): int
    {
        return ((int) DB::table($table)->max('id')) + 1;
    }
}
