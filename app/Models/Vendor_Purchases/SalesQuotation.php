<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Client_Sales\Customer;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\User;

class SalesQuotation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'quotation_number',
        'customer_id',
        'currency_id',
        'exchange_rate',
        'quotation_date',
        'expiry_date',
        'valid_days',
        'price_list_id',
        'warehouse_id',
        'subtotal',
        'discount_percentage',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'total_amount',
        'base_total', // Generated column, usually not fillable but good to have in model for reference if needed, though mostly read-only.
        'status',
        'sales_agent_id',
        'probability_percentage',
        'followup_date',
        'sent_date',
        'sent_method',
        'customer_notes',
        'internal_notes',
        'created_by',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'quotation_date' => 'date',
        'expiry_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2',
        'probability_percentage' => 'decimal:2',
        'followup_date' => 'date',
        'sent_date' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function details()
    {
        return $this->hasMany(SalesQuotationDetail::class, 'quotation_id');
    }
}
