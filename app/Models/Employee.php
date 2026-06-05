<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Employee extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'role',
        'phone',
        'department',
        'position',
        'hire_date',
        'salary',
        'nationality',
        'status',
        'address',
        'notes',
        'avatar',
        'email_verified_at',
        'password',
        'remember_token',
        'company_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'hire_date' => 'date',
        'salary' => 'decimal:2',
        'email_verified_at' => 'datetime',
    ];

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'employee_roles');
    }

    public function hasRole($role)
    {
        if ($this->role === $role) {
            return true;
        }
        return $this->roles->contains('slug', $role);
    }

    public function hasPermission($permission)
    {
        // First check roles relationship
        foreach ($this->roles as $role) {
            if (is_array($role->permissions) && $this->checkPermissionInArray($permission, $role->permissions)) {
                return true;
            }
        }

        return false;
    }

    private function checkPermissionInArray($permission, $permissionsArray)
    {
        // The permissions array structure: { group: { resource: [actions] } }
        // Permission string format: "resource.action" (e.g., "employees.view")
        if (str_contains($permission, '.')) {
            [$targetResource, $targetAction] = explode('.', strtolower($permission));
            
            foreach ($permissionsArray as $group => $resources) {
                foreach ($resources as $resource => $actions) {
                    $normalizedResource = str_replace(' ', '_', strtolower($resource));
                    if ($normalizedResource === $targetResource) {
                        foreach ($actions as $action) {
                            if (strtolower($action) === $targetAction) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
}
