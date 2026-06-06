<?php

namespace App\Models;

use App\Models\Accounting\Account;
use App\Models\Accounting\AccountPosting;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @deprecated Use BankAccount model with account_type='cash' instead.
 * This model is kept for historical reference only and should not be used in new code.
 */
class CashAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'cash_accounts';

    protected $fillable = [
        'name',
        'code',
        'currency_id',
        'opening_balance',
        'current_balance',
        'gl_account_id',
        'is_active',
    ];

    public function glAccount()
    {
        return $this->belongsTo(Account::class, 'gl_account_id', 'AccID');
    }

    public function currencyInfo()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function receipts()
    {
        return $this->hasMany(TreasuryTransaction::class, 'destination_account_id')
            ->where('destination_account_type', 'cash');
    }

    public function payments()
    {
        return $this->hasMany(TreasuryTransaction::class, 'source_account_id')
            ->where('source_account_type', 'cash');
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

    /**
     * Accessor for account_code to handle cases where the DB column might be named 'code'.
     */
    public function getAccountCodeAttribute($value)
    {
        return $value ?? $this->code ?? null;
    }
}
