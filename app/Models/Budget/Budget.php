<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Budget extends Model
{
    use HasFactory;

    protected $table = 'budgets';

    protected $fillable = [
        'budget_number',
        'budget_name_ar',
        'budget_name_en',
        'description',
        'budget_type',
        'fiscal_year',
        'start_date',
        'end_date',
        'scope_type',
        'department_id',
        'project_id',
        'cost_center_id',
        'branch_id',
        'currency_id',
        'exchange_rate',
        'status',
        'version',
        'is_current',
        'is_template',
        'total_revenue',
        'total_expense',
        'total_capital',
        'net_surplus_deficit',
        'variance_threshold',
        'allow_over_budget',
        'require_approval_over_budget',
        'reference_document',
        'notes',
        'created_by',
        'approved_by',
        'approved_date',
        'closed_by',
        'closed_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'approved_date' => 'date',
        'closed_date' => 'date',
        'exchange_rate' => 'decimal:6',
        'total_revenue' => 'decimal:4',
        'total_expense' => 'decimal:4',
        'total_capital' => 'decimal:4',
        'net_surplus_deficit' => 'decimal:4',
        'variance_threshold' => 'decimal:2',
        'allow_over_budget' => 'boolean',
        'require_approval_over_budget' => 'boolean',
        'is_current' => 'boolean',
        'is_template' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(BudgetItem::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Assets\Department::class, 'department_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Currency::class, 'currency_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(\App\Models\BranchInfo::class, 'branch_id'); // Assuming BranchInfo matches branches table id
    }

    /*
    public function project()
    {
        return $this->belongsTo(\App\Models\Project::class, 'project_id');
    }

    public function costCenter()
    {
        return $this->belongsTo(\App\Models\CostCenter::class, 'cost_center_id');
    }
    */
}
