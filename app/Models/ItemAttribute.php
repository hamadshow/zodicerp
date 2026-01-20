<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemAttribute extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_attributes';

    protected $fillable = [
        'title',
        'slug',
        'display_layout',
        'is_searchable',
        'is_comparable',
        'is_use_in_product_listing',
        'status',
        'order',
        'use_image_from_product_variation',
    ];

    protected $casts = [
        'is_searchable' => 'boolean',
        'is_comparable' => 'boolean',
        'is_use_in_product_listing' => 'boolean',
        'use_image_from_product_variation' => 'boolean',
        'order' => 'integer',
    ];

    /**
     * The "booted" method of the model.
     *
     * @return void
     */
    protected static function booted()
    {
        static::deleting(function ($attribute) {
            // Cascade soft delete to details
            $attribute->details()->delete();
        });

        static::restoring(function ($attribute) {
            // Optional: Restore details if parent is restored
            $attribute->details()->restore();
        });
    }

    /**
     * Get the details (options) for this attribute.
     */
    public function details()
    {
        return $this->hasMany(ItemAttributeDetail::class, 'attribute_set_id');
    }
}
