<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Model;
use App\Models\Currency;
use App\Models\User;

class CustomerStatement extends Model
{
    protected $table = 'customer_statements';

    protected $fillable = [
        'statement_number',
        'customer_id',
        'currency_id',
        'statement_date',
        'period_from',
        'period_to',
        'opening_balance',
        'total_invoices',
        'total_payments',
        'total_credit_notes',
        'total_debit_notes',
        'total_adjustments',
        'closing_balance', // Generated column
        'base_closing_balance',
        'notes',
        'is_sent',
        'sent_date',
        'sent_method',
        'created_by'
    ];

    protected $casts = [
        'statement_date' => 'date',
        'period_from' => 'date',
        'period_to' => 'date',
        'opening_balance' => 'decimal:2',
        'total_invoices' => 'decimal:2',
        'total_payments' => 'decimal:2',
        'total_credit_notes' => 'decimal:2',
        'total_debit_notes' => 'decimal:2',
        'total_adjustments' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'base_closing_balance' => 'decimal:2',
        'is_sent' => 'boolean',
        'sent_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'created_by' => 'integer'
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

    public function details()
    {
        return $this->hasMany(CustomerStatementDetail::class, 'statement_id');
    }
}
