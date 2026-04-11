<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\TrafficViolation;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TrafficViolationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $violations = TrafficViolation::with('employee:id,name')->get()->map(function ($v) {
                try {
                    $date = $v->violation_date instanceof Carbon ? $v->violation_date : Carbon::parse($v->violation_date);
                    return [
                        'id' => $v->id,
                        'employee_id' => $v->employee_id,
                        'driverName' => $v->employee->name ?? 'Unknown',
                        'vehiclePlate' => $v->vehicle_plate,
                        'vehicleType' => $v->vehicle_type,
                        'driverLicense' => $v->driver_license,
                        'violationType' => $v->violation_type,
                        'severity' => $v->severity,
                        'violationDate' => $date ? $date->format('Y-m-d\TH:i') : null,
                        'fineAmount' => (float) $v->fine_amount,
                        'location' => $v->location,
                        'officerId' => $v->officer_id,
                        'status' => $v->status,
                        'points' => (int) $v->points,
                        'description' => $v->description,
                        'evidenceNotes' => $v->evidence_notes,
                    ];
                } catch (\Exception $e) {
                    return [
                        'id' => $v->id,
                        'employee_id' => $v->employee_id,
                        'driverName' => 'Error',
                        'vehiclePlate' => $v->vehicle_plate,
                        'status' => 'Error',
                        'error' => $e->getMessage(),
                    ];
                }
            });

            return response()->json($violations);
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
            'vehiclePlate' => 'required|string',
            'vehicleType' => 'required|string',
            'driverLicense' => 'nullable|string',
            'violationType' => 'required|string',
            'severity' => 'required|in:low,medium,high',
            'violationDate' => 'required|date',
            'fineAmount' => 'required|numeric|min:0',
            'location' => 'required|string',
            'officerId' => 'nullable|string',
            'status' => 'required|string',
            'points' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'evidenceNotes' => 'nullable|string',
        ]);

        $violation = TrafficViolation::create([
            'employee_id' => $validated['employee_id'],
            'vehicle_plate' => $validated['vehiclePlate'],
            'vehicle_type' => $validated['vehicleType'],
            'driver_license' => $validated['driverLicense'],
            'violation_type' => $validated['violationType'],
            'severity' => $validated['severity'],
            'violation_date' => $validated['violationDate'],
            'fine_amount' => $validated['fineAmount'],
            'location' => $validated['location'],
            'officer_id' => $validated['officerId'],
            'status' => $validated['status'],
            'points' => $validated['points'] ?? 0,
            'description' => $validated['description'],
            'evidence_notes' => $validated['evidenceNotes'],
            'company_id' => 1, // Default for now
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Traffic violation record created successfully!',
            'data' => $violation
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $violation = TrafficViolation::with('employee')->findOrFail($id);
        return response()->json($violation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $violation = TrafficViolation::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'vehiclePlate' => 'required|string',
            'vehicleType' => 'required|string',
            'driverLicense' => 'nullable|string',
            'violationType' => 'required|string',
            'severity' => 'required|in:low,medium,high',
            'violationDate' => 'required|date',
            'fineAmount' => 'required|numeric|min:0',
            'location' => 'required|string',
            'officerId' => 'nullable|string',
            'status' => 'required|string',
            'points' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'evidenceNotes' => 'nullable|string',
        ]);

        $violation->update([
            'employee_id' => $validated['employee_id'],
            'vehicle_plate' => $validated['vehiclePlate'],
            'vehicle_type' => $validated['vehicleType'],
            'driver_license' => $validated['driverLicense'],
            'violation_type' => $validated['violationType'],
            'severity' => $validated['severity'],
            'violation_date' => $validated['violationDate'],
            'fine_amount' => $validated['fineAmount'],
            'location' => $validated['location'],
            'officer_id' => $validated['officerId'],
            'status' => $validated['status'],
            'points' => $validated['points'] ?? 0,
            'description' => $validated['description'],
            'evidence_notes' => $validated['evidenceNotes'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Traffic violation record updated successfully!',
            'data' => $violation
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $violation = TrafficViolation::findOrFail($id);
        $violation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Traffic violation record deleted successfully!'
        ]);
    }
}
