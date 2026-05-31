<?php

namespace App\Models\Taxes;

use App\Models\Account;
use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model; // Assuming Account model exists in App\Models or App\Models\Accounting
use Illuminate\Database\Eloquent\SoftDeletes;

class Tax extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'taxes';

    protected $fillable = [
        'tax_type_id',
        'tax_code',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'location_id',
        'jurisdiction_code',
        'tax_rate',
        'tax_amount',
        'calculation_method',
        'calculation_basis',
        'rounding_method',
        'rounding_precision',
        'minimum_amount',
        'maximum_amount',
        'threshold_amount',
        'recoverable_percentage',
        'withholding_rate',
        'tax_account_id',
        'expense_account_id',
        'payable_account_id',
        'receivable_account_id',
        'is_active',
        'is_default',
        'effective_from',
        'effective_to',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tax_rate' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'minimum_amount' => 'decimal:4',
        'maximum_amount' => 'decimal:4',
        'threshold_amount' => 'decimal:4',
        'recoverable_percentage' => 'decimal:2',
        'withholding_rate' => 'decimal:4',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'rounding_precision' => 'integer',
    ];

    public function taxType()
    {
        return $this->belongsTo(TaxType::class);
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    // Relationships for accounts
    // Note: Account model might be in a different namespace, adjusting if needed.
    // Based on previous files, Account seems to be in App\Models or App\Models\Accounting
    // I'll assume App\Models\Account based on imports above, but let's check.

    public function taxAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'tax_account_id', 'AccID');
    }

    public function expenseAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'expense_account_id', 'AccID');
    }

    public function payableAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'payable_account_id', 'AccID');
    }

    public function receivableAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'receivable_account_id', 'AccID');
    }
}
