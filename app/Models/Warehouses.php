<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Warehouses extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'warehouses';

    protected $fillable = [
        'warehouse_code',
        'name',
        'branch_id',
        'manager',
        'location',
        'capacity',
        'used_capacity',
        'status',
        'icon',
        'color',
        'description',
        'linked_gl_account_id',
        'company_id',
    ];

    /**
     * Get the branch that owns the warehouse.
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    /**
     * Get the GL account linked to the warehouse.
     */
    public function linkedAccount()
    {
        return $this->belongsTo(Account::class, 'linked_gl_account_id', 'AccID');
    }
}
