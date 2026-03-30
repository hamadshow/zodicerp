<?php

namespace App\Models;

use App\Traits\HasTranslations;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Products extends Model
{
    use HasFactory, HasTranslations, SoftDeletes;

    protected $fillable = [
        'product_code',
        'name',
        'name_json',
        'slug',
        'slug_json',
        'description',
        'description_json',
        'content',
        'status',
        'images',
        'image',
        'video_media',
        'sku',
        'barcode',
        'parent_id',
        'brand_id',
        'unit_id',
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
        'meta_title_json',
        'meta_description',
        'meta_description_json',
        'generate_license_code',
        'license_code_type',
        'notify_attachment_updated',
        'specification_table_id',
        'approved_by',
        'created_by_id',
        'created_by_type',
        'updated_by_id',
        'updated_by_type',
        'company_id',
    ];

    protected $casts = [
        'images' => 'array',
        'name_json' => 'array',
        'slug_json' => 'array',
        'description_json' => 'array',
        'meta_title_json' => 'array',
        'meta_description_json' => 'array',
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

    protected $appends = ['converted_price', 'converted_sale_price'];

    public function getConvertedPriceAttribute()
    {
        return \App\Services\CurrencyConverter::convert($this->price);
    }

    public function productCollections()
    {
        return $this->belongsToMany(ProductCollection::class, 'product_collection_products', 'product_id', 'product_collection_id');
    }

    public function getConvertedSalePriceAttribute()
    {
        return $this->sale_price ? \App\Services\CurrencyConverter::convert($this->sale_price) : null;
    }

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

    public function unit()
    {
        return $this->belongsTo(\App\Models\ItemUnit::class, 'unit_id');
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
}
