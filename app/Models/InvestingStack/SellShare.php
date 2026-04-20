<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SellShare extends Model
{
    use HasFactory;

    protected $table = 'sell_shares';

    protected $guarded = ['id'];

    protected $casts = [
        'sell_date' => 'datetime',
        'price_per_share' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'quantity' => 'integer',
        'commission' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'grand_total' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(SellShareItem::class, 'sell_share_id');
    }

    public function currency()
    {
        return $this->belongsTo(\App\Models\Currency::class, 'currency_id');
    }
}
