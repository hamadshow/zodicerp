<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Products;
use App\Models\Warehouses;
use App\Models\ItemUnit;
use App\Models\Vendor_Purchases\TaxType;

class SalesInvoiceDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_id',
        'order_detail_id',
        'product_id',
        'warehouse_id',
        'quantity',
        'delivered_quantity',
        'unit_id',
        'unit_price',
        'discount_percentage',
        'discount_amount',
        'tax_id',
        'tax_amount',
        'line_total', // Generated
        'base_line_total',
        'batch_number',
        'serial_number',
        'expiry_date',
        'shelf_location',
        'attribute_data',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'delivered_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
        'base_line_total' => 'decimal:2',
        'expiry_date' => 'date',
        'attribute_data' => 'array',
    ];

    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class, 'invoice_id');
    }

    public function orderDetail()
    {
        return $this->belongsTo(SalesOrderDetail::class, 'order_detail_id');
    }

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class);
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
