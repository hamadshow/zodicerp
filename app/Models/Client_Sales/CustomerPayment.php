<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Model;
use App\Models\Currency;
use App\Models\BankAccount;
use App\Models\User;

class CustomerPayment extends Model
{
    protected $table = 'customer_payments';

    protected $fillable = [
        'payment_number',
        'customer_id',
        'currency_id',
        'exchange_rate',
        'payment_date',
        'payment_method',
        'amount',
        'base_amount', // Generated column, but often good to include if not guarded
        'payment_type',
        'bank_account_id',
        'check_number',
        'check_date',
        'check_due_date',
        'credit_card_last_four',
        'credit_card_type',
        'transaction_id',
        'reference_number',
        'description',
        'status',
        'is_posted',
        'posted_at',
        'posted_by',
        'reconciled_at',
        'reconciled_by',
        'customer_notes',
        'internal_notes',
        'created_by'
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'payment_date' => 'date',
        'amount' => 'decimal:2',
        'base_amount' => 'decimal:2',
        'check_date' => 'date',
        'check_due_date' => 'date',
        'is_posted' => 'boolean',
        'posted_at' => 'datetime',
        'reconciled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'created_by' => 'integer',
        'posted_by' => 'integer',
        'reconciled_by' => 'integer'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function allocations()
    {
        return $this->hasMany(CustomerPaymentAllocation::class, 'payment_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function reconciler()
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
