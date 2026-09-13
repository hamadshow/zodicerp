<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovementLine extends Model
{
    protected $table = 'inventory_movement_lines';

    protected $guarded = [];

    protected $casts = [
        'quantity' => 'decimal:3',
        'cost_price' => 'decimal:6',
    ];
}