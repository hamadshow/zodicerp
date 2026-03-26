<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferStockItem extends Model
{
    use HasFactory;

    protected $table = 'inventory_movement_lines';

    protected $fillable = [
        'stock_movement_id',
        'product_id',
        'unit_id',
        'quantity',
        'cost_price',
    ];

    public function transferStock(): BelongsTo
    {
        return $this->belongsTo(TransferStock::class, 'stock_movement_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }
}
