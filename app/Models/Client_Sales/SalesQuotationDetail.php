<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Products;
use App\Models\ItemUnit;
use App\Models\Taxes\TaxType;

class SalesQuotationDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_quotation_details';

    protected $fillable = [
        'quotation_id',
        'product_id',
        'quantity',
        'unit_id',
        'unit_price',
        'discount_percentage',
        'discount_amount',
        'tax_id',
        'tax_amount',
        'line_total',
        'delivery_date',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
        'delivery_date' => 'date',
    ];

    public function quotation()
    {
        return $this->belongsTo(SalesQuotation::class, 'quotation_id');
    }

    public function product()
    {
        return $this->belongsTo(Products::class);
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class);
    }

    public function tax()
    {
        return $this->belongsTo(TaxType::class);
    }
}
