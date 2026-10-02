<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Assets\Department;
use App\Models\Employee;
use App\Services\CompanyContext;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Support\Facades\Log;

class DepartmentController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index()
    {
        $companyId = $this->companyContext->id();
        $departments = Department::query()
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->with('manager:id,name')
            ->get();
        $employees = Employee::query()
            ->where('company_id', $companyId)
            ->select('id', 'name')
            ->get();

        return Inertia::render('Backend/02_human_resource/Departments', [
            'departments' => $departments,
            'employees' => $employees
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:employees,id',
            'is_active' => 'boolean',
        ]);

        try {
            Department::create($validated + ['company_id' => $this->companyContext->id()]);
            return redirect()->back()->with('success', 'Department created successfully');
        } catch (Exception $e) {
            Log::error('Error creating department: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create department');
        }
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:employees,id',
            'is_active' => 'boolean',
        ]);

        try {
            // Ownership never changes on update; never trust client company_id.
            unset($validated['company_id']);
            $department->update($validated);
            return redirect()->back()->with('success', 'Department updated successfully');
        } catch (Exception $e) {
            Log::error('Error updating department: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update department');
        }
    }

    public function destroy(Department $department)
    {
        try {
            $department->delete();
            return redirect()->back()->with('success', 'Department deleted successfully');
        } catch (Exception $e) {
            Log::error('Error deleting department: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete department');
        }
    }
}
