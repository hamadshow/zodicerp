<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'template_code',
        'template_name_ar',
        'template_name_en',
        'description',
        'template_type',
        'industry_type',
        'category_structure',
        'default_percentages',
        'calculation_rules',
        'documentation_path',
        'sample_file_path',
        'is_active',
        'is_system_template',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'category_structure' => 'array',
        'default_percentages' => 'array',
        'calculation_rules' => 'array',
        'is_active' => 'boolean',
        'is_system_template' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function updator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'updated_by');
    }
}
