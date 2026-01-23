<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class PurchaseDiscount extends Model
{
    use HasFactory, SoftDeletes;

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
        'is_active',
        'is_compound',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'is_compound' => 'boolean',
        'value' => 'decimal:2',
        'min_purchase_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
    ];

    public function suppliers()
    {
        return $this->belongsToMany(Supplier::class, 'purchase_discount_suppliers', 'discount_id', 'supplier_id')
                    ->withTimestamps();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
