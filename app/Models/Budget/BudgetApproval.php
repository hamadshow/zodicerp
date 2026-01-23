<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetApproval extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'budget_id',
        'approval_type',
        'reference_id',
        'approval_stage',
        'total_stages',
        'sequence_number',
        'approver_id',
        'approval_date',
        'approval_status',
        'approval_notes',
        'minimum_amount',
        'maximum_amount',
        'due_date',
        'is_mandatory',
        'is_completed',
    ];

    protected $casts = [
        'approval_date' => 'date',
        'due_date' => 'date',
        'minimum_amount' => 'decimal:4',
        'maximum_amount' => 'decimal:4',
        'is_mandatory' => 'boolean',
        'is_completed' => 'boolean',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approver_id');
    }
}
