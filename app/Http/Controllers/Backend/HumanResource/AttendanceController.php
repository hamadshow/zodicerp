<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $attendances = Attendance::with('employee')->get()->map(function ($a) {
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

        $attendance = Attendance::create([
            'employee_id' => $validated['employeeId'],
            'date' => $validated['date'],
            'time_in' => $validated['timeIn'] ?? null,
            'time_out' => $validated['timeOut'] ?? null,
            'status' => $validated['status'],
            'overtime' => $validated['overtime'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'work_hours' => $validated['workHours'] ?? 0,
        ]);

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
        $attendance = Attendance::findOrFail($id);
        return response()->json($attendance);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $attendance = Attendance::findOrFail($id);

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

        $attendance->update([
            'employee_id' => $validated['employeeId'],
            'date' => $validated['date'],
            'time_in' => $validated['timeIn'] ?? null,
            'time_out' => $validated['timeOut'] ?? null,
            'status' => $validated['status'],
            'overtime' => $validated['overtime'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'work_hours' => $validated['workHours'] ?? 0,
        ]);

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
        $attendance = Attendance::findOrFail($id);
        $attendance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attendance record deleted successfully!'
        ]);
    }
}
