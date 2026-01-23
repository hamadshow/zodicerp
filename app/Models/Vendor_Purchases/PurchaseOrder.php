<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\User;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'supplier_id',
        'quotation_id',
        'currency_id',
        'exchange_rate',
        'order_date',
        'expected_delivery_date',
        'actual_delivery_date',
        'warehouse_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'total_amount',
        'advance_payment',
        'status',
        'priority',
        'shipping_method',
        'shipping_terms',
        'payment_terms',
        'notes',
        'internal_notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'approved_at' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2', // Generated column
        'advance_payment' => 'decimal:2',
        'supplier_id' => 'integer',
        'quotation_id' => 'integer',
        'currency_id' => 'integer',
        'warehouse_id' => 'integer',
        'created_by' => 'integer',
        'approved_by' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function quotation()
    {
        return $this->belongsTo(PurchaseQuotation::class, 'quotation_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function creator()
    {
        // Assuming User model is in App\Models\User
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        // Assuming User model is in App\Models\User
        return $this->belongsTo(User::class, 'approved_by');
    }
}
