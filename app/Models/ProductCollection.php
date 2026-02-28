<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductCollection extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'image',
        'status',
        'is_featured',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
    ];

    public function products()
    {
        return $this->belongsToMany(Products::class, 'product_collection_products', 'product_collection_id', 'product_id');
    }
}
