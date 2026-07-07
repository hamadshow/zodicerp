<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Reward;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RewardController extends Controller
{
    public function index()
    {
        $rewards = Reward::with('employee:id,name,position')->latest()->get();
        $employees = Employee::select('id', 'name', 'position', 'department')->get();

        return Inertia::render('Backend/02_human_resource/Reward', [
            'rewards' => $rewards,
            'employees' => $employees
        ]);
    }

    public function create()
    {
        return redirect()->route('admin.rewards.index', [
            'country' => request()->segment(1),
            'lang' => request()->segment(2)
        ]);
    }

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
            'company_id' => 'nullable|exists:companies,id',
        ]);

        Reward::create($validated + ['company_id' => 1]);

        return redirect()->route('admin.rewards.index', [
            'country' => $request->segment(1),
            'lang' => $request->segment(2)
        ])->with('success', 'Reward awarded successfully!');
    }

    public function edit(Reward $reward)
    {
        return redirect()->route('admin.rewards.index', [
            'country' => request()->segment(1),
            'lang' => request()->segment(2)
        ]);
    }

    public function update(Request $request, Reward $reward)
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

        $reward->update($validated);

        return redirect()->route('admin.rewards.index', [
            'country' => $request->segment(1),
            'lang' => $request->segment(2)
        ])->with('success', 'Reward updated successfully!');
    }

    public function destroy(Reward $reward)
    {
        $reward->delete();
        return back()->with('success', 'Reward deleted successfully!');
    }
}
