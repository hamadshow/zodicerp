<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariation extends Model
{
    use HasFactory;

    protected $table = 'product_variations';

    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'configurable_product_id',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function items()
    {
        return $this->hasMany(ProductVariationItem::class, 'variation_id');
    }

    protected static function booted(): void
    {
        // Product Domain (Phase 1): product_variations rows are link records for
        // child SKUs. When the child SKU is soft- or force-deleted, the link and
        // its attribute items must not survive as orphans.
        static::deleting(function (ProductVariation $variation) {
            $variation->items()->delete();
        });
    }
}
