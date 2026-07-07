<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ListedCompany extends Model
{
    use HasFactory;

    protected $table = 'companies_shares';

    protected $guarded = ['id'];

    protected $casts = [
        'ipo_date' => 'date',
        'verified_at' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'roi' => 'decimal:2',
    ];

    // Relationships
    public function industry()
    {
        return $this->belongsTo(\App\Models\InvestingStack\Industry::class, 'industry_id');
    }

    public function subIndustry()
    {
        return $this->belongsTo(\App\Models\InvestingStack\SubIndustry::class, 'sub_industry_id');
    }

    public function country()
    {
        return $this->belongsTo(\App\Models\Location::class, 'country_id');
    }

    public function state()
    {
        return $this->belongsTo(\App\Models\Location::class, 'state_id');
    }

    public function city()
    {
        return $this->belongsTo(\App\Models\Location::class, 'city_id');
    }

    public function reportingCurrency()
    {
        return $this->belongsTo(\App\Models\Currency::class, 'reporting_currency_id');
    }

    public function exchange()
    {
        return $this->belongsTo(\App\Models\InvestingStack\Exchange::class, 'exchange_id');
    }

    public function marketIndices()
    {
        return $this->belongsToMany(\App\Models\InvestingStack\MarketIndex::class, 'company_market_index', 'company_id', 'market_index_id');
    }

    public function creditRating()
    {
        return $this->belongsTo(\App\Models\InvestingStack\CreditRating::class, 'credit_rating_id');
    }
}
