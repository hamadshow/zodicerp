<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetItem extends Model
{
    use HasFactory;

    protected $table = 'budget_items';

    protected $fillable = [
        'budget_id',
        'category_id',
        'account_id',
        'period_type',
        'annual_amount',
        'annual_actual',
        'annual_variance',
        'annual_variance_percent',
        'jan_amount', 'feb_amount', 'mar_amount', 'apr_amount', 'may_amount', 'jun_amount',
        'jul_amount', 'aug_amount', 'sep_amount', 'oct_amount', 'nov_amount', 'dec_amount',
        'jan_actual', 'feb_actual', 'mar_actual', 'apr_actual', 'may_actual', 'jun_actual',
        'jul_actual', 'aug_actual', 'sep_actual', 'oct_actual', 'nov_actual', 'dec_actual',
        'calculation_method',
        'calculation_formula',
        'basis_amount',
        'percentage_rate',
        'tax_id',
        'tax_included',
        'tax_amount',
        'notes',
        'assumptions',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'annual_amount' => 'decimal:4',
        'annual_actual' => 'decimal:4',
        'annual_variance' => 'decimal:4',
        'annual_variance_percent' => 'decimal:2',
        'basis_amount' => 'decimal:4',
        'percentage_rate' => 'decimal:2',
        'tax_amount' => 'decimal:4',
        'tax_included' => 'boolean',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BudgetCategory::class, 'category_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Account::class, 'account_id', 'AccID');
    }

    public function tax(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Taxes\Tax::class, 'tax_id');
    }
}
