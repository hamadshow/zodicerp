<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuyShareItem extends Model
{
    use HasFactory;

    protected $table = 'buy_share_items';

    protected $guarded = ['id'];

    protected $casts = [
        'quantity' => 'integer',
        'price_per_share' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function buyShare()
    {
        return $this->belongsTo(BuyShare::class, 'buy_share_id');
    }
}
