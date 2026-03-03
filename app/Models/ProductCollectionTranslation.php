<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductCollectionTranslation extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'product_collections_translations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'lang_code',
        'ec_product_collections_id',
        'name',
        'description',
    ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get the product collection that owns the translation.
     */
    public function productCollection()
    {
        return $this->belongsTo(ProductCollection::class, 'ec_product_collections_id');
    }
}
