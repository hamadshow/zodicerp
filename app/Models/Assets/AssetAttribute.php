<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetAttribute extends Model
{
    use HasFactory;

    protected $table = 'asset_attributes';

    protected $fillable = [
        'asset_id',
        'attribute_id',
        'value_text',
        'value_number',
        'value_date',
        'value_boolean',
    ];

    protected $casts = [
        'value_number' => 'decimal:4',
        'value_date' => 'date',
        'value_boolean' => 'boolean',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function attribute()
    {
        return $this->belongsTo(Attribute::class, 'attribute_id');
    }

    // Helper to get value based on attribute type
    public function getValueAttribute()
    {
        if ($this->relationLoaded('attribute')) {
            switch ($this->attribute->type) {
                case 'number':
                    return $this->value_number;
                case 'date':
                    return $this->value_date;
                case 'boolean':
                    return $this->value_boolean;
                default:
                    return $this->value_text;
            }
        }
        
        // Fallback if relation not loaded, check non-nulls
        return $this->value_text ?? $this->value_number ?? $this->value_date ?? $this->value_boolean;
    }
}
