<?php

namespace App\Models\Taxes;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxPeriod extends Model
{
    use HasFactory;

    protected $table = 'tax_periods';

    protected $fillable = [
        'period_code',
        'country_id',
        'tax_type_id',
        'period_type',
        'period_year',
        'period_number',
        'period_name_ar',
        'period_name_en',
        'start_date',
        'end_date',
        'due_date',
        'filing_deadline',
        'status',
        'is_extended',
        'extension_days',
        'created_by',
        'closed_by',
        'closed_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'due_date' => 'date',
        'filing_deadline' => 'date',
        'closed_date' => 'date',
        'is_extended' => 'boolean',
        'period_year' => 'integer',
        'period_number' => 'integer',
        'extension_days' => 'integer',
    ];

    public function country()
    {
        return $this->belongsTo(Location::class, 'country_id');
    }

    public function taxType()
    {
        return $this->belongsTo(TaxType::class);
    }
}
