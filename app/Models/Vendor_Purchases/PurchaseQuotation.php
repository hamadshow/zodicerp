<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseQuotation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_quotations';

    protected $fillable = [
        'quotation_number',
        'quotation_date',
        'expiry_date',
        'company_id',
        'department_id',
        'prepared_by',
        'vendor_id',
        'vendor_contact_person',
        'vendor_phone',
        'vendor_email',
        'status',
        'priority',
        'subtotal',
        'discount_amount',
        'discount_percent',
        'tax_amount',
        'shipping_charges',
        'other_charges',
        'grand_total',
        'currency_id',
        'exchange_rate',
        'payment_terms_id',
        'delivery_terms_id',
        'shipping_method',
        'shipping_address',
        'attachments',
        'notes',
        'terms_and_conditions',
        'internal_notes',
        'converted_to_po_id',
        'quotation_template_id',
        'created_by',
        'updated_by',
        'approved_by',
        'approved_date',
        'sent_date',
        'converted_date',
    ];

    protected $casts = [
        'quotation_date' => 'date',
        'expiry_date' => 'date',
        'approved_date' => 'date',
        'sent_date' => 'date',
        'converted_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'attachments' => 'array',
    ];

    // Relationships

    public function items()
    {
        return $this->hasMany(PurchaseQuotationItem::class, 'quotation_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Supplier::class, 'vendor_id');
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

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'converted_to_po_id');
    }
}
