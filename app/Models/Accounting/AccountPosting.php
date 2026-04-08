<?php

namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;

class AccountPosting extends Model
{
    protected $table = 'account_postings';

    protected $fillable = [
        'account_id',
        'company_id',
        'period_start',
        'period_end',
        'opening_debit',
        'opening_credit',
        'current_debit',
        'current_credit',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'opening_debit' => 'decimal:2',
        'opening_credit' => 'decimal:2',
        'current_debit' => 'decimal:2',
        'current_credit' => 'decimal:2',
        'ending_debit' => 'decimal:2',
        'ending_credit' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(\App\Models\Account::class, 'account_id', 'AccID');
    }
}
