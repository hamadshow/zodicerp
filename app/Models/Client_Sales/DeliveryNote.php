<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Warehouses;
use App\Models\User;

class DeliveryNote extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'delivery_number',
        'invoice_id',
        'order_id',
        'customer_id',
        'warehouse_id',
        'delivery_date',
        'delivery_time',
        'delivered_by',
        'received_by',
        'delivery_type',
        'shipping_method',
        'vehicle_number',
        'driver_name',
        'driver_phone',
        'total_items',
        'total_quantity',
        'status',
        'delivery_status',
        'signature_data',
        'customer_feedback',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'delivery_date' => 'date',
        'total_items' => 'integer',
        'total_quantity' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class, 'invoice_id');
    }

    public function order()
    {
        return $this->belongsTo(SalesOrder::class, 'order_id');
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
        return $this->hasMany(DeliveryNoteDetail::class, 'delivery_note_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliverer()
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }
}
