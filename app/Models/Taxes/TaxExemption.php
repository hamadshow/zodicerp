<?php

namespace App\Models\Taxes;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxExemption extends Model
{
    use HasFactory;

    protected $table = 'tax_exemptions';

    protected $fillable = [
        'exemption_code',
        'name_ar',
        'name_en',
        'country_id',
        'exemption_type',
        'customer_id',
        'product_id',
        'service_id',
        'document_type',
        'exempted_tax_ids',
        'exemption_percentage',
        'legal_basis',
        'certificate_number',
        'certificate_expiry',
        'effective_from',
        'effective_to',
        'is_active',
        'requires_certificate',
        'created_by',
        'approved_by',
        'approved_date',
    ];

    protected $casts = [
        'exempted_tax_ids' => 'array',
        'exemption_percentage' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'certificate_expiry' => 'date',
        'approved_date' => 'date',
        'is_active' => 'boolean',
        'requires_certificate' => 'boolean',
    ];

    public function country()
    {
        return $this->belongsTo(Location::class, 'country_id');
    }
}
