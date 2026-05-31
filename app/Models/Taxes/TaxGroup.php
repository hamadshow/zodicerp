<?php

namespace App\Models\Taxes;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxGroup extends Model
{
    use HasFactory;

    protected $table = 'tax_groups';

    protected $fillable = [
        'group_code',
        'name_ar',
        'name_en',
        'description',
        'country_id',
        'apply_to',
        'is_compound',
        'calculation_order',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_compound' => 'boolean',
        'is_active' => 'boolean',
        'calculation_order' => 'integer',
    ];

    public function country()
    {
        return $this->belongsTo(Location::class, 'country_id');
    }
}
