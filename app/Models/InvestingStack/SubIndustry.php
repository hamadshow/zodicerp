<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubIndustry extends Model
{
    use HasFactory;

    protected $table = 'sub_industries';

    protected $fillable = [
        'sub_industry_code',
        'gics_sub_industry_code',
        'trbc_sub_industry_code',
        'sub_industry_name_ar',
        'sub_industry_name_en',
        'description_ar',
        'description_en',
        'industry_id',
        'parent_sub_industry_id',
        'level',
        'path',
        'growth_rate',
        'market_size',
        'competitive_intensity',
        'technology_intensity',
        'average_market_share_concentration',
        'average_innovation_rate',
        'average_customer_switching_costs',
        'is_active',
        'display_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'level' => 'integer',
        'display_order' => 'integer',
        'growth_rate' => 'decimal:4',
        'market_size' => 'decimal:4',
        'average_market_share_concentration' => 'decimal:4',
        'average_innovation_rate' => 'decimal:4',
    ];

    public function industry()
    {
        return $this->belongsTo(Industry::class, 'industry_id');
    }

    public function parent()
    {
        return $this->belongsTo(SubIndustry::class, 'parent_sub_industry_id');
    }

    public function children()
    {
        return $this->hasMany(SubIndustry::class, 'parent_sub_industry_id');
    }
}
