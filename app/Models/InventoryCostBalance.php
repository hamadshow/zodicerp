<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryCostBalance extends Model
{
    protected $table = 'inventory_cost_balances';

    protected $fillable = [
        'company_id',
        'product_id',
        'warehouse_id',
        'quantity',
        'inventory_value',
        'average_cost',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'inventory_value' => 'decimal:6',
        'average_cost' => 'decimal:6',
    ];
}