<?php

namespace App\Models\Vendor_Purchases;

use App\Models\ItemUnit;
use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PriceListItem extends Model
{
    use HasFactory;

    public $timestamps = false; // No timestamps in SQL definition provided by user (except implicitly? No, user SQL didn't have created_at/updated_at for items)
    // Wait, user SQL for items: "id, price_list_id... notes". No created_at/updated_at.
    // So I will disable timestamps.

    protected $fillable = [
        'price_list_id',
        'product_id',
        'unit_id',
        'min_quantity',
        'unit_price',
        'discount_percentage',
        'discount_amount',
        'effective_date',
        'expiry_date',
        'notes',
    ];

    protected $casts = [
        'min_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_price' => 'decimal:4',
        'effective_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function priceList()
    {
        return $this->belongsTo(PriceList::class);
    }

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }
}
