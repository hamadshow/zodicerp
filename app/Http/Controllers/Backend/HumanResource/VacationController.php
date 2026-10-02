<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Vacation;
use App\Models\VacationBalance;
use App\Services\CompanyContext;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Carbon\CarbonInterface;

class VacationController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index(Request $request)
    {
        try {
            $companyId = $this->companyContext->id();

            $vacations = Vacation::query()
                ->with('employee:id,name')
                ->where('company_id', $companyId)
                ->latest('created_at')
                ->get()
                ->map(function ($v) {
                    return [
                        'id' => $v->id,
                        'employeeId' => $v->employee_id,
                        'employeeName' => $v->employee->name ?? 'Unknown',
                        'leaveType' => $v->leave_type,
                        'startDate' => $v->start_date?->format('Y-m-d'),
                        'endDate' => $v->end_date?->format('Y-m-d'),
                        'totalDays' => (int) $v->total_days,
                        'status' => $v->status,
                        'notes' => $v->notes,
                    ];
                });

            return response()->json($vacations);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employeeId' => 'required|integer|exists:employees,id',
            'leaveType' => 'required|in:annual,sick,maternity,unpaid',
            'startDate' => 'required|date',
            'endDate' => 'required|date|after_or_equal:startDate',
            'status' => 'nullable|in:pending,approved,rejected',
            'notes' => 'nullable|string|max:2000',
        ]);

        $companyId = $this->companyContext->id();

        $overlap = Vacation::query()
            ->where('company_id', $companyId)
            ->where('employee_id', (int) $validated['employeeId'])
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('start_date', '<=', $validated['endDate'])
            ->whereDate('end_date', '>=', $validated['startDate'])
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'This employee already has a pending or approved vacation overlapping these dates.',
                'errors' => ['startDate' => ['Overlapping vacation request exists.']],
            ], 422);
        }

        $totalDays = $this->calculateDays($validated['startDate'], $validated['endDate']);

        $balanceError = $this->checkBalance(
            (int) $validated['employeeId'],
            $validated['leaveType'],
            (int) substr($validated['startDate'], 0, 4),
            $totalDays
        );
        if ($balanceError) {
            return response()->json([
                'message' => $balanceError,
                'errors' => ['leaveType' => [$balanceError]],
            ], 422);
        }

        $vacation = Vacation::create([
            'employee_id' => (int) $validated['employeeId'],
            'leave_type' => $validated['leaveType'],
            'start_date' => $validated['startDate'],
            'end_date' => $validated['endDate'],
            'total_days' => $totalDays,
            'status' => $validated['status'] ?? 'pending',
            'notes' => $validated['notes'] ?? null,
            'company_id' => $companyId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Vacation request submitted successfully!',
            'data' => $vacation,
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $vacation = Vacation::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        return response()->json($vacation);
    }

    public function update(Request $request, $id)
    {
        $companyId = $this->companyContext->id();

        $vacation = Vacation::query()
            ->where('company_id', $companyId)
            ->findOrFail($id);

        $validated = $request->validate([
            'employeeId' => 'required|integer|exists:employees,id',
            'leaveType' => 'required|in:annual,sick,maternity,unpaid',
            'startDate' => 'required|date',
            'endDate' => 'required|date|after_or_equal:startDate',
            'status' => 'nullable|in:pending,approved,rejected',
            'notes' => 'nullable|string|max:2000',
        ]);

        $overlap = Vacation::query()
            ->where('company_id', $companyId)
            ->where('employee_id', (int) $validated['employeeId'])
            ->whereIn('status', ['pending', 'approved'])
            ->where('id', '!=', $vacation->getKey())
            ->whereDate('start_date', '<=', $validated['endDate'])
            ->whereDate('end_date', '>=', $validated['startDate'])
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'This employee already has a pending or approved vacation overlapping these dates.',
                'errors' => ['startDate' => ['Overlapping vacation request exists.']],
            ], 422);
        }

        $vacation->update([
            'employee_id' => (int) $validated['employeeId'],
            'leave_type' => $validated['leaveType'],
            'start_date' => $validated['startDate'],
            'end_date' => $validated['endDate'],
            'total_days' => $this->calculateDays($validated['startDate'], $validated['endDate']),
            'status' => $validated['status'] ?? $vacation->status,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Vacation updated successfully!',
            'data' => $vacation,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $vacation = Vacation::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        $vacation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vacation deleted successfully!',
        ]);
    }

    /**
     * Enforces remaining balance when an entitlement exists for the
     * employee/type/year. Types without an explicit balance (e.g. sick)
     * are not blocked — no labor-law rules are assumed.
     */
    private function checkBalance(int $employeeId, string $leaveType, int $year, float $requestedDays): ?string
    {
        $balance = VacationBalance::query()
            ->where('employee_id', $employeeId)
            ->where('leave_type', $leaveType)
            ->where('year', $year)
            ->first();

        if (! $balance) {
            return null;
        }

        $remaining = $balance->remainingDays();
        if ($requestedDays > $remaining) {
            return "Insufficient {$leaveType} leave balance: {$requestedDays} day(s) requested, {$remaining} remaining.";
        }

        return null;
    }

    private function calculateDays(string $startDate, string $endDate): int
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        return (int) $start->diffInDays($end, CarbonInterface::DIFF_ABSOLUTE) + 1;
    }
}
