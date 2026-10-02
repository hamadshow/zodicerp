<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\VacationBalance;
use App\Services\CompanyContext;
use Illuminate\Http\Request;

class VacationBalanceController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index(Request $request)
    {
        $companyId = $this->companyContext->id();
        $year = (int) ($request->input('year', now()->year));

        $query = VacationBalance::query()
            ->where('company_id', $companyId)
            ->where('year', $year)
            ->with('employee:id,name,position');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', (int) $request->input('employee_id'));
        }

        $balances = $query->get()->map(fn (VacationBalance $b) => [
            'id' => $b->id,
            'employee_id' => $b->employee_id,
            'employee_name' => $b->employee->name ?? 'Unknown',
            'leave_type' => $b->leave_type,
            'year' => $b->year,
            'entitlement_days' => (float) $b->entitlement_days,
            'used_days' => $b->usedDays(),
            'remaining_days' => $b->remainingDays(),
        ]);

        return response()->json($balances);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'leave_type' => 'required|in:annual,sick,maternity,unpaid',
            'year' => 'required|integer|min:2000|max:2100',
            'entitlement_days' => 'required|numeric|min:0|max:365',
        ]);

        $balance = VacationBalance::updateOrCreate(
            [
                'employee_id' => (int) $validated['employee_id'],
                'leave_type' => $validated['leave_type'],
                'year' => (int) $validated['year'],
            ],
            [
                'entitlement_days' => $validated['entitlement_days'],
                'company_id' => $this->companyContext->id(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Leave balance saved successfully.',
            'data' => $balance,
        ], 201);
    }
}
