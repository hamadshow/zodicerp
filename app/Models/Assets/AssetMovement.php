<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Warehouses;
use App\Models\User;

class AssetMovement extends Model
{
    use HasFactory;

    protected $table = 'asset_movements';

    protected $fillable = [
        'asset_id',
        'movement_type',
        'movement_date',
        'from_warehouse_id',
        'from_department_id',
        'from_employee_id',
        'from_location',
        'to_warehouse_id',
        'to_department_id',
        'to_employee_id',
        'to_location',
        'quantity',
        'reference_number',
        'reason',
        'notes',
        'status',
        'requested_by',
        'approved_by',
        'received_by',
    ];

    protected $casts = [
        'movement_date' => 'date',
        'quantity' => 'decimal:3',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    // From Relationships
    public function fromWarehouse()
    {
        return $this->belongsTo(Warehouses::class, 'from_warehouse_id');
    }

    public function fromDepartment()
    {
        return $this->belongsTo(Department::class, 'from_department_id');
    }

    public function fromEmployee()
    {
        return $this->belongsTo(User::class, 'from_employee_id');
    }

    // To Relationships
    public function toWarehouse()
    {
        return $this->belongsTo(Warehouses::class, 'to_warehouse_id');
    }

    public function toDepartment()
    {
        return $this->belongsTo(Department::class, 'to_department_id');
    }

    public function toEmployee()
    {
        return $this->belongsTo(User::class, 'to_employee_id');
    }

    // System User Relationships
    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
