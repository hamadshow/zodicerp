<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_number',
        'report_name_ar',
        'report_name_en',
        'report_type',
        'budget_id',
        'department_id',
        'project_id',
        'report_date',
        'period_start',
        'period_end',
        'report_format',
        'include_details',
        'include_comments',
        'include_recommendations',
        'file_path',
        'file_size',
        'generated_file_name',
        'generated_by',
        'reviewed_by',
        'approved_by',
        'generated_at',
    ];

    protected $casts = [
        'report_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
        'include_details' => 'boolean',
        'include_comments' => 'boolean',
        'include_recommendations' => 'boolean',
        'generated_at' => 'datetime',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Assets\Department::class);
    }

    /*
    public function project()
    {
        return $this->belongsTo(\App\Models\Project::class);
    }
    */

    public function generator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'generated_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'reviewed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }
}
