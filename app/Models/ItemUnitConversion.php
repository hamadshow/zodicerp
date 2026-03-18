<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemUnitConversion extends Model
{
    use HasFactory;

    protected $table = 'item_unit_conversions';

    protected $fillable = [
        'from_unit_id',
        'to_unit_id',
        'conversion_factor',
        'is_active',
        'company_id',
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:6',
        'is_active' => 'boolean',
    ];

    public function fromUnit()
    {
        return $this->belongsTo(ItemUnit::class, 'from_unit_id');
    }

    public function toUnit()
    {
        return $this->belongsTo(ItemUnit::class, 'to_unit_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
