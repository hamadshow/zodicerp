<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\EndOfServiceRecord;
use App\Services\CompanyContext;
use Illuminate\Http\Request;
use Carbon\Carbon;

class EndOfServiceController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index(Request $request)
    {
        try {
            $records = EndOfServiceRecord::query()
                ->where('company_id', $this->companyContext->id())
                ->with('employee:id,name,position,hire_date,salary')
                ->latest('created_at')
                ->get()
                ->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'employee' => $r->employee->name ?? 'Unknown',
                        'employeeId' => $r->employee_id,
                        'type' => ucfirst(str_replace('_', ' ', $r->type)),
                        'typeRaw' => $r->type,
                        'date' => $r->date?->format('Y-m-d'),
                        'reason' => $r->reason,
                        'amount' => (float) $r->amount,
                        'status' => ucfirst($r->status),
                        'statusRaw' => $r->status,
                    ];
                });

            return response()->json($records);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employeeId' => 'required|integer|exists:employees,id',
            'type' => 'required|in:resignation,termination,contract_end,retirement',
            'date' => 'required|date',
            'reason' => 'nullable|string|max:2000',
            'amount' => 'required|numeric|min:0',
            'status' => 'nullable|in:pending,processed,cancelled',
        ]);

        $record = EndOfServiceRecord::create([
            'employee_id' => (int) $validated['employeeId'],
            'type' => $validated['type'],
            'date' => $validated['date'],
            'reason' => $validated['reason'] ?? null,
            'amount' => $validated['amount'],
            'status' => $validated['status'] ?? 'pending',
            'company_id' => $this->companyContext->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'End-of-service record added successfully!',
            'data' => $record,
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $record = EndOfServiceRecord::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        return response()->json($record);
    }

    public function update(Request $request, $id)
    {
        $record = EndOfServiceRecord::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        $validated = $request->validate([
            'employeeId' => 'required|integer|exists:employees,id',
            'type' => 'required|in:resignation,termination,contract_end,retirement',
            'date' => 'required|date',
            'reason' => 'nullable|string|max:2000',
            'amount' => 'required|numeric|min:0',
            'status' => 'nullable|in:pending,processed,cancelled',
        ]);

        $record->update([
            'employee_id' => (int) $validated['employeeId'],
            'type' => $validated['type'],
            'date' => $validated['date'],
            'reason' => $validated['reason'] ?? null,
            'amount' => $validated['amount'],
            'status' => $validated['status'] ?? $record->status,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Record updated successfully!',
            'data' => $record,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = EndOfServiceRecord::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'Record deleted successfully!',
        ]);
    }
}
