<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserService extends BaseService
{
    public function __construct(User $user)
    {
        parent::__construct($user);
    }

    /**
     * Create user with role assignment
     */
    public function createUser(array $data): User
    {
        $data['password'] = Hash::make($data['password']);
        $user = $this->create($data);

        if (isset($data['role_id'])) {
            $user->roles()->attach($data['role_id']);
        }

        return $user;
    }

    /**
     * Update user with role management
     */
    public function updateUser(int $id, array $data): User
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user = $this->update($id, $data);

        if (isset($data['role_id'])) {
            $user->roles()->sync([$data['role_id']]);
        }

        return $user;
    }

    /**
     * Get users with roles
     */
    public function getUsersWithRoles(int $perPage = 15)
    {
        return $this->model->with('roles')->paginate($perPage);
    }

    /**
     * Assign role to user
     */
    public function assignRole(int $userId, int $roleId): bool
    {
        $user = $this->findOrFail($userId);
        $user->roles()->syncWithoutDetaching([$roleId]);
        return true;
    }

    /**
     * Remove role from user
     */
    public function removeRole(int $userId, int $roleId): bool
    {
        $user = $this->findOrFail($userId);
        $user->roles()->detach($roleId);
        return true;
    }

    /**
     * Check if user has permission
     */
    public function hasPermission(int $userId, string $permission): bool
    {
        $user = $this->findOrFail($userId);
        return $user->hasPermission($permission);
    }

    /**
     * Get user dashboard stats
     */
    public function getDashboardStats(): array
    {
        return [
            'total_users' => $this->model->count(),
            'active_users' => $this->model->where('status', 'active')->count(),
            'new_users_today' => $this->model->whereDate('created_at', today())->count(),
            'users_by_role' => $this->model->with('roles')->get()->groupBy(function($user) {
                return $user->roles->first()->name ?? 'No Role';
            })->map->count(),
        ];
    }
}