<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    use HasFactory;

    protected $table = 'admins';
    protected $fillable = [
        'id', 'name', 'permission_roles_id', 'email', 'username', 'password', 'created_at', 'updated_at', 'added_by', 'updated_by', 'active', 'com_code', 'date'
    ];
}
