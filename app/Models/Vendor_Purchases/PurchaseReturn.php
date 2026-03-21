<?php

namespace App\Models\Vendor_Purchases;

use App\Models\User;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseReturn extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'return_number',
        'invoice_id',
        'supplier_id',
        'warehouse_id',
        'return_date',
        'return_reason',
        'return_type',
        'subtotal',
        'tax_amount',
        'restocking_fee',
        'total_amount',
        'refund_amount',
        'refund_status',
        'status',
        'approval_notes',
        'received_by',
        'received_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'return_date' => 'date',
        'received_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'restocking_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'invoice_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function details()
    {
        return $this->hasMany(PurchaseReturnDetail::class, 'return_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
