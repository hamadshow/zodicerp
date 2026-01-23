<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Vendor_Purchases\SalesQuotation;
use App\Models\Currency;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Warehouses;
use App\Models\Vendor_Purchases\SalesAgent;
use App\Models\User;

class SalesOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'customer_id',
        'quotation_id',
        'currency_id',
        'exchange_rate',
        'order_date',
        'delivery_date',
        'actual_delivery_date',
        'price_list_id',
        'warehouse_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'total_amount',
        'base_total', // Generated column
        'advance_payment',
        'status',
        'sales_agent_id',
        'priority',
        'shipping_method',
        'shipping_address_id',
        'payment_terms',
        'customer_notes',
        'internal_notes',
        'created_by',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'order_date' => 'date',
        'delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2',
        'advance_payment' => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function confirmer()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function details()
    {
        return $this->hasMany(SalesOrderDetail::class, 'order_id');
    }
}
