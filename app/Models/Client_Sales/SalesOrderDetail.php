<?php

namespace App\Models\Client_Sales;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\TaxType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrderDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'delivered_quantity',
        'pending_quantity', // Generated column
        'unit_id',
        'unit_price',
        'discount_percentage',
        'discount_amount',
        'tax_id',
        'tax_amount',
        'line_total', // Generated column
        'requested_delivery_date',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'delivered_quantity' => 'decimal:4',
        'pending_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
        'requested_delivery_date' => 'date',
    ];

    public function order()
    {
        return $this->belongsTo(SalesOrder::class, 'order_id');
    }

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }

    public function tax()
    {
        return $this->belongsTo(TaxType::class, 'tax_id');
    }
}
