<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Permission;

class RoleService extends BaseService
{
    public function __construct(Role $role)
    {
        parent::__construct($role);
    }

    /**
     * Create role with permissions
     */
    public function createRole(array $data): Role
    {
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);

        $role = $this->create($data);

        if (!empty($permissions)) {
            $this->syncPermissions($role, $permissions);
        }

        return $role;
    }

    /**
     * Update role with permissions
     */
    public function updateRole(int $id, array $data): Role
    {
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);

        $role = $this->update($id, $data);

        if (isset($data['permissions'])) {
            $this->syncPermissions($role, $permissions);
        }

        return $role;
    }

    /**
     * Sync permissions for role
     */
    public function syncPermissions(Role $role, array $permissionIds): void
    {
        $role->permissions()->sync($permissionIds);
    }

    /**
     * Assign permission to role
     */
    public function assignPermission(int $roleId, int $permissionId): bool
    {
        $role = $this->findOrFail($roleId);
        $role->permissions()->syncWithoutDetaching([$permissionId]);
        return true;
    }

    /**
     * Remove permission from role
     */
    public function removePermission(int $roleId, int $permissionId): bool
    {
        $role = $this->findOrFail($roleId);
        $role->permissions()->detach($permissionId);
        return true;
    }

    /**
     * Get roles with permissions
     */
    public function getRolesWithPermissions(int $perPage = 15)
    {
        return $this->model->with('permissions')->paginate($perPage);
    }

    /**
     * Get role by name
     */
    public function getRoleByName(string $name): ?Role
    {
        return $this->model->where('name', $name)->first();
    }

    /**
     * Create default roles
     */
    public function createDefaultRoles(): void
    {
        $roles = [
            [
                'name' => 'super-admin',
                'display_name' => 'Super Administrator',
                'description' => 'Full system access',
                'permissions' => [] // All permissions
            ],
            [
                'name' => 'admin',
                'display_name' => 'Administrator',
                'description' => 'Administrative access',
                'permissions' => []
            ],
            [
                'name' => 'manager',
                'display_name' => 'Manager',
                'description' => 'Management access',
                'permissions' => []
            ],
            [
                'name' => 'user',
                'display_name' => 'User',
                'description' => 'Basic user access',
                'permissions' => []
            ]
        ];

        foreach ($roles as $roleData) {
            $this->model->firstOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );
        }
    }
}