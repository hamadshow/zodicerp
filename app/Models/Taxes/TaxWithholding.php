<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxWithholding extends Model
{
    use HasFactory;

    protected $table = 'tax_withholdings';

    protected $fillable = [
        'withholding_code',
        'country_id',
        'name_ar',
        'name_en',
        'description',
        'withholding_rate',
        'withholding_type',
        'tier_details',
        'apply_to',
        'minimum_amount',
        'maximum_amount',
        'withholding_account_id',
        'payable_account_id',
        'is_active',
        'effective_from',
        'effective_to',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'withholding_rate' => 'decimal:4',
        'tier_details' => 'array',
        'minimum_amount' => 'decimal:4',
        'maximum_amount' => 'decimal:4',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public function country(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Location::class, 'country_id');
    }

    public function withholdingAccount(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Account::class, 'withholding_account_id', 'AccID');
    }

    public function payableAccount(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Account::class, 'payable_account_id', 'AccID');
    }
}
