<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxSettlement extends Model
{
    use HasFactory;

    protected $table = 'tax_settlements';

    protected $fillable = [
        'settlement_number',
        'tax_period_id',
        'entity_id',
        'settlement_date',
        'settlement_type',
        'tax_due',
        'tax_paid',
        'tax_refundable',
        'carry_forward_amount',
        'vat_payable',
        'vat_recoverable',
        'net_vat',
        'withholding_tax',
        'status',
        'calculated_by',
        'reviewed_by',
        'approved_by',
    ];

    protected $casts = [
        'settlement_date' => 'date',
        'tax_due' => 'decimal:4',
        'tax_paid' => 'decimal:4',
        'tax_refundable' => 'decimal:4',
        'carry_forward_amount' => 'decimal:4',
        'vat_payable' => 'decimal:4',
        'vat_recoverable' => 'decimal:4',
        'net_vat' => 'decimal:4',
        'withholding_tax' => 'decimal:4',
    ];

    public function taxPeriod(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Taxes\TaxPeriod::class, 'tax_period_id');
    }

    public function entity(): BelongsTo
    {
        // Maps to companies or company_infos table. Assuming CompanyInfo model for now.
        return $this->belongsTo(\App\Models\CompanyInfo::class, 'entity_id');
    }

    public function calculatedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'calculated_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'reviewed_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }
}
