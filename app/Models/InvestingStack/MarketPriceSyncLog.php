<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketPriceSyncLog extends Model
{
    use HasFactory;

    protected $table = 'market_price_sync_logs';

    protected $fillable = [
        'symbol',
        'status',
        'message',
        'response_data',
    ];

    protected $casts = [
        'response_data' => 'array',
    ];

    public $timestamps = false; // Using created_at from migration
}
