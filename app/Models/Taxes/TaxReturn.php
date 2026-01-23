<?php

namespace App\Models\Taxes;

use App\Models\CompanyInfo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxReturn extends Model
{
    use HasFactory;

    protected $table = 'tax_returns';

    protected $fillable = [
        'return_number',
        'tax_period_id',
        'entity_id',
        'entity_type',
        'return_type',
        'filing_date',
        'filing_method',
        'taxable_amount',
        'tax_amount',
        'tax_paid',
        'tax_due',
        'tax_refund',
        'tax_details',
        'status',
        'assessment_number',
        'assessment_date',
        'document_path',
        'reference_number',
        'notes',
        'prepared_by',
        'reviewed_by',
        'approved_by',
        'submitted_by',
    ];

    protected $casts = [
        'filing_date' => 'date',
        'assessment_date' => 'date',
        'tax_details' => 'array',
        'taxable_amount' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'tax_paid' => 'decimal:4',
        'tax_due' => 'decimal:4',
        'tax_refund' => 'decimal:4',
    ];

    public function taxPeriod()
    {
        return $this->belongsTo(TaxPeriod::class);
    }

    public function entity()
    {
        // Polymorphic or dynamic relationship could be used here depending on entity_type,
        // but for now, we link to CompanyInfo as per schema fallback.
        // If 'companies' table existed, we would link to it.
        // Assuming CompanyInfo is the model for 'company_infos'
        return $this->belongsTo(CompanyInfo::class, 'entity_id');
    }
}
