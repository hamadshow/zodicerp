<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Products extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_code',
        'name',
        'slug',
        'description',
        'content',
        'status',
        'images',
        'image',
        'video_media',
        'sku',
        'barcode',
        'parent_id',
        'brand_id',
        'supplier_code',
        'order',
        'views',
        'quantity',
        'stock_status',
        'allow_checkout_when_out_of_stock',
        'with_storehouse_management',
        'minimum_order_quantity',
        'maximum_order_quantity',
        'cost_per_item',
        'price',
        'sale_price',
        'sale_type',
        'start_date',
        'end_date',
        'price_includes_tax',
        'tax_id',
        'product_type',
        'is_featured',
        'is_variation',
        'variations_count',
        'length',
        'wide',
        'height',
        'weight',
        'reviews_count',
        'reviews_avg',
        'meta_title',
        'meta_description',
        'generate_license_code',
        'license_code_type',
        'notify_attachment_updated',
        'specification_table_id',
        'approved_by',
        'created_by_id',
        'created_by_type',
        'updated_by_id',
        'updated_by_type',
    ];

    protected $casts = [
        'images' => 'array',
        'allow_checkout_when_out_of_stock' => 'boolean',
        'with_storehouse_management' => 'boolean',
        'price_includes_tax' => 'boolean',
        'is_featured' => 'boolean',
        'is_variation' => 'boolean',
        'generate_license_code' => 'boolean',
        'notify_attachment_updated' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'cost_per_item' => 'decimal:2',
    ];

    public function parent()
    {
        return $this->belongsTo(Products::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Products::class, 'parent_id');
    }

    public function brand()
    {
        return $this->belongsTo(Brands::class, 'brand_id');
    }

    public function categories()
    {
        return $this->belongsToMany(Categories::class, 'category_product', 'product_id', 'category_id');
    }

    public function variations()
    {
        return $this->hasMany(ProductVariation::class, 'configurable_product_id');
    }

    // Assuming a User model exists for creator/approver
    public function creator()
    {
        return $this->morphTo('created_by');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function collections()
    {
        return $this->belongsToMany(ItemCollection::class, 'item_collection_product', 'product_id', 'item_collection_id')
            ->withTimestamps();
    }
}
