<?php

namespace App\Models\Vendor_Purchases;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseCosting extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id',
        'warehouse_id',
        'purchase_date',
        'invoice_detail_id',
        'quantity',
        'unit_id',
        'purchase_price',
        'landed_cost_per_unit',
        'additional_costs',
        // 'total_unit_cost', // Generated
        // 'total_cost',      // Generated
        'average_cost',
        'costing_method',
        'batch_number',
        'expiry_date',
        'is_allocated',
        'notes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'expiry_date' => 'date',
        'is_allocated' => 'boolean',
        'quantity' => 'decimal:4',
        'purchase_price' => 'decimal:4',
        'landed_cost_per_unit' => 'decimal:4',
        'additional_costs' => 'decimal:4',
        'total_unit_cost' => 'decimal:4',
        'total_cost' => 'decimal:2',
        'average_cost' => 'decimal:4',
    ];

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function invoiceDetail()
    {
        return $this->belongsTo(PurchaseInvoiceDetail::class, 'invoice_detail_id');
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }
}
