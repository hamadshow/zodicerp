<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Services\CompanyContext;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }    /**
     * Display a listing of the resource (server-side pagination + sorting + search).
     */
    public function index(Request $request)
    {
        $companyId = $this->companyContext->id();

        // Lightweight per-day status counts for the dashboard strip.
        if ($request->boolean('stats')) {
            $statsQuery = Attendance::query()->where('company_id', $companyId);
            if ($request->filled('date')) {
                $statsQuery->whereDate('date', $request->string('date')->toString());
            }
            $counts = $statsQuery->selectRaw('status, COUNT(*) AS c')
                ->groupBy('status')
                ->pluck('c', 'status');

            return response()->json([
                'present' => (int) ($counts['present'] ?? 0),
                'absent' => (int) ($counts['absent'] ?? 0),
                'late' => (int) ($counts['late'] ?? 0),
                'leave' => (int) ($counts['leave'] ?? 0),
                'total' => (int) $counts->sum(),
            ]);
        }

        $query = Attendance::query()
            ->where('attendances.company_id', $companyId)
            ->with('employee:id,name,position,department');

        if ($request->filled('date')) {
            $query->whereDate('date', $request->string('date')->toString());
        }
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->string('status')->toString());
        }
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%");
            });
        }

        $allowedSort = ['id', 'date', 'time_in', 'time_out', 'status', 'work_hours', 'overtime'];
        $sortBy = in_array($request->input('sort_by'), $allowedSort, true)
            ? $request->input('sort_by')
            : 'date';
        $sortDirection = $request->input('sort_direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDirection)->orderBy('id', 'desc');

        $attendances = $query->paginate(min(max((int) $request->input('per_page', 20), 1), 100));

        $attendances->getCollection()->transform(function ($a) {
            $date = $a->date instanceof Carbon ? $a->date : Carbon::parse($a->date);
            return [
                'id' => $a->id,
                'employeeId' => $a->employee_id,
                'employeeName' => $a->employee->name ?? 'Unknown',
                'employeeCode' => $a->employee->position ?? 'EMP',
                'department' => $a->employee->department ?? '-',
                'date' => $date->format('Y-m-d'),
                'timeIn' => $a->time_in ? Carbon::parse($a->time_in)->format('H:i') : null,
                'timeOut' => $a->time_out ? Carbon::parse($a->time_out)->format('H:i') : null,
                'status' => $a->status,
                'overtime' => (float) $a->overtime,
                'notes' => $a->notes,
                'workHours' => (float) $a->work_hours,
            ];
        });

        return response()->json($attendances);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employeeId' => 'required|exists:employees,id',
            'date' => 'required|date',
            'timeIn' => 'nullable|date_format:H:i',
            'timeOut' => 'nullable|date_format:H:i',
            'status' => 'required|string',
            'overtime' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'workHours' => 'nullable|numeric|min:0',
        ]);

        // Server-side authoritative calculation (4.3).
        $workHours = $this->computeWorkHours($validated['timeIn'] ?? null, $validated['timeOut'] ?? null, $validated['workHours'] ?? null);

        try {
            $attendance = Attendance::create([
                'employee_id' => $validated['employeeId'],
                'date' => $validated['date'],
                'time_in' => $validated['timeIn'] ?? null,
                'time_out' => $validated['timeOut'] ?? null,
                'status' => $validated['status'],
                'overtime' => $validated['overtime'] ?? 0,
                'notes' => $validated['notes'] ?? null,
                'work_hours' => $workHours,
                'company_id' => $this->companyContext->id(),
            ]);
        } catch (QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return response()->json([
                    'success' => false,
                    'message' => 'An attendance record already exists for this employee on this date.',
                    'errors' => ['date' => ['Duplicate attendance entry.']],
                ], 422);
            }
            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Attendance marked successfully!',
            'data' => $attendance
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $attendance = Attendance::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);
        return response()->json($attendance);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $attendance = Attendance::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);

        $validated = $request->validate([
            'employeeId' => 'required|exists:employees,id',
            'date' => 'required|date',
            'timeIn' => 'nullable|date_format:H:i',
            'timeOut' => 'nullable|date_format:H:i',
            'status' => 'required|string',
            'overtime' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'workHours' => 'nullable|numeric|min:0',
        ]);

        $workHours = $this->computeWorkHours($validated['timeIn'] ?? null, $validated['timeOut'] ?? null, $validated['workHours'] ?? null);

        try {
            $attendance->update([
                'employee_id' => $validated['employeeId'],
                'date' => $validated['date'],
                'time_in' => $validated['timeIn'] ?? null,
                'time_out' => $validated['timeOut'] ?? null,
                'status' => $validated['status'],
                'overtime' => $validated['overtime'] ?? 0,
                'notes' => $validated['notes'] ?? null,
                'work_hours' => $workHours,
            ]);
        } catch (QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return response()->json([
                    'success' => false,
                    'message' => 'Another attendance record already exists for this employee on that date.',
                    'errors' => ['date' => ['Duplicate attendance entry.']],
                ], 422);
            }
            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully!',
            'data' => $attendance
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $attendance = Attendance::query()
            ->where('company_id', $this->companyContext->id())
            ->findOrFail($id);
        $attendance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attendance record deleted successfully!'
        ]);
    }

    /**
     * Punch in/out for the authenticated employee (4.4).
     */
    public function punch(Request $request)
    {
        $user = $request->user();
        $employeeId = $user instanceof \App\Models\Employee ? $user->id : ($request->integer('employee_id') ?: null);

        abort_unless($employeeId, 403, 'Only employees can punch in or out.');

        $companyId = $this->companyContext->id();
        $today = now()->toDateString();
        $time = now()->format('H:i');

        $attendance = Attendance::query()
            ->where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->whereDate('date', $today)
            ->first();

        if (! $attendance) {
            $attendance = Attendance::create([
                'employee_id' => $employeeId,
                'date' => $today,
                'time_in' => $time,
                'time_out' => null,
                'status' => 'present',
                'overtime' => 0,
                'notes' => 'Punched in via system',
                'work_hours' => 0,
                'company_id' => $companyId,
            ]);

            return response()->json([
                'success' => true,
                'action' => 'in',
                'time' => $time,
                'message' => "Punched in at {$time}",
                'data' => $attendance,
            ], 201);
        }

        if ($attendance->time_in && ! $attendance->time_out) {
            $attendance->update(['time_out' => $time]);
            $attendance->refresh();
            $attendance->update(['work_hours' => $this->computeWorkHours($attendance->time_in, $attendance->time_out)]);

            return response()->json([
                'success' => true,
                'action' => 'out',
                'time' => $time,
                'message' => "Punched out at {$time}",
                'data' => $attendance,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Attendance is already complete for today.',
            'data' => $attendance,
        ], 409);
    }

    private function computeWorkHours(?string $timeIn, ?string $timeOut, ?string $clientHours = null): float
    {
        // Server-side computation is authoritative; client value ignored when both times exist.
        if ($timeIn && $timeOut) {
            $in = Carbon::createFromFormat('H:i', substr($timeIn, 0, 5));
            $out = Carbon::createFromFormat('H:i', substr($timeOut, 0, 5));

            // in → out is positive for a normal shift; negative means overnight.
            $hours = $in->floatDiffInHours($out);
            if ($hours < 0) {
                $hours += 24; // overnight shift
            }

            return round(max(0, $hours), 2);
        }

        return round((float) ($clientHours ?? 0), 2);
    }
}
