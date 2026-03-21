<?php

namespace App\Models\Vendor_Purchases;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrderItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_order_items';

    protected $fillable = [
        'purchase_order_id',
        'quotation_item_id',
        'line_number',
        'item_type',
        'product_id',
        'service_id',
        'item_code',
        'item_name_ar',
        'item_name_en',
        'description_ar',
        'description_en',
        'ordered_quantity',
        'received_quantity',
        // pending_quantity is generated
        'unit_id',
        'unit_price',
        'discount_percent',
        'discount_amount',
        // net_price is generated
        // line_total is generated
        'tax_id',
        'tax_percent',
        // tax_total is generated
        'required_date',
        'promised_delivery_date',
        'warehouse_id',
        'cost_center_id',
        'project_id',
        'notes',
    ];

    protected $casts = [
        'ordered_quantity' => 'decimal:4',
        'received_quantity' => 'decimal:4',
        'pending_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'discount_percent' => 'decimal:2',
        'discount_amount' => 'decimal:4',
        'net_price' => 'decimal:4',
        'line_total' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'required_date' => 'date',
        'promised_delivery_date' => 'date',
    ];

    // Relationships

    public function order()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function quotationItem()
    {
        return $this->belongsTo(PurchaseQuotationItem::class, 'quotation_item_id');
    }

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }
}
