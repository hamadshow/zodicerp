<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemCollection extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_collections';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'image',
        'status',
        'is_featured',
        'parent_id',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'parent_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the parent collection.
     */
    public function parent()
    {
        return $this->belongsTo(ItemCollection::class, 'parent_id');
    }

    /**
     * Get the child collections.
     */
    public function children()
    {
        return $this->hasMany(ItemCollection::class, 'parent_id');
    }

    /**
     * The products that belong to the collection.
     */
    public function products()
    {
        return $this->belongsToMany(Products::class, 'item_collection_product', 'item_collection_id', 'product_id')
                    ->withTimestamps();
    }
}
