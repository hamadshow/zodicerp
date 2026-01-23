<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Currency;
use App\Models\User;

class PriceList extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'currency_id',
        'valid_from',
        'valid_to',
        'is_default',
        'price_type',
        'rounding_method',
        'rounding_factor',
        'is_active',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'rounding_factor' => 'decimal:2',
    ];

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function items()
    {
        return $this->hasMany(PriceListItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
