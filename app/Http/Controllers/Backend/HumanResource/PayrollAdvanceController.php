<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\PayrollAdvance;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PayrollAdvanceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $advances = PayrollAdvance::with('employee:id,name')->get()->map(function ($a) {
                try {
                    $date = $a->date instanceof Carbon ? $a->date : Carbon::parse($a->date);
                    return [
                        'id' => $a->id,
                        'employee_id' => $a->employee_id,
                        'employee' => $a->employee ? $a->employee->name : 'Unknown',
                        'amount' => (float) $a->amount,
                        'date' => $date ? $date->format('Y-m-d') : null,
                        'repaymentPlan' => $a->repayment_plan,
                        'status' => $a->status,
                        'notes' => $a->notes,
                    ];
                } catch (\Exception $e) {
                    return [
                        'id' => $a->id,
                        'employee_id' => $a->employee_id,
                        'employee' => 'Error',
                        'amount' => 0,
                        'date' => null,
                        'repaymentPlan' => 'Error',
                        'status' => 'Error',
                        'notes' => $e->getMessage(),
                    ];
                }
            });

            return response()->json($advances);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'repaymentPlan' => 'required|string',
            'status' => 'required|in:pending,approved,in_progress,completed,defaulted,cancelled',
            'notes' => 'nullable|string',
        ]);

        $advance = PayrollAdvance::create([
            'employee_id' => $validated['employee_id'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'repayment_plan' => $validated['repaymentPlan'],
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
            'company_id' => 1, // Default for now
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payroll advance requested successfully!',
            'data' => $advance
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $advance = PayrollAdvance::with('employee')->findOrFail($id);
        return response()->json($advance);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $advance = PayrollAdvance::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'repaymentPlan' => 'required|string',
            'status' => 'required|in:pending,approved,in_progress,completed,defaulted,cancelled',
            'notes' => 'nullable|string',
        ]);

        $advance->update([
            'employee_id' => $validated['employee_id'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'repayment_plan' => $validated['repaymentPlan'],
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payroll advance updated successfully!',
            'data' => $advance
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $advance = PayrollAdvance::findOrFail($id);
        $advance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll advance deleted successfully!'
        ]);
    }
}
