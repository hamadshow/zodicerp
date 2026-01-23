<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrossBorderTax extends Model
{
    use HasFactory;

    protected $table = 'cross_border_taxes';

    protected $fillable = [
        'transaction_type',
        'source_country_id',
        'destination_country_id',
        'applicable_tax_id',
        'tax_rate',
        'tax_treatment',
        'required_documents',
        'certificate_requirements',
        'is_active',
        'effective_from',
        'effective_to',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tax_rate' => 'decimal:4',
        'required_documents' => 'array',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public function sourceCountry(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Country::class, 'source_country_id');
    }

    public function destinationCountry(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Country::class, 'destination_country_id');
    }

    public function applicableTax(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Taxes\Tax::class, 'applicable_tax_id');
    }
}
