<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Currency;
use App\Models\User;

class LandedCost extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference_number',
        'allocation_method',
        'status',
        'total_amount',
        'currency_id',
        'exchange_rate',
        'allocated_amount',
        // 'remaining_to_allocate', // Generated column
        'notes',
        'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'allocated_amount' => 'decimal:2',
        'remaining_to_allocate' => 'decimal:2',
    ];

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function details()
    {
        return $this->hasMany(LandedCostDetail::class, 'landed_cost_id');
    }

    public function allocations()
    {
        return $this->hasMany(LandedCostAllocation::class, 'landed_cost_id');
    }
}
