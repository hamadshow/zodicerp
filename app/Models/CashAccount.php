<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

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

    public function receipts()
    {
        return $this->hasMany(TreasuryTransaction::class, 'destination_account_id')
            ->where('destination_account_type', 'cash')
            ->where('transaction_type', 'deposit');
    }

    public function payments()
    {
        return $this->hasMany(TreasuryTransaction::class, 'source_account_id')
            ->where('source_account_type', 'cash')
            ->where('transaction_type', 'withdrawal');
    }

    public function transfersTo()
    {
        return $this->hasMany(TreasuryTransaction::class, 'destination_account_id')
            ->where('destination_account_type', 'cash')
            ->where('transaction_type', 'transfer');
    }

    public function transfersFrom()
    {
        return $this->hasMany(TreasuryTransaction::class, 'source_account_id')
            ->where('source_account_type', 'cash')
            ->where('transaction_type', 'transfer');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function transactions()
    {
        return TreasuryTransaction::where(function ($q) {
            $q->where(function ($sq) {
                $sq->where('source_account_type', 'cash')
                    ->where('source_account_id', $this->id);
            })->orWhere(function ($sq) {
                $sq->where('destination_account_type', 'cash')
                    ->where('destination_account_id', $this->id);
            });
        });
    }
}
