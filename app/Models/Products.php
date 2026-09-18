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
     * is_variation is a LEGACY COMPATIBILITY FIELD derived from parent_id in
     * BOTH directions (parent_id != null => true, parent_id == null => false).
     * It is written exclusively by this model's saving hook so it can never
     * contradict parent_id — no writer elsewhere may set it independently.
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

    /**
     * THE shared Product Domain validation contract (Phase 1).
     *
     * Consumed by StoreProductsRequest, UpdateProductsRequest and the API
     * ProductController so web + API cannot drift apart:
     *
     *   simple   : parent_id must be null (standalone SKU)
     *   variable : parent_id must be null (parent/template)
     *   service  : parent_id must be null (non-stock sellable)
     *   variation: product_type = simple AND parent_id = variable product id
     *
     * $productTypeMode: 'required' for full create/update payloads,
     * 'sometimes' for partial (PATCH-style) updates.
     */
    public static function domainRules(string $productTypeMode = 'required'): array
    {
        $productTypeRule = $productTypeMode === 'sometimes'
            ? ['sometimes', 'nullable', \Illuminate\Validation\Rule::in(self::PRODUCT_TYPES)]
            : ['required', \Illuminate\Validation\Rule::in(self::PRODUCT_TYPES)];

        return [
            'product_type' => $productTypeRule,

            // Product Images contract:
            //   * Uploaded files must be real image files up to 5MB.
            //   * Persisted path strings must live under an owned prefix
            //     (products/*, suppliers/*) or the Media Library (media/*).
            //     This doubles as path-traversal protection for the
            //     delete-file logic in the controllers.
            'image' => [
                'nullable',
                'max:5120',
                function ($attribute, $value, $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if ($value instanceof \Illuminate\Http\UploadedFile) {
                        if (! in_array(strtolower($value->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                            $fail('The image must be a file of type: jpg, jpeg, png, gif, webp.');
                        }

                        return;
                    }
                    if (is_string($value)
                        && ! str_starts_with($value, 'products/')
                        && ! str_starts_with($value, 'suppliers/')
                        && ! str_starts_with($value, 'media/')) {
                        $fail('The image path is invalid.');
                    }
                },
            ],
            'gallery' => ['nullable', 'array', 'max:20'],
            'gallery.*' => [
                'nullable',
                'max:5120',
                function ($attribute, $value, $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if ($value instanceof \Illuminate\Http\UploadedFile) {
                        if (! in_array(strtolower($value->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                            $fail('Each gallery image must be a file of type: jpg, jpeg, png, gif, webp.');
                        }

                        return;
                    }
                    if (is_string($value)
                        && ! str_starts_with($value, 'products/')
                        && ! str_starts_with($value, 'suppliers/')
                        && ! str_starts_with($value, 'media/')) {
                        $fail('The gallery image path is invalid.');
                    }
                },
            ],

            'parent_id' => [
                'nullable',
                // The parent must exist AND be a variable product.
                \Illuminate\Validation\Rule::exists('products', 'id')->where(function ($query) {
                    $query->where('product_type', self::PRODUCT_TYPE_VARIABLE);
                }),
                function ($attribute, $value, $fail) {
                    if ($value === null) {
                        return;
                    }

                    // Effective product type: the request payload wins; on
                    // partial (PATCH-style) updates the existing row's type
                    // is inherited when the payload omits product_type.
                    $type = request()->input('product_type');
                    $routeParam = request()->route('product') ?? request()->route('id');
                    $selfId = is_object($routeParam) ? ($routeParam->id ?? null) : $routeParam;

                    if ($type === null && $selfId !== null) {
                        $type = self::whereKey($selfId)->value('product_type');
                    }

                    // Only simple products can be variations of a variable parent.
                    if ($type !== self::PRODUCT_TYPE_SIMPLE) {
                        $fail('Only simple products can be a variation of a variable parent.');

                        return;
                    }

                    // A product can never be its own parent (web route binds the
                    // model as {product}; the API binds the id as {id}).
                    if ($selfId !== null && (int) $value === (int) $selfId) {
                        $fail('A product cannot be its own parent.');
                    }
                },
            ],
        ];
    }

    /**
     * Keep the denormalized variations_count consistent on every child
     * create/delete/restore (verified against children() — the source of
     * truth — never incremented blindly).
 */
    protected static function syncVariationsCount(?int $parentId): void
    {
        if ($parentId && Products::find($parentId)) {
            Products::where('id', $parentId)->update([
                'variations_count' => Products::where('parent_id', $parentId)->count(),
            ]);
        }
    }

    protected static function booted(): void
    {
        static::saving(function (Products $product) {
            // ── Variation flag mirror (two-way) ─────────────────────────────
            // parent_id is the single authority: every persisted row must
            // satisfy  is_variation === (parent_id !== null).  This also
            // repairs legacy writer code that still sets is_variation=true
            // on variable PARENT rows (parent_id === null).
            $product->is_variation = $product->parent_id !== null;

            // ── Service inventory guard ─────────────────────────────────
            // Services never participate in physical inventory: no warehouse
            // stock, no quantities. Enforced at the model layer so EVERY
            // write path (web, API, import, service layer) is covered.
            if ($product->product_type === self::PRODUCT_TYPE_SERVICE) {
                $product->with_storehouse_management = false;
                $product->quantity = 0;
            }
        });

        static::saved(function (Products $product) {
            if ($product->wasChanged('parent_id')) {
                // Re-sync both sides of a parent_id move.
                self::syncVariationsCount($product->getOriginal('parent_id'));
                self::syncVariationsCount($product->parent_id);
            }
        });

        static::deleted(function (Products $product) {
            if ($product->parent_id) {
                self::syncVariationsCount($product->parent_id);
            }
            // Detach link rows for this SKU so they cannot outlive it (soft delete).
            ProductVariation::where('product_id', $product->id)->get()->each->delete();
        });

        static::restored(function (Products $product) {
            if ($product->parent_id) {
                self::syncVariationsCount($product->parent_id);
            }
        });

        static::forceDeleted(function (Products $product) {
            if ($product->parent_id) {
                self::syncVariationsCount($product->parent_id);
            }
            // Hard detach: link rows must never outlive the SKU row itself.
            // Items are removed explicitly because a query-builder forceDelete
            // bypasses the ProductVariation::deleting hook.
            $variationIds = ProductVariation::where('product_id', $product->id)->pluck('id');
            if ($variationIds->isNotEmpty()) {
                ProductVariationItem::whereIn('variation_id', $variationIds)->delete();
                ProductVariation::whereIn('id', $variationIds)->forceDelete();
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
