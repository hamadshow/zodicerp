<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Industry extends Model
{
    use HasFactory;

    protected $table = 'industries';

    protected $fillable = [
        'industry_code',
        'gics_industry_code',
        'trbc_industry_code',
        'industry_name_ar',
        'industry_name_en',
        'description_ar',
        'description_en',
        'sector_id',
        'parent_industry_id',
        'level',
        'path',
        'capital_intensity',
        'cyclicality',
        'regulatory_environment',
        'average_profit_margin',
        'average_roa',
        'average_roe',
        'is_active',
        'display_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'level' => 'integer',
        'display_order' => 'integer',
        'average_profit_margin' => 'decimal:4',
        'average_roa' => 'decimal:4',
        'average_roe' => 'decimal:4',
    ];

    public function sector()
    {
        return $this->belongsTo(Sector::class, 'sector_id');
    }

    public function parent()
    {
        return $this->belongsTo(Industry::class, 'parent_industry_id');
    }

    public function children()
    {
        return $this->hasMany(Industry::class, 'parent_industry_id');
    }

    public function subIndustries()
    {
        return $this->hasMany(SubIndustry::class, 'industry_id');
    }
}
