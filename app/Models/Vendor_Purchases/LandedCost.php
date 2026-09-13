<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Currency;
use App\Models\User;
use App\Models\Accounting\JournalEntry;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LandedCost extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference_number',
        'company_id',
        'purchase_invoice_id',
        'allocation_method',
        'status',
        'total_amount',
        'currency_id',
        'exchange_rate',
        'allocated_amount',
        'credit_source_type',
        'credit_account_id',
        'posting_date',
        'posted_journal_entry_code',
        'reversal_journal_entry_code',
        // 'remaining_to_allocate', // Generated column
        'notes',
        'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'allocated_amount' => 'decimal:2',
        'posting_date' => 'date',
        'credit_account_id' => 'integer',
        'remaining_to_allocate' => 'decimal:2',
    ];

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }

    public function creditAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'credit_account_id', 'AccID');
    }

    public function postedJournal()
    {
        return $this->belongsTo(JournalEntry::class, 'posted_journal_entry_code', 'entry_code');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function details()
    {
        return $this->hasMany(LandedCostDetail::class, 'landed_cost_id');
    }

    public function allocations()
    {
        return $this->hasMany(LandedCostAllocation::class, 'landed_cost_id');
    }
}
