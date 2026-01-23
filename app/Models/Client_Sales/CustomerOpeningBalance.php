<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Currency;
use App\Models\User;

class CustomerOpeningBalance extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'financial_year',
        'opening_date',
        'currency_id',
        'exchange_rate',
        'debit_amount',
        'credit_amount',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'opening_date' => 'date',
        'exchange_rate' => 'decimal:6',
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'base_debit_amount' => 'decimal:2',
        'base_credit_amount' => 'decimal:2',
        'net_balance' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }
    
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
