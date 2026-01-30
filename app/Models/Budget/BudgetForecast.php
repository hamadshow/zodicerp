<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetForecast extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'budget_forecasts';

    protected $fillable = [
        'budget_id',
        'forecast_number',
        'forecast_type',
        'revision_reason',
        'reference_budget_item_id',
        'forecast_date',
        'effective_date',
        'original_amount',
        'revised_amount',
        'difference_amount',
        'difference_percent',
        'status',
        'approved_amount',
        'approved_by',
        'approved_date',
        'created_by',
        'reviewed_by',
        'implemented_by',
        'implemented_date',
    ];

    protected $casts = [
        'forecast_date' => 'date',
        'effective_date' => 'date',
        'approved_date' => 'date',
        'implemented_date' => 'date',
        'original_amount' => 'decimal:4',
        'revised_amount' => 'decimal:4',
        'difference_amount' => 'decimal:4',
        'difference_percent' => 'decimal:2',
        'approved_amount' => 'decimal:4',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function referenceItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'reference_budget_item_id');
    }

    public function destinationItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'destination_budget_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'reviewed_by');
    }

    public function implementer(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'implemented_by');
    }
}
