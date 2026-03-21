<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Currency;
use App\Models\User;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_number',
        'supplier_id',
        'order_id',
        'currency_id',
        'exchange_rate',
        'invoice_date',
        'due_date',
        'posting_date',
        'warehouse_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'other_costs',
        'total_amount',
        'paid_amount',
        'payment_status',
        'invoice_type',
        'payment_terms',
        'notes',
        'internal_notes',
        'is_posted',
        'posted_at',
        'posted_by',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'posting_date' => 'date',
        'posted_at' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'other_costs' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2', // Generated column
        'paid_amount' => 'decimal:2',
        'base_paid' => 'decimal:2', // Generated column
        'balance_amount' => 'decimal:2', // Generated column
        'is_posted' => 'boolean',
        'supplier_id' => 'integer',
        'order_id' => 'integer',
        'currency_id' => 'integer',
        'warehouse_id' => 'integer',
        'created_by' => 'integer',
        'posted_by' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function order()
    {
        return $this->belongsTo(PurchaseOrder::class, 'order_id');
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

    public function poster()
    {
        // Assuming User model is in App\Models\User
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function items()
    {
        return $this->hasMany(PurchaseInvoiceDetail::class, 'invoice_id');
    }
}
