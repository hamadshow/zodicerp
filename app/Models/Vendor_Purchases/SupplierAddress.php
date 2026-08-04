<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierAddress extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_id',
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
        'latitude',
        'longitude',
        'notes',
    ];

    protected $casts = [
        'supplier_id' => 'integer',
        'country_id' => 'integer',
        'city_id' => 'integer',
        'is_default' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'city_id');
    }

    public function city()
    {
        return $this->belongsTo(Location::class, 'city_id');
    }

    public function country()
    {
        return $this->belongsTo(Location::class, 'country_id');
    }
}
