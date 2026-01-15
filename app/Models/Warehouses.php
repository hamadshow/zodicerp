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
    ];

    /**
     * Get the branch that owns the warehouse.
     */
    public function branch()
    {
        return $this->belongsTo(BranchInfo::class, 'branch_id');
    }
}
