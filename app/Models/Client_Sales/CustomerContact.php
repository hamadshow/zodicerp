<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerContact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'name_ar',
        'name_en',
        'position_ar',
        'position_en',
        'department',
        'phone',
        'mobile',
        'email',
        'whatsapp',
        'is_primary',
        'is_decision_maker',
        'receive_statements',
        'receive_marketing',
        'notes',
        'birthday',
        'anniversary'
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_decision_maker' => 'boolean',
        'receive_statements' => 'boolean',
        'receive_marketing' => 'boolean',
        'birthday' => 'date',
        'anniversary' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
