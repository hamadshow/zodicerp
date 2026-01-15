<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brands extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'brand_code',
        'name',
        'parent_id',
        'status',
        'order',
    ];

    public function parent()
    {
        return $this->belongsTo(Brands::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Brands::class, 'parent_id');
    }
}
