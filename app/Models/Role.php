<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'permissions',
        'description',
        'is_default',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'permissions' => 'array',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'role_users');
    }

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'employee_roles');
    }

    public function permissions_list()
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }
}
