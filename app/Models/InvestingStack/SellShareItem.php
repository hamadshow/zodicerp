<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SellShareItem extends Model
{
    use HasFactory;

    protected $table = 'sell_share_items';

    protected $guarded = ['id'];

    protected $casts = [
        'quantity' => 'integer',
        'price_per_share' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function sellShare()
    {
        return $this->belongsTo(SellShare::class, 'sell_share_id');
    }
}
