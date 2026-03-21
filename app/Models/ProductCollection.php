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

    protected $appends = ['translated_name'];

    public function getTranslatedNameAttribute()
    {
        return $this->getTranslatedName();
    }

    public function products()
    {
        return $this->belongsToMany(Products::class, 'product_collection_products', 'product_collection_id', 'product_id');
    }

    /**
     * Get the translations for the product collection.
     */
    public function translations()
    {
        return $this->hasMany(ProductCollectionTranslation::class, 'ec_product_collections_id');
    }

    /**
     * Get translated name.
     *
     * @return string
     */
    public function getTranslatedName(?string $locale = null)
    {
        $locale = $locale ?: app()->getLocale();

        $translation = $this->translations->where('lang_code', $locale)->first();

        if ($translation) {
            return $translation->name;
        }

        // Fallback to default locale if not found
        $fallbackLocale = config('app.fallback_locale');
        if ($locale !== $fallbackLocale) {
            $translation = $this->translations->where('lang_code', $fallbackLocale)->first();
            if ($translation) {
                return $translation->name;
            }
        }

        return $this->name;
    }

    /**
     * Get translated description.
     *
     * @return string|null
     */
    public function getTranslatedDescription(?string $locale = null)
    {
        $locale = $locale ?: app()->getLocale();

        $translation = $this->translations->where('lang_code', $locale)->first();

        if ($translation) {
            return $translation->description;
        }

        // Fallback
        $fallbackLocale = config('app.fallback_locale');
        if ($locale !== $fallbackLocale) {
            $translation = $this->translations->where('lang_code', $fallbackLocale)->first();
            if ($translation) {
                return $translation->description;
            }
        }

        return $this->description;
    }
}
