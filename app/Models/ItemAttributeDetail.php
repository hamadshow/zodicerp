<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemAttributeDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_attributes_details';

    protected $fillable = [
        'attribute_set_id',
        'title',
        'slug',
        'color',
        'image',
        'is_default',
        'order',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'order' => 'integer',
    ];

    public function attribute()
    {
        return $this->belongsTo(ItemAttribute::class, 'attribute_set_id');
    }
}
