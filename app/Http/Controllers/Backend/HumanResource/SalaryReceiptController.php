<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Http\Requests\HumanResource\CreateSalaryReceiptRequest;
use App\Models\SalaryReceipt;
use App\Models\PayrollResult;
use App\Models\Employee;
use App\Models\Deduction;
use App\Models\Reward;
use App\Models\PayrollAdvance;
use App\Models\TrafficViolation;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalaryReceiptController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $receipts = SalaryReceipt::with('employee:id,name,position,salary')->get()->map(function ($r) {
                return [
                    'id' => $r->id,
                    'employee_id' => $r->employee_id,
                    'employee_name' => $r->employee->name ?? 'Unknown',
                    'position' => $r->employee->position ?? '-',
                    'receipt_no' => $r->receipt_no,
                    'period' => $r->period,
                    'gross_salary' => (float) $r->gross_salary,
                    'total_deductions' => (float) $r->total_deductions,
                    'total_advances' => (float) $r->total_advances,
                    'total_rewards' => (float) $r->total_rewards,
                    'net_salary' => (float) $r->net_salary,
                    'payment_date' => $r->payment_date ? $r->payment_date->format('Y-m-d') : null,
                    'payment_method' => $r->payment_method,
                    'bank_account' => $r->bank_account,
                    'status' => $r->status,
                ];
            });

            return response()->json($receipts);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Calculate salary for an employee in a specific period.
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'period' => 'required|string', // format YYYY-MM
        ]);

        $employeeId = $request->employee_id;
        $period = $request->period;
        $employee = Employee::find($employeeId);

        $startDate = Carbon::parse($period . '-01')->startOfMonth();
        $endDate = Carbon::parse($period . '-01')->endOfMonth();

        // 1. Gross Salary (Basic)
        $grossSalary = (float) ($employee->salary ?? 0);

        // 2. Deductions
        $deductions = (float) Deduction::where('employee_id', $employeeId)
            ->whereBetween('date', [$startDate, $endDate])
            ->where('status', 'Approved')
            ->sum('amount');

        // 3. Traffic Violations (also deductions)
        $violations = (float) TrafficViolation::where('employee_id', $employeeId)
            ->whereBetween('violation_date', [$startDate, $endDate])
            ->sum('fine_amount');

        $totalDeductions = $deductions + $violations;

        // 4. Payroll Advances
        $advances = (float) PayrollAdvance::where('employee_id', $employeeId)
            ->whereBetween('date', [$startDate, $endDate])
            ->where('status', 'Approved')
            ->sum('amount');

        // 5. Rewards
        $rewards = (float) Reward::where('employee_id', $employeeId)
            ->whereBetween('award_date', [$startDate, $endDate])
            ->whereIn('status', ['approved', 'delivered'])
            ->sum('reward_value');

        // Net Salary calculation
        $netSalary = $grossSalary + $rewards - $totalDeductions - $advances;

        return response()->json([
            'gross_salary' => $grossSalary,
            'total_deductions' => $totalDeductions,
            'total_advances' => $advances,
            'total_rewards' => $rewards,
            'net_salary' => $netSalary,
            'period' => $period,
            'receipt_no' => 'PAY-' . strtoupper(Str::random(8))
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateSalaryReceiptRequest $request)
    {
        $receipt = DB::transaction(function () use ($request): SalaryReceipt {
            $result = PayrollResult::query()
                ->with('period')
                ->lockForUpdate()
                ->findOrFail((int) $request->validated('payroll_result_id'));
            if (! in_array($result->period->status, ['approved', 'posted', 'closed'], true)) {
                throw ValidationException::withMessages(['payroll_result_id' => 'A salary receipt requires an approved payroll result.']);
            }
            if (SalaryReceipt::query()->where('payroll_result_id', $result->getKey())->exists()) {
                throw ValidationException::withMessages(['payroll_result_id' => 'A salary receipt already exists for this payroll result.']);
            }

            return SalaryReceipt::create([
                'employee_id' => $result->employee_id,
                'payroll_result_id' => $result->getKey(),
                'receipt_no' => 'PAY-'.strtoupper(Str::random(8)),
                'period' => $result->period->start_date->format('Y-m'),
                'gross_salary' => $result->gross_salary,
                'total_deductions' => $result->total_deductions,
                'total_advances' => $result->total_advances,
                'total_rewards' => $result->total_rewards,
                'net_salary' => $result->net_salary,
                'payment_date' => $request->validated('payment_date'),
                'payment_method' => $request->validated('payment_method'),
                'bank_account' => $request->validated('bank_account'),
                'status' => 'pending',
            ]);
        }, 3);

        return response()->json([
            'success' => true,
            'message' => 'Salary receipt created successfully!',
            'data' => $receipt
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $receipt = SalaryReceipt::with('employee')->findOrFail($id);
        return response()->json($receipt);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $receipt = SalaryReceipt::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string',
            'bank_account' => 'nullable|string',
        ]);

        $receipt->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Salary receipt updated successfully!',
            'data' => $receipt
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $receipt = SalaryReceipt::findOrFail($id);
        $receipt->delete();

        return response()->json([
            'success' => true,
            'message' => 'Salary receipt deleted successfully!'
        ]);
    }
}
