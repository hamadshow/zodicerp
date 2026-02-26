<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\HumanResource\StoreEmployeeRequest;
use App\Http\Requests\HumanResource\UpdateEmployeeRequest;

class EmployeeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index(): Response
    {
        return Inertia::render('Backend/02_human_resource/Employees');
    }

    public function getEmployees(Request $request)
    {
        $query = User::query();

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
        $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];

        // Set default role for employees if not provided
        if (!isset($validated['role'])) {
            $validated['role'] = 'employee';
        }

        // Hash password
        $validated['password'] = Hash::make($validated['password']);

        $employee = User::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully',
            'employee' => $employee
        ]);
    }

    public function show(User $employee)
    {
        return response()->json($employee);
    }

    public function update(UpdateEmployeeRequest $request, User $employee)
    {
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
        $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];

        $employee->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully',
            'employee' => $employee
        ]);
    }

    public function destroy(User $employee)
    {
        // Delete avatar if exists
        if ($employee->avatar && Storage::disk('public')->exists($employee->avatar)) {
            Storage::disk('public')->delete($employee->avatar);
        }

        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully'
        ]);
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
            'status' => 'required|in:active,inactive,on-leave,terminated',
        ]);

        User::whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Employee status updated successfully'
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        // Delete avatars for employees being deleted
        $employees = User::whereIn('id', $validated['ids'])->get();
        foreach ($employees as $employee) {
            if ($employee->avatar && Storage::disk('public')->exists($employee->avatar)) {
                Storage::disk('public')->delete($employee->avatar);
            }
        }

        User::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employees deleted successfully'
        ]);
    }
}
