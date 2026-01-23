<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LandedCostAllocation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'landed_cost_id',
        'purchase_invoice_detail_id',
        'allocated_amount',
        'allocated_per_unit',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'allocated_per_unit' => 'decimal:6',
    ];

    public function landedCost()
    {
        return $this->belongsTo(LandedCost::class, 'landed_cost_id');
    }

    public function purchaseInvoiceDetail()
    {
        return $this->belongsTo(PurchaseInvoiceDetail::class, 'purchase_invoice_detail_id');
    }
}
