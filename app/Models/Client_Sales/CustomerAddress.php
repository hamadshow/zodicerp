<?php

namespace App\Models\Client_Sales;

use App\Models\City;
use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerAddress extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'address_type',
        'address_name',
        'country_id',
        'city_id',
        'district',
        'street',
        'building_number',
        'postal_code',
        'po_box',
        'phone',
        'mobile',
        'email',
        'is_default',
        'is_default_billing',
        'is_default_shipping',
        'latitude',
        'longitude',
        'notes',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_default_billing' => 'boolean',
        'is_default_shipping' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }
}
