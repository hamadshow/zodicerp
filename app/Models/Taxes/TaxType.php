<?php

namespace App\Models\Taxes;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxType extends Model
{
    use HasFactory;

    protected $table = 'tax_types';

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'tax_category',
        'tax_level',
        'tax_system_code',
        'country_id',
        'legal_reference',
        'effective_date',
        'expiry_date',
        'is_recoverable',
        'is_withholding',
        'is_compound',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'expiry_date' => 'date',
        'is_recoverable' => 'boolean',
        'is_withholding' => 'boolean',
        'is_compound' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function country()
    {
        return $this->belongsTo(Country::class);
    }
}
