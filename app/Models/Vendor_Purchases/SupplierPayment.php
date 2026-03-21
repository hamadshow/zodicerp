<?php

namespace App\Models\Vendor_Purchases;

use App\Models\BankAccount;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierPayment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'payment_number',
        'supplier_id',
        'currency_id',
        'exchange_rate',
        'payment_date',
        'payment_method',
        'amount',
        'payment_type',
        'bank_account_id',
        'check_number',
        'check_date',
        'check_due_date',
        'reference_number',
        'description',
        'status',
        'is_posted',
        'posted_at',
        'posted_by',
        'reconciled_at',
        'reconciled_by',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'check_date' => 'date',
        'check_due_date' => 'date',
        'posted_at' => 'datetime',
        'reconciled_at' => 'datetime',
        'amount' => 'decimal:2',
        'base_amount' => 'decimal:2', // Generated
        'exchange_rate' => 'decimal:6',
        'is_posted' => 'boolean',
        'supplier_id' => 'integer',
        'currency_id' => 'integer',
        'bank_account_id' => 'integer',
        'posted_by' => 'integer',
        'reconciled_by' => 'integer',
        'created_by' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function bankAccount()
    {
        // Assuming BankAccount model exists
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function allocations()
    {
        return $this->hasMany(SupplierPaymentAllocation::class, 'payment_id');
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
