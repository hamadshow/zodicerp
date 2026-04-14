<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierStatement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'statement_number',
        'supplier_id',
        'currency_id',
        'statement_date',
        'period_from',
        'period_to',
        'opening_balance',
        'total_invoices',
        'total_payments',
        'total_adjustments',
        'total_credit_notes',
        // 'closing_balance', // Generated
        'base_closing_balance',
        'notes',
        'is_sent',
        'sent_date',
        'sent_method',
        'created_by',
    ];

    protected $casts = [
        'statement_date' => 'date',
        'period_from' => 'date',
        'period_to' => 'date',
        'sent_date' => 'date',
        'opening_balance' => 'decimal:2',
        'total_invoices' => 'decimal:2',
        'total_payments' => 'decimal:2',
        'total_adjustments' => 'decimal:2',
        'total_credit_notes' => 'decimal:2',
        'closing_balance' => 'decimal:2', // Generated
        'base_closing_balance' => 'decimal:2',
        'is_sent' => 'boolean',
        'supplier_id' => 'integer',
        'currency_id' => 'integer',
        'created_by' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function details()
    {
        return $this->hasMany(SupplierStatementDetail::class, 'statement_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
