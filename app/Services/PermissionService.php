<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;

class PermissionService extends BaseService
{
    public function __construct(Permission $model)
    {
        parent::__construct($model);
    }

    /**
     * Get all permissions with filters and pagination.
     */
    public function getAll(array $filters = [], int $perPage = 15, string $sortBy = 'created_at', string $sortDirection = 'desc'): LengthAwarePaginator
    {
        $query = Permission::query();

        // Apply filters
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('display_name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('description', 'like', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['group'])) {
            $query->where('group', $filters['group']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Apply sorting
        $query->orderBy($sortBy, $sortDirection);

        return $query->paginate($perPage);
    }

    /**
     * Create a new permission.
     */
    public function create(array $data): Model
    {
        return DB::transaction(function () use ($data) {
            return Permission::create($data);
        });
    }

    /**
     * Update an existing permission.
     */
    public function update(int $id, array $data): Model
    {
        $permission = $this->findOrFail($id);

        return DB::transaction(function () use ($permission, $data) {
            $permission->update($data);
            return $permission->fresh();
        });
    }

    /**
     * Delete a permission.
     */
    public function delete(int $id): bool
    {
        $permission = $this->find($id);

        if (!$permission) {
            return false;
        }

        return DB::transaction(function () use ($permission) {
            // Remove permission from all roles
            $permission->roles()->detach();
            return $permission->delete();
        });
    }

    /**
     * Get permissions grouped by category.
     */
    public function getGroupedPermissions(): array
    {
        $permissions = Permission::where('status', 'active')
                                ->orderBy('group')
                                ->orderBy('display_name')
                                ->get();

        return $permissions->groupBy('group')->toArray();
    }

    /**
     * Get permissions by group.
     */
    public function getPermissionsByGroup(string $group): Collection
    {
        return Permission::where('group', $group)
                        ->where('status', 'active')
                        ->orderBy('display_name')
                        ->get();
    }

    /**
     * Get all permission groups.
     */
    public function getPermissionGroups(): array
    {
        return Permission::where('status', 'active')
                        ->distinct()
                        ->pluck('group')
                        ->filter()
                        ->sort()
                        ->values()
                        ->toArray();
    }

    /**
     * Bulk create permissions.
     */
    public function bulkCreate(array $permissions): array
    {
        $created = [];
        DB::transaction(function () use ($permissions, &$created) {
            foreach ($permissions as $permissionData) {
                $created[] = $this->create($permissionData);
            }
        });

        return $created;
    }

    /**
     * Check if permission exists.
     */
    public function permissionExists(string $name): bool
    {
        return Permission::where('name', $name)->exists();
    }

    /**
     * Get permission by name.
     */
    public function getByName(string $name): ?Permission
    {
        return Permission::where('name', $name)->first();
    }
}