<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetAllocationLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'allocation_date',
        'from_source',
        'to_destination',
        'allocated_amount',
        'allocation_method',
        'allocation_reason',
        'created_by',
    ];

    protected $casts = [
        'allocation_date' => 'date',
        'allocated_amount' => 'decimal:4',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }
}
