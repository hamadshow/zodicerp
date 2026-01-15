<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Supplier extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'supplier_name',
        'company_name',
        'email',
        'password',
        'phone',
        'mobile',
        'address',
        'country_id',
        'city_id',
        'area_id',
        'tax_number',
        'status',
        'notes',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function products()
    {
        return $this->belongsToMany(Products::class, 'product_supplier', 'supplier_id', 'product_id')
            ->withPivot('cost_price', 'supplier_sku')
            ->withTimestamps();
    }
}
