<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Traits\HasTranslations;

class Categories extends Model
{
    use HasFactory, SoftDeletes, HasTranslations;

    protected $fillable = [
        'category_code',
        'name',
        'name_json',
        'slug',
        'slug_json',
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
        'company_id',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_default' => 'boolean',
        'name_json' => 'array',
        'slug_json' => 'array',
        'parent_id' => 'integer',
        'order' => 'integer',
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
