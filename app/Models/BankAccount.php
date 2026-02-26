<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BankAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'bank_id',
        'account_name',
        'account_number',
        'iban',
        'currency',
        'opening_balance',
        'current_balance',
        'gl_account_id',
        'is_default',
        'status',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'is_default' => 'boolean',
    ];

    public function bank()
    {
        return $this->belongsTo(Bank::class);
    }

    public function glAccount()
    {
        return $this->belongsTo(Account::class, 'gl_account_id', 'AccID');
    }

    public function currencyInfo()
    {
        return $this->belongsTo(Currency::class, 'currency', 'id');
    }

    public function payments()
    {
        return $this->hasMany(BankPayment::class);
    }

    public function receipts()
    {
        return $this->hasMany(BankReceipt::class);
    }
}
