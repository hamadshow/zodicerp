<?php

namespace App\Models\Client_Sales;

use App\Models\Currency;
use App\Models\User;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\SalesAgent;
use App\Models\Vendor_Purchases\SalesQuotation;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_number',
        'customer_id',
        'order_id',
        'quotation_id',
        'currency_id',
        'exchange_rate',
        'invoice_date',
        'due_date',
        'posting_date',
        'price_list_id',
        'warehouse_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'other_charges',
        'total_amount',
        'base_total', // Generated
        'paid_amount',
        'base_paid', // Generated
        'balance_amount', // Generated
        'payment_status',
        'invoice_type',
        'sales_agent_id',
        'shipping_address_id',
        'payment_terms',
        'delivery_terms',
        'customer_notes',
        'internal_notes',
        'is_posted',
        'posted_at',
        'posted_by',
        'created_by',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'invoice_date' => 'date',
        'due_date' => 'date',
        'posting_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'base_paid' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'is_posted' => 'boolean',
        'posted_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function order()
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function quotation()
    {
        return $this->belongsTo(SalesQuotation::class);
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function priceList()
    {
        return $this->belongsTo(PriceList::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class);
    }

    public function salesAgent()
    {
        return $this->belongsTo(SalesAgent::class);
    }

    public function shippingAddress()
    {
        return $this->belongsTo(CustomerAddress::class, 'shipping_address_id');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function details()
    {
        return $this->hasMany(SalesInvoiceDetail::class, 'invoice_id');
    }
}
