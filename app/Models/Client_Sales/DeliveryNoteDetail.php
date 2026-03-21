<?php

namespace App\Models\Client_Sales;

use App\Models\ItemUnit;
use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryNoteDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_note_id',
        'invoice_detail_id',
        'product_id',
        'quantity_delivered',
        'unit_id',
        'batch_number',
        'serial_number',
        'expiry_date',
        'condition',
        'quality_notes',
        'notes',
    ];

    protected $casts = [
        'quantity_delivered' => 'decimal:4',
        'expiry_date' => 'date',
    ];

    public function deliveryNote()
    {
        return $this->belongsTo(DeliveryNote::class);
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
