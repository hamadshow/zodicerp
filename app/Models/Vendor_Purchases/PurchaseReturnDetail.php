<?php

namespace App\Models\Vendor_Purchases;

use App\Models\ItemUnit;
use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseReturnDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'return_id',
        'invoice_detail_id',
        'product_id',
        'quantity',
        'unit_id',
        'unit_price',
        'tax_percentage',
        'tax_amount',
        'line_total', // It's stored/generated, but sometimes useful to have in fillable if not strictly managed by DB on insert (though usually DB handles it). Laravel ignores it on insert if it's generated.
        'batch_number',
        'serial_number',
        'return_reason_details',
        'condition',
        'inspection_notes',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'tax_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function return()
    {
        return $this->belongsTo(PurchaseReturn::class, 'return_id');
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
