<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesDiscount extends Model
{
    use SoftDeletes;

    protected $table = 'sales_discounts';

    protected $fillable = [
        'discount_code',
        'name_ar',
        'name_en',
        'discount_type',
        'value',
        'min_purchase_amount',
        'max_discount_amount',
        'applicable_to',
        'start_date',
        'end_date',
        'max_uses',
        'current_uses',
        'max_uses_per_customer',
        'is_active',
        'is_compound',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_purchase_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'is_compound' => 'boolean',
        'current_uses' => 'integer',
        'max_uses' => 'integer',
        'max_uses_per_customer' => 'integer',
    ];

    public function customers()
    {
        return $this->belongsToMany(Customer::class, 'sales_discount_customers', 'discount_id', 'customer_id')
            ->withTimestamps();
    }
}
