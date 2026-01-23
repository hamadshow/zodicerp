<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\User;

class PurchaseQuotation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'quotation_number',
        'supplier_id',
        'currency_id',
        'exchange_rate',
        'quotation_date',
        'expiry_date',
        'valid_days',
        'warehouse_id',
        'subtotal',
        'discount_percentage',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'total_amount',
        'status',
        'approval_notes',
        'sent_date',
        'sent_method',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'quotation_date' => 'date',
        'expiry_date' => 'date',
        'sent_date' => 'date',
        'exchange_rate' => 'decimal:6',
        'subtotal' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2', // Generated column
        'valid_days' => 'integer',
        'supplier_id' => 'integer',
        'currency_id' => 'integer',
        'warehouse_id' => 'integer',
        'created_by' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function creator()
    {
        // Assuming User model is in App\Models\User
        return $this->belongsTo(User::class, 'created_by');
    }
}
