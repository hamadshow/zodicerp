<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LandedCostDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'landed_cost_id',
        'purchase_expense_id',
        'amount',
        'description',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function landedCost()
    {
        return $this->belongsTo(LandedCost::class, 'landed_cost_id');
    }

    public function purchaseExpense()
    {
        return $this->belongsTo(PurchaseExpense::class, 'purchase_expense_id');
    }
}
