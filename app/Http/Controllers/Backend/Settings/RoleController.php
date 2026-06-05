<?php

namespace App\Http\Controllers\Backend\Settings;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

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
            'Employees' => ['view', 'create', 'edit', 'delete'],
            'Departments' => ['view', 'create', 'edit', 'delete'],
            'Attendance' => ['view', 'create', 'edit', 'delete'],
            'Payroll' => ['view', 'create', 'edit', 'delete'],
        ],
        'Assets' => [
            'Assets' => ['view', 'create', 'edit', 'delete'],
            'Maintenance' => ['view', 'create', 'edit', 'delete'],
        ],
        'Purchases' => [
            'Suppliers' => ['view', 'create', 'edit', 'delete'],
            'Purchase Orders' => ['view', 'create', 'edit', 'delete'],
            'Bills' => ['view', 'create', 'edit', 'delete'],
        ],
        'Sales' => [
            'Quotations' => ['view', 'create', 'edit', 'delete'],
            'Invoices' => ['view', 'create', 'edit', 'delete'],
        ],
        'Location' => [
            'Countries' => ['create', 'edit', 'delete'],
            'Cities' => ['create', 'edit', 'delete'],
        ],
        'Settings' => [
            'General Settings' => ['view', 'edit'],
            'Roles' => ['view', 'create', 'edit', 'delete'],
            'Users' => ['view', 'create', 'edit', 'delete'],
            'Currencies' => ['view', 'create', 'edit', 'delete'],
        ],
        'Inventory' => [
            'Inventory' => ['view', 'create', 'edit', 'delete'],
        ],
        'Reports' => [
            'Reports' => ['view', 'export'],
        ],
        'Dashboard' => [
            'Dashboard' => ['view'],
        ],
    ];

    public function index(Request $request)
    {
        $query = Role::query()
            ->with(['creator:id,username', 'updater:id,username'])
            ->withCount(['users', 'employees']);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            if ($request->type === 'default') {
                $query->where('is_default', true);
            } elseif ($request->type === 'custom') {
                $query->where('is_default', false);
            }
        }

        $roles = $query->latest()->get()->map(function ($role) {
            $permissionCount = 0;
            $moduleCount = 0;
            if (is_array($role->permissions)) {
                $moduleCount = count($role->permissions);
                foreach ($role->permissions as $module => $resources) {
                    foreach ($resources as $resource => $actions) {
                        $permissionCount += count($actions);
                    }
                }
            }

            return [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'description' => $role->description,
                'is_default' => $role->is_default,
                'status' => $role->status ?? 'active',
                'permissions' => $role->permissions,
                'permission_count' => $permissionCount,
                'module_count' => $moduleCount,
                'users_count' => $role->users_count,
                'employees_count' => $role->employees_count,
                'created_at' => $role->created_at->format('Y-m-d'),
                'updated_at' => $role->updated_at->format('Y-m-d'),
                'created_by' => $role->creator ? ['name' => $role->creator->name] : null,
            ];
        });

        $stats = [
            'total_roles' => Role::count(),
            'total_permissions' => Permission::count(),
            'default_roles' => Role::where('is_default', true)->count(),
            'custom_roles' => Role::where('is_default', false)->count(),
            'active_roles' => Role::where('status', 'active')->count(),
        ];

        return inertia('Backend/Settings/RolesAndPermissions', [
            'roles' => $roles,
            'availablePermissions' => self::PERMISSIONS,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120|unique:roles,name',
            'description' => 'nullable|string|max:400',
            'is_default' => 'boolean',
            'status' => 'string|in:active,inactive',
            'permissions' => 'nullable|array',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        if ($validated['is_default']) {
            Role::where('is_default', true)->update(['is_default' => false]);
        }

        Role::create($validated);

        return redirect()->back()->with('success', 'Role created successfully');
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:400',
            'is_default' => 'boolean',
            'status' => 'string|in:active,inactive',
            'permissions' => 'nullable|array',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $validated['updated_by'] = auth()->id();

        // Prevent editing protected roles
        if ($role->slug === 'admin' && $validated['slug'] !== 'admin') {
            return redirect()->back()->with('error', 'Cannot change Admin role slug');
        }

        if ($validated['is_default']) {
            Role::where('id', '!=', $role->id)->where('is_default', true)->update(['is_default' => false]);
        }

        $role->update($validated);

        return redirect()->back()->with('success', 'Role updated successfully');
    }

    public function destroy(Role $role)
    {
        // Prevent privilege escalation/security
        if ($role->slug === 'admin' || $role->is_default) {
            return redirect()->back()->with('error', 'Cannot delete default or admin roles');
        }

        // Prevent deletion when assigned to employees
        if ($role->employees()->exists() || $role->users()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete role assigned to users or employees');
        }

        $role->delete();

        return redirect()->back()->with('success', 'Role deleted successfully');
    }

    public function duplicate(Role $role)
    {
        $newRole = $role->replicate();
        $newRole->name = $role->name . ' (Copy)';
        $newRole->slug = Str::slug($newRole->name);
        $newRole->is_default = false;
        $newRole->created_by = auth()->id();
        $newRole->updated_by = auth()->id();
        $newRole->save();

        return redirect()->back()->with('success', 'Role duplicated successfully');
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        $roles = Role::whereIn('id', $ids)->get();
        
        $deletedCount = 0;
        foreach ($roles as $role) {
            if ($role->slug !== 'admin' && !$role->is_default && !$role->employees()->exists() && !$role->users()->exists()) {
                $role->delete();
                $deletedCount++;
            }
        }

        return redirect()->back()->with('success', "$deletedCount roles deleted successfully");
    }
}
