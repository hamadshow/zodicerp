<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketPrice extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'price_date' => 'date',
        // 'price_time' => 'time', // Laravel doesn't have a direct 'time' cast to Carbon instance in older versions, but string is fine.
        'price_timestamp' => 'datetime',
        'is_eod' => 'boolean',
        'is_intraday' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',

        // Decimal casts to ensure they are returned as numbers/strings correctly?
        // Laravel returns decimals as strings by default to preserve precision.
        // We can cast to float/double if needed for calculation, but string is safer for display.
    ];

    public function instrument()
    {
        return $this->belongsTo(ListedCompany::class, 'instrument_id');
    }
}
