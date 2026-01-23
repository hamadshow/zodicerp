<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetMonitoring extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'budget_monitoring';

    protected $fillable = [
        'budget_id',
        'budget_item_id',
        'monitoring_date',
        'actual_amount',
        'committed_amount',
        'encumbered_amount',
        'available_amount',
        'period_type',
        'period_month',
        'period_quarter',
        'period_year',
        'variance_amount',
        'variance_percent',
        'variance_status',
        'threshold_breached',
        'alert_level',
        'comments',
        'action_required',
        'follow_up_date',
        'monitored_by',
        'acknowledged_by',
        'acknowledged_date',
    ];

    protected $casts = [
        'monitoring_date' => 'date',
        'follow_up_date' => 'date',
        'acknowledged_date' => 'date',
        'actual_amount' => 'decimal:4',
        'committed_amount' => 'decimal:4',
        'encumbered_amount' => 'decimal:4',
        'available_amount' => 'decimal:4',
        'variance_amount' => 'decimal:4',
        'variance_percent' => 'decimal:2',
        'threshold_breached' => 'boolean',
        'period_month' => 'integer',
        'period_quarter' => 'integer',
        'period_year' => 'integer',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class);
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'monitored_by');
    }

    public function acknowledger(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'acknowledged_by');
    }
}
