<?php

namespace App\Http\Controllers\Backend\Settings;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RoleController extends Controller
{
    /**
     * Define the available permissions in the system.
     */
    const PERMISSIONS = [
        'CMS' => [
            'Media' => ['create', 'delete'],
            'Pages' => ['create', 'edit', 'delete'],
            'Blog' => ['create', 'edit', 'delete'],
        ],
        'E-commerce' => [
            'Products' => ['create', 'edit', 'delete'],
            'Product Categories' => ['create', 'edit', 'delete'],
            'Brands' => ['create', 'edit', 'delete'],
            'Orders' => ['view', 'edit', 'delete'],
            'Customers' => ['create', 'edit', 'delete'],
            'Flash Sales' => ['create', 'edit', 'delete'],
            'Coupons' => ['create', 'edit', 'delete'],
        ],
        'Human Resources' => [
            'Employees' => ['create', 'edit', 'delete'],
            'Departments' => ['create', 'edit', 'delete'],
            'Attendance' => ['view', 'edit'],
            'Payroll' => ['view', 'process'],
        ],
        'Assets' => [
            'Assets' => ['create', 'edit', 'delete'],
            'Maintenance' => ['create', 'edit'],
        ],
        'Purchases' => [
            'Suppliers' => ['create', 'edit', 'delete'],
            'Purchase Orders' => ['create', 'edit', 'delete'],
            'Bills' => ['create', 'edit', 'delete'],
        ],
        'Sales' => [
            'Quotations' => ['create', 'edit', 'delete'],
            'Invoices' => ['create', 'edit', 'delete'],
        ],
        'Location' => [
            'Countries' => ['create', 'edit', 'delete'],
            'Cities' => ['create', 'edit', 'delete'],
        ],
        'Settings' => [
            'General Settings' => ['view', 'edit'],
            'Roles' => ['create', 'edit', 'delete'],
            'Users' => ['create', 'edit', 'delete'],
            'Currencies' => ['create', 'edit', 'delete'],
        ],
    ];

    public function index()
    {
        $roles = Role::query()
            ->with(['creator:id,name', 'updater:id,name'])
            ->latest()
            ->get()
            ->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $role->description,
                    'is_default' => $role->is_default,
                    'permissions' => $role->permissions,
                    'created_at' => $role->created_at->format('Y-m-d'),
                    'created_by' => $role->creator ? ['name' => $role->creator->name] : null,
                ];
            });

        return Inertia::render('Backend/Settings/RolesAndPermissions', [
            'roles' => $roles,
            'availablePermissions' => self::PERMISSIONS,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:400',
            'is_default' => 'boolean',
            'permissions' => 'nullable|array',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $validated['created_by'] = auth()->id() ?? 1; // Fallback for dev
        $validated['updated_by'] = auth()->id() ?? 1;

        if ($validated['is_default']) {
            Role::where('is_default', true)->update(['is_default' => false]);
        }

        Role::create($validated);

        return redirect()->back()->with('success', 'Role created successfully');
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:400',
            'is_default' => 'boolean',
            'permissions' => 'nullable|array',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $validated['updated_by'] = auth()->id() ?? 1;

        if ($validated['is_default']) {
            Role::where('id', '!=', $role->id)->where('is_default', true)->update(['is_default' => false]);
        }

        $role->update($validated);

        return redirect()->back()->with('success', 'Role updated successfully');
    }

    public function destroy(Role $role)
    {
        // Prevent deleting default role or admin role if needed
        if ($role->slug === 'admin') {
            return redirect()->back()->with('error', 'Cannot delete Admin role');
        }

        $role->delete();

        return redirect()->back()->with('success', 'Role deleted successfully');
    }
}
