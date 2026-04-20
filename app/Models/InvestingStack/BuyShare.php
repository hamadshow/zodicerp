<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\InvestingStack\Broker;

class BuyShare extends Model
{
    use HasFactory;

    protected $table = 'buy_shares';

    protected $guarded = ['id'];

    protected $casts = [
        'purchase_date' => 'datetime',
        'price_per_share' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'quantity' => 'integer',
        'commission' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'grand_total' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(BuyShareItem::class, 'buy_share_id');
    }

    public function currency()
    {
        return $this->belongsTo(\App\Models\Currency::class, 'currency_id');
    }

    public function broker()
    {
        return $this->belongsTo(Broker::class, 'broker_id');
    }
}
