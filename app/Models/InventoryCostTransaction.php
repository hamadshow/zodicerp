<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryCostTransaction extends Model
{
    protected $table = 'inventory_cost_transactions';

    protected $fillable = [
        'company_id',
        'product_id',
        'warehouse_id',
        'movement_header_id',
        'movement_line_id',
        'source_type',
        'source_id',
        'quantity_delta',
        'value_delta',
        'unit_cost',
        'previous_quantity',
        'previous_value',
        'previous_average_cost',
        'new_quantity',
        'new_value',
        'new_average_cost',
        'transaction_date',
        'posting_date',
        'landed_cost_id',
        'reversal_of_id',
        'created_by',
    ];

    protected $casts = [
        'quantity_delta' => 'decimal:4',
        'value_delta' => 'decimal:6',
        'unit_cost' => 'decimal:6',
        'previous_quantity' => 'decimal:4',
        'previous_value' => 'decimal:6',
        'previous_average_cost' => 'decimal:6',
        'new_quantity' => 'decimal:4',
        'new_value' => 'decimal:6',
        'new_average_cost' => 'decimal:6',
        'transaction_date' => 'date',
        'posting_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new \LogicException('Inventory cost transactions are immutable.');
        });

        static::deleting(function (): void {
            throw new \LogicException('Inventory cost transactions cannot be deleted.');
        });
    }
}