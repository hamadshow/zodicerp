<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ListedCompany extends Model
{
    use HasFactory;

    protected $table = 'companies';

    protected $guarded = ['id'];

    protected $casts = [
        'is_public' => 'boolean',
        'is_vat_registered' => 'boolean',
        'is_customer' => 'boolean',
        'is_vendor' => 'boolean',
        'is_competitor' => 'boolean',
        'ipo_date' => 'date',
        'verified_at' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function sector()
    {
        return $this->belongsTo(\App\Models\InvestingStack\Sector::class, 'sector_id'); // Assuming Sector model will be here
    }

    public function industry()
    {
        return $this->belongsTo(\App\Models\InvestingStack\Industry::class, 'industry_id'); // Assuming Industry model
    }

    public function country()
    {
        return $this->belongsTo(\App\Models\Country::class, 'country_id');
    }

    public function reportingCurrency()
    {
        return $this->belongsTo(\App\Models\Currency::class, 'reporting_currency_id');
    }
}
