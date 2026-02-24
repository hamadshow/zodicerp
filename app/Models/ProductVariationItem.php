<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariationItem extends Model
{
    use HasFactory;

    protected $table = 'product_variation_items';

    protected $fillable = [
        'variation_id',
        'attribute_id',
        'attribute_value',
    ];

    public function variation()
    {
        return $this->belongsTo(ProductVariation::class, 'variation_id');
    }

    public function attribute()
    {
        // Attribute model/table may be ItemAttribute
        return $this->belongsTo(ItemAttribute::class, 'attribute_id');
    }
}

