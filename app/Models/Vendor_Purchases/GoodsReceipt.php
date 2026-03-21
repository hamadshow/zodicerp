<?php

namespace App\Models\Vendor_Purchases;

use App\Models\User;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GoodsReceipt extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'receipt_number',
        'order_id',
        'invoice_id',
        'warehouse_id',
        'receipt_date',
        'receipt_time',
        'received_by',
        'checked_by',
        'approved_by',
        'receipt_type',
        'total_items',
        'total_quantity',
        'total_value',
        'status',
        'quality_status',
        'notes',
        'inspection_notes',
        'created_by',
    ];

    protected $casts = [
        'receipt_date' => 'date',
        'total_quantity' => 'decimal:4',
        'total_value' => 'decimal:2',
    ];

    public function details()
    {
        return $this->hasMany(GoodsReceiptDetail::class, 'receipt_id');
    }

    public function order()
    {
        return $this->belongsTo(PurchaseOrder::class, 'order_id');
    }

    public function invoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'invoice_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function checker()
    {
        return $this->belongsTo(User::class, 'checked_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
