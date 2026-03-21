<?php

namespace App\Models\Client_Sales;

use App\Models\User;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesReturn extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'return_number',
        'invoice_id',
        'customer_id',
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
        'inspection_notes',
        'customer_notes',
        'internal_notes',
        'created_by',
    ];

    protected $casts = [
        'return_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'restocking_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'received_date' => 'date',
    ];

    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class, 'invoice_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class);
    }

    public function details()
    {
        return $this->hasMany(SalesReturnDetail::class, 'return_id');
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
