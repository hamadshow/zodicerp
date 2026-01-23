<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Account;
use App\Models\Currency;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Warehouses;
use App\Models\Vendor_Purchases\SalesAgent;
use App\Models\Country;
use App\Models\City;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_code', 'name_ar', 'name_en', 'customer_group_id', 'account_id',
        'currency_id', 'price_list_id', 'tax_number', 'commercial_register',
        'credit_limit', 'current_balance', 'credit_days', 'payment_terms',
        'default_payment_method', 'default_warehouse_id', 'sales_agent_id',
        'country_id', 'city_id', 'primary_phone', 'secondary_phone', 'mobile',
        'fax', 'email', 'website', 'customer_type', 'customer_class',
        'is_active', 'rating', 'registration_date', 'last_sale_date', 'notes',
        'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'credit_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'available_credit' => 'decimal:2',
        'registration_date' => 'date',
        'last_sale_date' => 'date',
    ];

    // Relationships

    public function group()
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function priceList()
    {
        return $this->belongsTo(PriceList::class, 'price_list_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'default_warehouse_id');
    }

    public function salesAgent()
    {
        return $this->belongsTo(SalesAgent::class, 'sales_agent_id');
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_id');
    }
}
