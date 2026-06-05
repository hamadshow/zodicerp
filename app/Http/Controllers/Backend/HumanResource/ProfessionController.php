<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Backend\HumanResource\Profession;
use App\Models\Assets\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Exception;
use Illuminate\Support\Facades\Log;

class ProfessionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Profession::orderBy('sort_order', 'asc');

        if ($request->has('department_id') && $request->department_id) {
            $query->where('category', $request->department_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $professions = $query->get();

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json($professions);
        }

        $departments = Department::where('is_active', true)->select('id', 'name_en', 'name_ar')->get();
        
        return Inertia::render('Backend/02_human_resource/Profession', [
            'professions' => $professions,
            'departments' => $departments
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_id' => 'required|integer',
            'profession_name' => 'required|string|max:255',
            'profession_code' => 'required|string|max:100|unique:professions,profession_code',
            'category' => 'nullable|string|max:150',
            'description' => 'nullable|string',
            'min_salary' => 'nullable|numeric|min:0',
            'max_salary' => 'nullable|numeric|min:0',
            'required_experience' => 'nullable|integer|min:0',
            'education_level' => 'nullable|in:High School,Diploma,Bachelor,Master,PhD',
            'key_skills' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            Profession::create($validated);
            return redirect()->back()->with('success', 'Profession created successfully');
        } catch (Exception $e) {
            Log::error('Error creating profession: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create profession');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Profession $profession)
    {
        $validated = $request->validate([
            'company_id' => 'required|integer',
            'profession_name' => 'required|string|max:255',
            'profession_code' => 'required|string|max:100|unique:professions,profession_code,' . $profession->id,
            'category' => 'nullable|string|max:150',
            'description' => 'nullable|string',
            'min_salary' => 'nullable|numeric|min:0',
            'max_salary' => 'nullable|numeric|min:0',
            'required_experience' => 'nullable|integer|min:0',
            'education_level' => 'nullable|in:High School,Diploma,Bachelor,Master,PhD',
            'key_skills' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            $profession->update($validated);
            return redirect()->back()->with('success', 'Profession updated successfully');
        } catch (Exception $e) {
            Log::error('Error updating profession: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update profession');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Profession $profession)
    {
        try {
            $profession->delete();
            return redirect()->back()->with('success', 'Profession deleted successfully');
        } catch (Exception $e) {
            Log::error('Error deleting profession: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete profession');
        }
    }
}
