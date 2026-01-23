<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetCategory extends Model
{
    use HasFactory;

    protected $table = 'budget_categories';

    protected $fillable = [
        'parent_id',
        'code',
        'name_ar',
        'name_en',
        'description',
        'category_type',
        'level',
        'path',
        'is_active',
        'is_final',
        'account_id',
        'department_id',
        'project_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_final' => 'boolean',
        'level' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(BudgetCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(BudgetCategory::class, 'parent_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Account::class, 'account_id', 'AccID');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Assets\Department::class, 'department_id');
    }

    // Assuming Project model might exist in future or using generic
    /*
    public function project()
    {
        return $this->belongsTo(\App\Models\Project::class, 'project_id')->withDefault();
    }
    */
}
