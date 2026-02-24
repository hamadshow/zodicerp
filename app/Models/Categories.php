<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Categories extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_code',
        'name',
        'slug',
        'description',
        'parent_id',
        'status',
        'order',
        'icon',
        'image',
        'is_featured',
        'is_default',
        'author_id',
        'author_type',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_default' => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(Categories::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Categories::class, 'parent_id');
    }

    public function author()
    {
        return $this->morphTo();
    }

    public function products()
    {
        return $this->belongsToMany(Products::class, 'category_product', 'category_id', 'product_id');
    }
}
