<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Broker extends Model
{
    use HasFactory;

    protected $table = 'brokers';

    protected $guarded = ['id'];

    protected $casts = [
        'is_regulated' => 'boolean',
        'is_preferred' => 'boolean',
        'is_approved' => 'boolean',
        'regulation_expiry' => 'date',
        'approval_date' => 'date',
        'last_review_date' => 'date',
        'licenses' => 'array',
        'exchanges_membership' => 'array',
        'commission_structure' => 'array',
        'fee_structure' => 'array',
        'margin_requirements' => 'array',
        'supported_instruments' => 'array',
        'trading_platforms' => 'array',
        'deposit_bank_accounts' => 'array',
        'withdrawal_methods' => 'array',
        'coverage_countries' => 'array',
        'supported_languages' => 'array',
        'customer_support_hours' => 'array',
        'minimum_deposit' => 'decimal:4',
        'minimum_trade_size' => 'decimal:4',
        'customer_satisfaction_score' => 'decimal:2',
    ];

    public function country()
    {
        return $this->belongsTo(\App\Models\Country::class);
    }

    public function state()
    {
        return $this->belongsTo(\App\Models\State::class);
    }

    public function city()
    {
        return $this->belongsTo(\App\Models\City::class);
    }
}
