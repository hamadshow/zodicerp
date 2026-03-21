<?php

namespace App\Models\Client_Sales;

use App\Models\ItemUnit;
use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturnDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'return_id',
        'invoice_detail_id',
        'product_id',
        'quantity',
        'unit_id',
        'unit_price',
        'tax_percentage',
        'tax_amount',
        'line_total', // Generated
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

    public function salesReturn()
    {
        return $this->belongsTo(SalesReturn::class, 'return_id');
    }

    public function invoiceDetail()
    {
        return $this->belongsTo(SalesInvoiceDetail::class, 'invoice_detail_id');
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
