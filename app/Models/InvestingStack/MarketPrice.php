<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Company;

class MarketPrice extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'is_eod' => 'boolean',
        'is_intraday' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * Get the instrument associated with the price.
     */
    public function instrument()
    {
        return $this->belongsTo(ListedCompany::class, 'instrument_id');
    }

    /**
     * Get the company (tenant) associated with this record.
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    /**
     * Get the detailed price records (time-series).
     */
    public function details()
    {
        return $this->hasMany(MarketPriceDetail::class, 'market_price_id');
    }

    /**
     * Scope a query to only include EOD prices.
     */
    public function scopeEod($query)
    {
        return $query->where('is_eod', true);
    }

    /**
     * Scope a query to only include intraday prices.
     */
    public function scopeIntraday($query)
    {
        return $query->where('is_intraday', true);
    }
}
