<?php

namespace App\Models;

use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\SalesOrderDetail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_orders';

    protected $fillable = [
        'order_number',
        'customer_id',
        'quotation_id',
        'currency_id',
        'exchange_rate',
        'order_date',
        'delivery_date',
        'actual_delivery_date',
        'price_list_id',
        'warehouse_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'shipping_cost',
        'total_amount',
        'advance_payment',
        'status',
        'sales_agent_id',
        'priority',
        'shipping_method',
        'shipping_address_id',
        'payment_terms',
        'customer_notes',
        'internal_notes',
        'created_by',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'order_date' => 'date',
        'delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'base_total' => 'decimal:2',
        'advance_payment' => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    /**
     * Get the customer that owns the order.
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the user who created the order.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the order items for the order.
     */
    public function items()
    {
        return $this->hasMany(SalesOrderDetail::class, 'order_id');
    }

    /**
     * Generate a unique order number.
     */
    public static function generateOrderNumber()
    {
        do {
            $orderNumber = 'ORD-' . date('Y') . '-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }
}