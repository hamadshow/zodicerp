<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use App\Models\Account;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\Country;
use App\Models\City;
use App\Models\User;
use App\Models\Products;

use App\Traits\HasTranslations;

class Supplier extends Authenticatable
{
    use HasFactory, SoftDeletes, Notifiable, HasTranslations;

    // Primary key is 'id' by default (INT AUTO_INCREMENT as requested), so we don't need to specify it unless it differs.
    // Previous version used 'supplier_id', but new request says 'id INT PRIMARY KEY'.
    // protected $primaryKey = 'id'; 

    protected $fillable = [
        'supplier_code',
        'name_ar',
        'store_name_json',
        'store_description_json',
        'commission_rate',
        'verification_status',
        'supplier_group_id', // Renamed from group_id
        'account_id',
        'password',
        'currency_id',
        'tax_number',
        'commercial_register',
        'tax_file_number',
        'credit_limit',
        'current_balance',
        // 'available_credit', // Generated
        'payment_terms',
        'default_payment_method',
        'default_warehouse_id',
        'country_id',
        'city_id',
        'primary_phone',
        'secondary_phone',
        'fax',
        'email',
        'website',
        'is_vendor',
        'is_manufacturer',
        'is_active',
        'rating',
        'notes',
        'favorite',
        'created_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'store_name_json' => 'array',
        'store_description_json' => 'array',
        'commission_rate' => 'decimal:2',
        'supplier_group_id' => 'integer',
        'account_id' => 'integer',
        'currency_id' => 'integer',
        'credit_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'available_credit' => 'decimal:2',
        'payment_terms' => 'integer',
        'default_warehouse_id' => 'integer',
        'country_id' => 'integer',
        'city_id' => 'integer',
        'is_vendor' => 'boolean',
        'is_manufacturer' => 'boolean',
        'is_active' => 'boolean',
        'favorite' => 'boolean',
        'rating' => 'integer',
        'created_by' => 'integer',
        'password' => 'hashed', // Use hashed cast for password
    ];

    public function group()
    {
        return $this->belongsTo(SupplierGroup::class, 'supplier_group_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'default_warehouse_id');
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function addresses()
    {
        return $this->hasMany(SupplierAddress::class, 'supplier_id');
    }

    public function contacts()
    {
        return $this->hasMany(SupplierContact::class, 'supplier_id');
    }

    public function openingBalances()
    {
        return $this->hasMany(SupplierOpeningBalance::class, 'supplier_id');
    }
    
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Retain existing products relationship if applicable, but updating FK keys
    public function products()
    {
        // Pivot table product_supplier likely uses 'supplier_id'.
        // If pivot table column is 'supplier_id' and our PK is 'id', we need to ensure the pivot definition is correct.
        // belongsToMany(Related, table, foreignPivotKey, relatedPivotKey)
        // If table is product_supplier, foreignPivotKey should be 'supplier_id' (column in pivot)
        return $this->belongsToMany(Products::class, 'product_supplier', 'supplier_id', 'product_id')
            ->withPivot('cost_price', 'supplier_sku')
            ->withTimestamps();
    }

    public function wallet()
    {
        return $this->hasOne(VendorWallet::class, 'supplier_id');
    }

    protected static function booted()
    {
        static::created(function ($supplier) {
            $supplier->wallet()->create([
                'currency_id' => $supplier->currency_id ?: 1, // Default to base currency if not set
                'balance' => 0.00,
                'pending_balance' => 0.00,
                'withdrawn_balance' => 0.00,
                'is_active' => true,
            ]);
        });
    }
}
