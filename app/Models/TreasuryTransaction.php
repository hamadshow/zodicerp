<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TreasuryTransaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'legacy_source_table',
        'legacy_id',
        'legacy_code',
        'transaction_no',
        'transaction_type',
        'source_account_type',
        'source_account_id',
        'destination_account_type',
        'destination_account_id',
        'related_invoice_id',
        'related_invoice_type',
        'counterparty_type',
        'counterparty_id',
        'amount',
        'currency',
        'exchange_rate',
        'reference',
        'notes',
        'transaction_date',
        'status',
        'created_by',
        'company_id',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
    ];

    public function sourceAccount()
    {
        return $this->morphTo('source_account', 'source_account_type', 'source_account_id');
    }

    public function destinationAccount()
    {
        return $this->morphTo('destination_account', 'destination_account_type', 'destination_account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
