<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Products;
use App\Models\ItemUnit;

class GoodsReceiptDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'receipt_id',
        'invoice_detail_id',
        'product_id',
        'quantity_received',
        'unit_id',
        'unit_cost',
        'batch_number',
        'serial_number',
        'expiry_date',
        'production_date',
        'shelf_location',
        'quality_status',
        'quality_notes',
        'is_accepted',
        'accepted_quantity',
        'rejected_quantity',
        'rejection_reason',
        'notes',
    ];

    protected $casts = [
        'quantity_received' => 'decimal:4',
        'unit_cost' => 'decimal:4',
        'expiry_date' => 'date',
        'production_date' => 'date',
        'is_accepted' => 'boolean',
        'accepted_quantity' => 'decimal:4',
        'rejected_quantity' => 'decimal:4',
    ];

    public function receipt()
    {
        return $this->belongsTo(GoodsReceipt::class, 'receipt_id');
    }

    public function invoiceDetail()
    {
        return $this->belongsTo(PurchaseInvoiceDetail::class, 'invoice_detail_id');
    }

    public function product()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }
}
