<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTransfer extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'budget_transfers';

    protected $fillable = [
        'transfer_number',
        'transfer_date',
        'from_budget_id',
        'from_budget_item_id',
        'from_amount',
        'to_budget_id',
        'to_budget_item_id',
        'to_amount',
        'transfer_type',
        'reason',
        'justification',
        'reference_document',
        'notes',
        'status',
        'requested_by',
        'approved_by',
        'approved_date',
        'processed_by',
        'processed_date',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'approved_date' => 'date',
        'processed_date' => 'date',
        'from_amount' => 'decimal:4',
        'to_amount' => 'decimal:4',
    ];

    public function fromBudget(): BelongsTo
    {
        return $this->belongsTo(Budget::class, 'from_budget_id');
    }

    public function fromBudgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'from_budget_item_id');
    }

    public function toBudget(): BelongsTo
    {
        return $this->belongsTo(Budget::class, 'to_budget_id');
    }

    public function toBudgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'to_budget_item_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'processed_by');
    }
}
