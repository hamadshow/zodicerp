<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Currency;
use App\Models\User;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_orders';

    protected $fillable = [
        'po_number',
        'po_date',
        'expected_delivery_date',
        'quotation_id',
        'vendor_id',
        'vendor_contact_person',
        'vendor_phone',
        'vendor_email',
        'status',
        'priority',
        'currency_id',
        'exchange_rate',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'shipping_charges',
        'other_charges',
        'grand_total',
        'payment_terms_id',
        'delivery_terms_id',
        'shipping_method',
        'shipping_address',
        'notes',
        'internal_notes',
        'created_by',
        'updated_by',
        'approved_by',
        'approved_date',
        'sent_date',
    ];

    protected $casts = [
        'po_date' => 'date',
        'expected_delivery_date' => 'date',
        'approved_date' => 'datetime',
        'sent_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'grand_total' => 'decimal:2',
    ];

    // Relationships

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Supplier::class, 'vendor_id');
    }

    public function quotation()
    {
        return $this->belongsTo(PurchaseQuotation::class, 'quotation_id');
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
