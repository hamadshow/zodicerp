<?php

namespace App\Models\Budget;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetCommitment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'budget_id',
        'budget_item_id',
        'reference_type',
        'reference_id',
        'reference_number',
        'committed_amount',
        'utilized_amount',
        'remaining_amount',
        'commitment_date',
        'expected_expense_date',
        'expiry_date',
        'status',
        'description',
        'vendor_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'committed_amount' => 'decimal:4',
        'utilized_amount' => 'decimal:4',
        'remaining_amount' => 'decimal:4',
        'commitment_date' => 'date',
        'expected_expense_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class);
    }

    /**
     * Get the vendor/supplier associated with the commitment.
     * Note: References 'suppliers' table if 'vendors' does not exist.
     */
    public function vendor()
    {
        // Adjust model path if using Supplier instead of Vendor
        if (class_exists(\App\Models\Vendor_Purchases\Supplier::class)) {
            return $this->belongsTo(\App\Models\Vendor_Purchases\Supplier::class, 'vendor_id');
        }

        return $this->belongsTo(\App\Models\Vendor_Purchases\Supplier::class, 'vendor_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function updator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'updated_by');
    }
}
