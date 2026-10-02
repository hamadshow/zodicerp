<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\EmployeeContract;
use App\Services\CompanyContext;
use Illuminate\Http\Request;

class EmployeeContractController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index(Request $request)
    {
        $companyId = $this->companyContext->id();

        $query = EmployeeContract::query()
            ->where('company_id', $companyId)
            ->with('employee:id,name,position');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', (int) $request->input('employee_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $contracts = $query->get()->map(fn (EmployeeContract $c) => [
            'id' => $c->id,
            'employee_id' => $c->employee_id,
            'employee_name' => $c->employee->name ?? 'Unknown',
            'contract_type' => $c->contract_type,
            'start_date' => $c->start_date?->format('Y-m-d'),
            'end_date' => $c->end_date?->format('Y-m-d'),
            'salary' => (float) $c->salary,
            'status' => $c->status,
            'expired' => $c->isExpired(),
            'days_until_expiry' => $c->daysUntilExpiry(),
            'notes' => $c->notes,
        ]);

        return response()->json($contracts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'contract_type' => 'required|in:full_time,part_time,temporary,probation',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'salary' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,expired,terminated',
            'notes' => 'nullable|string|max:2000',
        ]);

        $companyId = $this->companyContext->id();

        // One active contract per employee per company.
        if (($validated['status'] ?? 'active') === 'active') {
            $existing = EmployeeContract::query()
                ->where('company_id', $companyId)
                ->where('employee_id', (int) $validated['employee_id'])
                ->where('status', 'active')
                ->exists();
            if ($existing) {
                return response()->json([
                    'message' => 'This employee already has an active contract. Terminate or expire it first.',
                    'errors' => ['employee_id' => ['Active contract exists.']],
                ], 422);
            }
        }

        $contract = EmployeeContract::create([
            ...collect($validated)->except('status')->all(),
            'status' => $validated['status'] ?? 'active',
            'company_id' => $companyId,
        ]);

        return response()->json(['success' => true, 'message' => 'Contract created successfully.', 'data' => $contract], 201);
    }

    public function show(Request $request, $id)
    {
        return response()->json(
            EmployeeContract::query()
                ->where('company_id', $this->companyContext->id())
                ->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $contract = EmployeeContract::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        $validated = $request->validate([
            'contract_type' => 'sometimes|in:full_time,part_time,temporary,probation',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'salary' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:active,expired,terminated',
            'notes' => 'nullable|string|max:2000',
        ]);

        $contract->update($validated);

        return response()->json(['success' => true, 'message' => 'Contract updated successfully.', 'data' => $contract]);
    }

    public function destroy(Request $request, $id)
    {
        $contract = EmployeeContract::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        $contract->delete();

        return response()->json(['success' => true, 'message' => 'Contract deleted successfully.']);
    }

    /**
     * Contracts expiring within N days (default 30) — expiry tracking.
     */
    public function expiring(Request $request)
    {
        $days = min(max((int) $request->input('days', 30), 1), 365);

        $contracts = EmployeeContract::query()
            ->where('company_id', $this->companyContext->id())
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [now()->toDateString(), now()->addDays($days)->toDateString()])
            ->with('employee:id,name,position')
            ->get()
            ->map(fn (EmployeeContract $c) => [
                'id' => $c->id,
                'employee_name' => $c->employee->name ?? 'Unknown',
                'end_date' => $c->end_date?->format('Y-m-d'),
                'days_until_expiry' => $c->daysUntilExpiry(),
            ]);

        return response()->json($contracts);
    }
}
