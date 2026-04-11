<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

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
}
