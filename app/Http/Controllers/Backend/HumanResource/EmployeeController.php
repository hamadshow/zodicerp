<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Http\Requests\HumanResource\StoreEmployeeRequest;
use App\Http\Requests\HumanResource\UpdateEmployeeRequest;
use App\Models\Employee;
use App\Models\Backend\HumanResource\Profession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

use App\Models\Role;

class EmployeeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:web,employee');
    }

    public function index(): Response
    {
        $nationalities = \App\Models\Nationality::where('status', 'active')->get(['id', 'name']);
        $professions = Profession::where('status', 'active')->get(['id', 'profession_name']);
        $roles = Role::where('status', 'active')->get(['id', 'name', 'slug']);
        
        return Inertia::render('Backend/02_human_resource/Employees', [
            'nationalities' => $nationalities,
            'professions' => $professions,
            'roles' => $roles
        ]);
    }

    public function getEmployees(Request $request)
    {
        $query = Employee::query()->with('roles');

        // Apply search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%");
            });
        }

        // Apply status filter
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Apply department filter
        if ($request->has('department') && $request->department) {
            $query->where('department', $request->department);
        }

        $employees = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 10));

        return response()->json($employees);
    }

    public function store(StoreEmployeeRequest $request)
    {
        $validated = $request->validated();

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $validated['avatar'] = $avatarPath;
        }

        // Create full name
        $validated['name'] = $validated['first_name'].' '.$validated['last_name'];

        // Set default role for employees if not provided
        if (! isset($validated['role'])) {
            $validated['role'] = 'employee';
        }

        // Hash password
        $validated['password'] = Hash::make($validated['password']);

        $employee = Employee::create($validated);

        // Sync roles if provided
        if ($request->has('role_ids')) {
            $employee->roles()->sync($request->role_ids);
        }

        // Update profession employee count
        if ($employee->position) {
            $this->updateProfessionEmployeeCount($employee->position);
        }

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully',
            'employee' => $employee->load('roles'),
        ]);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $oldPosition = $employee->position;
        $validated = $request->validated();

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($employee->avatar && Storage::disk('public')->exists($employee->avatar)) {
                Storage::disk('public')->delete($employee->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $validated['avatar'] = $avatarPath;
        }

        // Update full name
        $validated['name'] = $validated['first_name'].' '.$validated['last_name'];

        if (array_key_exists('password', $validated)) {
            if (! empty($validated['password'])) {
                $validated['password'] = Hash::make($validated['password']);
            } else {
                unset($validated['password']);
            }
        }

        $employee->update($validated);

        // Sync roles if provided
        if ($request->has('role_ids')) {
            $employee->roles()->sync($request->role_ids);
        }

        // Update profession employee counts
        if ($oldPosition !== $employee->position) {
            if ($oldPosition) {
                $this->updateProfessionEmployeeCount($oldPosition);
            }
            if ($employee->position) {
                $this->updateProfessionEmployeeCount($employee->position);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully',
            'employee' => $employee->load('roles'),
        ]);
    }

    public function destroy(Employee $employee)
    {
        $position = $employee->position;
        // Delete avatar if exists
        if ($employee->avatar && Storage::disk('public')->exists($employee->avatar)) {
            Storage::disk('public')->delete($employee->avatar);
        }

        $employee->delete();

        // Update profession employee count
        if ($position) {
            $this->updateProfessionEmployeeCount($position);
        }

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully',
        ]);
    }

    private function updateProfessionEmployeeCount($professionName)
    {
        $count = Employee::where('position', $professionName)->count();
        Profession::where('profession_name', $professionName)->update(['employees' => $count]);
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
            'status' => 'required|in:active,inactive,on-leave,terminated',
        ]);

        Employee::whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Employee status updated successfully',
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        // Delete avatars for employees being deleted
        $employees = Employee::whereIn('id', $validated['ids'])->get();
        $positionsToUpdate = $employees->pluck('position')->unique()->filter();

        foreach ($employees as $employee) {
            if ($employee->avatar && Storage::disk('public')->exists($employee->avatar)) {
                Storage::disk('public')->delete($employee->avatar);
            }
        }

        Employee::whereIn('id', $validated['ids'])->delete();

        // Update counts for all affected positions
        foreach ($positionsToUpdate as $position) {
            $this->updateProfessionEmployeeCount($position);
        }

        return response()->json([
            'success' => true,
            'message' => 'Employees deleted successfully',
        ]);
    }
}
