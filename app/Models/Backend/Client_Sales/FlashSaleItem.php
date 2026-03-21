<?php

namespace App\Models\Backend\Client_Sales;

use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlashSaleItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'flash_sale_id',
        'product_id',
        'price',
        'quantity',
        'sold',
    ];

    public function flashSale()
    {
        return $this->belongsTo(FlashSale::class);
    }

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }
}
