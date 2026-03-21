<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierOpeningBalance extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_id',
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
        'supplier_id' => 'integer',
        'currency_id' => 'integer',
        'financial_year' => 'integer',
        'exchange_rate' => 'decimal:6',
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'base_debit_amount' => 'decimal:2',
        'base_credit_amount' => 'decimal:2',
        'net_balance' => 'decimal:2',
        'opening_date' => 'date',
        'approved_at' => 'datetime',
        'created_by' => 'integer',
        'approved_by' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
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
