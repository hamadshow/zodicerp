<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Reward;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RewardController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $rewards = Reward::with('employee:id,name,position')->get()->map(function ($r) {
                try {
                    $date = $r->award_date instanceof Carbon ? $r->award_date : Carbon::parse($r->award_date);
                    return [
                        'id' => $r->id,
                        'employee_id' => $r->employee_id,
                        'employee_name' => $r->employee->name ?? 'Unknown',
                        'position' => $r->employee->position ?? '-',
                        'reward_type' => $r->reward_type,
                        'reward_value' => $r->reward_value,
                        'category' => $r->category,
                        'award_date' => $date ? $date->format('Y-m-d') : null,
                        'status' => $r->status,
                        'badge' => $r->badge,
                        'reason' => $r->reason,
                        'awarded_by' => $r->awarded_by,
                        'points' => (int) $r->points,
                        'notes' => $r->notes,
                    ];
                } catch (\Exception $e) {
                    return [
                        'id' => $r->id,
                        'employee_id' => $r->employee_id,
                        'employee_name' => 'Error',
                        'position' => '-',
                        'reward_type' => 'Error',
                        'reward_value' => 0,
                        'category' => 'Error',
                        'award_date' => null,
                        'status' => 'Error',
                        'reason' => $e->getMessage(),
                    ];
                }
            });

            return response()->json($rewards);
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
            'reward_type' => 'required|string',
            'reward_value' => 'nullable|numeric|min:0',
            'category' => 'nullable|string',
            'award_date' => 'required|date',
            'status' => 'required|string',
            'badge' => 'nullable|string',
            'reason' => 'required|string',
            'awarded_by' => 'nullable|string',
            'points' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $reward = Reward::create([
            'employee_id' => $validated['employee_id'],
            'reward_type' => $validated['reward_type'],
            'reward_value' => $validated['reward_value'] ?? 0,
            'category' => $validated['category'] ?? null,
            'award_date' => $validated['award_date'],
            'status' => $validated['status'],
            'badge' => $validated['badge'] ?? null,
            'reason' => $validated['reason'],
            'awarded_by' => $validated['awarded_by'] ?? null,
            'points' => $validated['points'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'company_id' => 1, // Default for now
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reward awarded successfully!',
            'data' => $reward
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $reward = Reward::with('employee')->findOrFail($id);
        return response()->json($reward);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $reward = Reward::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'reward_type' => 'required|string',
            'reward_value' => 'nullable|numeric|min:0',
            'category' => 'nullable|string',
            'award_date' => 'required|date',
            'status' => 'required|string',
            'badge' => 'nullable|string',
            'reason' => 'required|string',
            'awarded_by' => 'nullable|string',
            'points' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $reward->update([
            'employee_id' => $validated['employee_id'],
            'reward_type' => $validated['reward_type'],
            'reward_value' => $validated['reward_value'] ?? 0,
            'category' => $validated['category'] ?? null,
            'award_date' => $validated['award_date'],
            'status' => $validated['status'],
            'badge' => $validated['badge'] ?? null,
            'reason' => $validated['reason'],
            'awarded_by' => $validated['awarded_by'] ?? null,
            'points' => $validated['points'] ?? 0,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reward updated successfully!',
            'data' => $reward
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $reward = Reward::findOrFail($id);
        $reward->delete();

        return response()->json([
            'success' => true,
            'message' => 'Reward record deleted successfully!'
        ]);
    }
}
