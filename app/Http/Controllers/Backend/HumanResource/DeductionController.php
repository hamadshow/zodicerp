<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Deduction;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DeductionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $deductions = Deduction::with('employee:id,name')->get()->map(function ($d) {
                try {
                    $date = $d->date instanceof Carbon ? $d->date : Carbon::parse($d->date);
                    return [
                        'id' => $d->id,
                        'employee_id' => $d->employee_id,
                        'employee_name' => $d->employee->name ?? 'Unknown',
                        'type' => $d->type,
                        'amount' => (float) $d->amount,
                        'date' => $date ? $date->format('Y-m-d') : null,
                        'reason' => $d->reason,
                        'status' => $d->status,
                    ];
                } catch (\Exception $e) {
                    return [
                        'id' => $d->id,
                        'employee_id' => $d->employee_id,
                        'employee_name' => 'Error',
                        'type' => 'Error',
                        'amount' => 0,
                        'date' => null,
                        'reason' => $e->getMessage(),
                        'status' => 'Error',
                    ];
                }
            });

            return response()->json($deductions);
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
            'type' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'reason' => 'nullable|string',
            'status' => 'required|string',
        ]);

        $deduction = Deduction::create([
            'employee_id' => $validated['employee_id'],
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'reason' => $validated['reason'] ?? null,
            'status' => $validated['status'],
            'company_id' => 1, // Default for now
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Deduction added successfully!',
            'data' => $deduction
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $deduction = Deduction::with('employee')->findOrFail($id);
        return response()->json($deduction);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $deduction = Deduction::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'type' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'reason' => 'nullable|string',
            'status' => 'required|string',
        ]);

        $deduction->update([
            'employee_id' => $validated['employee_id'],
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'reason' => $validated['reason'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Deduction updated successfully!',
            'data' => $deduction
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $deduction = Deduction::findOrFail($id);
        $deduction->delete();

        return response()->json([
            'success' => true,
            'message' => 'Deduction record deleted successfully!'
        ]);
    }
}
