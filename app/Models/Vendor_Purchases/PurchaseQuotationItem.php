<?php

namespace App\Models\Vendor_Purchases;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseQuotationItem extends Model
{
    use HasFactory;

    protected $table = 'purchase_quotation_items';

    public $timestamps = false;

    protected $fillable = [
        'quotation_id',
        'line_number',
        'item_type',
        'product_id',
        'service_id',
        'item_code',
        'item_name_ar',
        'item_name_en',
        'description_ar',
        'description_en',
        'quantity',
        'unit_id',
        'received_quantity',
        'converted_quantity',
        // pending_quantity is generated
        'unit_price',
        'discount_percent',
        'discount_amount',
        // net_price is generated
        // line_total is generated
        'tax_id',
        'tax_amount',
        // tax_total is generated
        'required_date',
        'promised_delivery_date',
        'warehouse_id',
        'inventory_account_id',
        'cost_center_id',
        'project_id',
        'budget_item_id',
        'attributes',
        'quality_requirements',
        'inspection_required',
        'is_approved',
        'approval_notes',
        'approved_by',
        'approved_date',
        'technical_specifications',
        'technical_approved',
        'technical_approver',
        'technical_approval_date',
        'notes',
        'internal_comments',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'received_quantity' => 'decimal:3',
        'converted_quantity' => 'decimal:3',
        'pending_quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'discount_percent' => 'decimal:2',
        'discount_amount' => 'decimal:4',
        'net_price' => 'decimal:4',
        'line_total' => 'decimal:2',
        'tax_amount' => 'decimal:4',
        'tax_total' => 'decimal:2',
        'required_date' => 'date',
        'promised_delivery_date' => 'date',
        'approved_date' => 'date',
        'technical_approval_date' => 'date',
        'attributes' => 'array',
        'inspection_required' => 'boolean',
        'is_approved' => 'boolean',
        'technical_approved' => 'boolean',
    ];

    public function quotation()
    {
        return $this->belongsTo(PurchaseQuotation::class, 'quotation_id');
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
