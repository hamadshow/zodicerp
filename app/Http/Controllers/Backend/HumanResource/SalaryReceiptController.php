<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\SalaryReceipt;
use App\Models\Employee;
use App\Models\Deduction;
use App\Models\Reward;
use App\Models\PayrollAdvance;
use App\Models\TrafficViolation;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Str;

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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'period' => 'required|string',
            'receipt_no' => 'required|string|unique:salary_receipts,receipt_no',
            'gross_salary' => 'required|numeric',
            'total_deductions' => 'required|numeric',
            'total_advances' => 'required|numeric',
            'total_rewards' => 'required|numeric',
            'net_salary' => 'required|numeric',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'bank_account' => 'nullable|string',
            'status' => 'required|string',
        ]);

        $receipt = SalaryReceipt::create(array_merge($validated, ['company_id' => 1]));

        return response()->json([
            'success' => true,
            'message' => 'Salary receipt created successfully!',
            'data' => $receipt
        ]);
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
