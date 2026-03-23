<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferStock extends Model
{
    use HasFactory;

    protected $table = 'stock_movements';

    protected $fillable = [
        'movement_date',
        'warehouse_id',
        'from_warehouse_id',
        'to_warehouse_id',
        'company_id',
        'created_by',
        'notes',
    ];

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouses::class, 'from_warehouse_id');
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouses::class, 'to_warehouse_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransferStockItem::class, 'stock_movement_id');
    }
}
