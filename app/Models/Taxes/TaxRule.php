<?php

namespace App\Models\Taxes;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxRule extends Model
{
    use HasFactory;

    protected $table = 'tax_rules';

    protected $fillable = [
        'rule_code',
        'name_ar',
        'name_en',
        'country_id',
        'state_id',
        'city_id',
        'apply_to',
        'customer_type',
        'vendor_type',
        'customer_id',
        'vendor_id',
        'product_category_id',
        'product_id',
        'service_id',
        'tax_id',
        'tax_group_id',
        'priority',
        'is_exclusive',
        'minimum_amount',
        'maximum_amount',
        'effective_from',
        'effective_to',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_exclusive' => 'boolean',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'priority' => 'integer',
        'minimum_amount' => 'decimal:4',
        'maximum_amount' => 'decimal:4',
    ];

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function tax()
    {
        return $this->belongsTo(Tax::class);
    }

    public function taxGroup()
    {
        return $this->belongsTo(TaxGroup::class);
    }
}
