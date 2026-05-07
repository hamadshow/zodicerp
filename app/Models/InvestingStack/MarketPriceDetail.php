<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketPriceDetail extends Model
{
    use HasFactory;

    protected $table = 'market_prices_details';

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'price_date' => 'date',
        'price_timestamp' => 'datetime',
        'bid_price' => 'decimal:4',
        'ask_price' => 'decimal:4',
        'last_price' => 'decimal:4',
        'open_price' => 'decimal:4',
        'high_price' => 'decimal:4',
        'low_price' => 'decimal:4',
        'close_price' => 'decimal:4',
        'bid_volume' => 'decimal:2',
        'ask_volume' => 'decimal:2',
        'volume' => 'decimal:2',
        'change_amount' => 'decimal:4',
        'change_percent' => 'decimal:4',
    ];

    /**
     * Get the master record associated with this detail.
     */
    public function master()
    {
        return $this->belongsTo(MarketPrice::class, 'market_price_id');
    }
}
