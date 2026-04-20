<?php

namespace App\Models\InvestingStack;

use App\Models\Currency;
use App\Models\InvestingStack\Broker;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $table = 'investing_wallet_transactions';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'transaction_date' => 'datetime',
    ];

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function broker()
    {
        return $this->belongsTo(Broker::class, 'broker_id');
    }
}
