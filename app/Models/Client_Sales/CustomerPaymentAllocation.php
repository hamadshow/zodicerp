<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Model;

class CustomerPaymentAllocation extends Model
{
    protected $table = 'customer_payment_allocations';

    protected $fillable = [
        'payment_id',
        'invoice_id',
        'allocated_amount',
        'base_allocated_amount',
        'discount_given',
        'notes'
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'base_allocated_amount' => 'decimal:2',
        'discount_given' => 'decimal:2'
    ];

    public function payment()
    {
        return $this->belongsTo(CustomerPayment::class, 'payment_id');
    }

    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class, 'invoice_id');
    }
}
