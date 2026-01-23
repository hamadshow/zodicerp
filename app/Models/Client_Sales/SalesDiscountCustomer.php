<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Model;

class SalesDiscountCustomer extends Model {
    protected $table = 'sales_discount_customers';

    protected $fillable = [
        'discount_id',
        'customer_id'
    ];

    public function discount() {
        return $this->belongsTo(SalesDiscount::class, 'discount_id');
    }

    public function customer() {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
