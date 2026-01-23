<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplierPaymentAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'invoice_id',
        'allocated_amount',
        'base_allocated_amount',
        'discount_given',
        'notes',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'base_allocated_amount' => 'decimal:2',
        'discount_given' => 'decimal:2',
        'payment_id' => 'integer',
        'invoice_id' => 'integer',
    ];

    public function payment()
    {
        return $this->belongsTo(SupplierPayment::class, 'payment_id');
    }

    public function invoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'invoice_id');
    }
}
