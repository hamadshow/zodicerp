<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemUnit extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_units';

    protected $fillable = [
        'name',
        'unit_type',
        'base_unit',
        'conversion_factor',
        'active',
        'company_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'active' => 'boolean',
        'conversion_factor' => 'decimal:4',
        'unit_type' => 'integer',
    ];

    public function parent()
    {
        return $this->belongsTo(ItemUnit::class, 'base_unit');
    }

    public function children()
    {
        return $this->hasMany(ItemUnit::class, 'base_unit');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function conversionsFrom()
    {
        return $this->hasMany(ItemUnitConversion::class, 'from_unit_id');
    }

    public function conversionsTo()
    {
        return $this->hasMany(ItemUnitConversion::class, 'to_unit_id');
    }

    public function conversions()
    {
        return $this->conversionsFrom();
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeMainUnits($query)
    {
        return $query->where('unit_type', 1);
    }
}
