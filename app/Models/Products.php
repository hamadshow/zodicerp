<?php

namespace App\Models;

use App\Traits\HasTranslations;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Products extends Model
{
    use HasFactory, HasTranslations, SoftDeletes, \App\Models\Traits\BelongsToCompany;

    /**
     * -----------------------------------------------------------------
     * Product Domain (Phase 1) — single source of truth.
     * -----------------------------------------------------------------
     * Product: a catalog entity.
     * SKU: a directly identifiable sellable item.
     * Simple Product: a product that is itself the SKU (directly sellable, stockable).
     * Variable Product: a parent/template containing multiple SKU variations
     *                   (NOT sellable directly, NOT stockable).
     * Variation: a child SKU belonging to a variable parent
     *            (identified by parent_id != null; sellable, stockable).
     * Service: a non-stockable, non-physical sellable offering
     *          (no warehouse quantities, no stock movements, no valuation).
     *
     * Authoritative variation marker: parent_id != null.
     * is_variation is kept as a legacy mirror of that marker for backward
     * compatibility with existing queries/filters — it is written by this
     * model so it can never contradict parent_id.
     * -----------------------------------------------------------------
     */
    public const PRODUCT_TYPE_SIMPLE = 'simple';

    public const PRODUCT_TYPE_VARIABLE = 'variable';

    public const PRODUCT_TYPE_SERVICE = 'service';

    public const PRODUCT_TYPES = [
        self::PRODUCT_TYPE_SIMPLE,
        self::PRODUCT_TYPE_VARIABLE,
        self::PRODUCT_TYPE_SERVICE,
    ];

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

    /**
     * Authoritative check: is this row a variation (child SKU) of a variable parent?
     * Derived from parent_id — never trust is_variation for new logic.
     */
    public function isVariation(): bool
    {
        return $this->parent_id !== null;
    }

    public function isService(): bool
    {
        return $this->product_type === self::PRODUCT_TYPE_SERVICE;
    }

    public function isVariable(): bool
    {
        return $this->product_type === self::PRODUCT_TYPE_VARIABLE;
    }

    public function isSimple(): bool
    {
        return $this->product_type === self::PRODUCT_TYPE_SIMPLE;
    }

    /**
     * Services never participate in physical inventory.
     */
    public function managesStock(): bool
    {
        return ! $this->isService();
    }

    protected static function booted(): void
    {
        // Keep the legacy is_variation flag consistent with parent_id so that
        // "parent_id != null => is_variation = true" always holds.
        static::saving(function (Products $product) {
            if ($product->parent_id !== null) {
                $product->is_variation = true;
            }
        });
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

    public function category()
    {
        return $this->belongsTo(Categories::class, 'category_id');
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
