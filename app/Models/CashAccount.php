<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'account_code',
        'name',
        'type',
        'bank_id',
        'currency',
        'gl_account_id',
        'opening_balance',
        'current_balance',
        'status',
        'is_default',
        'created_by',
        'updated_by',
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

    public function currencyInfo()
    {
        return $this->belongsTo(Currency::class, 'currency', 'id');
    }

    public function glAccount()
    {
        return $this->belongsTo(Account::class, 'gl_account_id', 'AccID');
    }

    public function payments()
    {
        return $this->hasMany(CashPayment::class, 'account_id');
    }

    public function receipts()
    {
        return $this->hasMany(CashReceipt::class, 'account_id');
    }

    public function transfersFrom()
    {
        return $this->hasMany(Transfer::class, 'from_account_id');
    }

    public function transfersTo()
    {
        return $this->hasMany(Transfer::class, 'to_account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
