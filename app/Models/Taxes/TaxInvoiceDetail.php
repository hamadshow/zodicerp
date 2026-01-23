<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxInvoiceDetail extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tax_invoice_details';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'tax_invoice_id',
        'line_number',
        'item_type',
        'item_id',
        'description_ar',
        'description_en',
        'quantity',
        'unit_price',
        'unit_discount',
        'line_total',
        'tax_id',
        'tax_rate',
        'tax_amount',
        'taxable_amount',
        'unit_id',
        'currency_id',
        'tax_exemption_id',
        'exemption_reason',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'unit_discount' => 'decimal:4',
        'line_total' => 'decimal:4',
        'tax_rate' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'taxable_amount' => 'decimal:4',
        'created_at' => 'datetime',
    ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false; // Only created_at exists in schema and handled by DB default

    /**
     * Get the tax invoice that owns the detail.
     */
    public function taxInvoice(): BelongsTo
    {
        return $this->belongsTo(TaxInvoice::class, 'tax_invoice_id');
    }

    /**
     * Get the tax associated with the detail.
     */
    public function tax(): BelongsTo
    {
        return $this->belongsTo(Tax::class, 'tax_id');
    }

    /**
     * Get the currency associated with the detail.
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Currency::class, 'currency_id');
    }

    /**
     * Get the tax exemption associated with the detail.
     */
    public function taxExemption(): BelongsTo
    {
        return $this->belongsTo(TaxExemption::class, 'tax_exemption_id');
    }
    
    // Note: Unit relationship is dynamic based on schema presence, usually not strictly defined in model unless we are sure.
    // If we want to add it, we might need to know which model 'units' or 'item_units' maps to.
    // For now, we skip defining 'unit()' unless we know the model class. 
    // Usually 'item_units' maps to 'ItemUnit' model.
}
