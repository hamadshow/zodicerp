<?php

namespace App\Models\Client_Sales;

use App\Models\User;
use App\Models\Vendor_Purchases\SalesAgent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesCommission extends Model
{
    use HasFactory;

    protected $fillable = [
        'commission_number',
        'sales_agent_id',
        'invoice_id',
        'commission_date',
        'sales_amount',
        'commission_rate',
        'commission_amount', // Generated, but sometimes fillable if overridden? No, it's generated.
        'commission_type',
        'tier_level',
        'is_paid',
        'paid_date',
        'payment_reference',
        'status',
        'notes',
        'calculated_by',
        'calculated_at',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'commission_date' => 'date',
        'sales_amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'is_paid' => 'boolean',
        'paid_date' => 'date',
        'calculated_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function salesAgent()
    {
        return $this->belongsTo(SalesAgent::class);
    }

    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class);
    }

    public function calculator()
    {
        return $this->belongsTo(User::class, 'calculated_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
