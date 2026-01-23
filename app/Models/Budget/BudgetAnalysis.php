<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetAnalysis extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'budget_analysis';

    protected $fillable = [
        'analysis_date',
        'kpi_code',
        'kpi_name_ar',
        'kpi_name_en',
        'actual_value',
        'target_value',
        'variance_value',
        'variance_percent',
        'analysis_period',
        'analysis_notes',
    ];

    protected $casts = [
        'analysis_date' => 'date',
        'actual_value' => 'decimal:4',
        'target_value' => 'decimal:4',
        'variance_value' => 'decimal:4',
        'variance_percent' => 'decimal:2',
    ];
}
