<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxGroupDetail extends Model
{
    use HasFactory;

    protected $table = 'tax_group_details';

    protected $fillable = [
        'tax_group_id',
        'tax_id',
        'sequence_number',
        'is_compound_on_previous',
        'compound_base_tax_ids',
        'apply_to_subtotal',
        'include_in_total',
    ];

    protected $casts = [
        'is_compound_on_previous' => 'boolean',
        'apply_to_subtotal' => 'boolean',
        'include_in_total' => 'boolean',
        'compound_base_tax_ids' => 'array',
        'sequence_number' => 'integer',
    ];

    public function taxGroup()
    {
        return $this->belongsTo(TaxGroup::class);
    }

    public function tax()
    {
        return $this->belongsTo(Tax::class);
    }
}
