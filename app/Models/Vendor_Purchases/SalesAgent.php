<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Client_Sales\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesAgent extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'agent_code',
        'name_ar',
        'name_en',
        'email',
        'phone',
        'mobile',
        'commission_rate',
        'target_amount',
        'supervisor_id',
        'hire_date',
        'termination_date',
        'is_active',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'commission_rate' => 'decimal:2',
        'target_amount' => 'decimal:2',
        'hire_date' => 'date',
        'termination_date' => 'date',
    ];

    public function supervisor()
    {
        return $this->belongsTo(SalesAgent::class, 'supervisor_id');
    }

    public function subordinates()
    {
        return $this->hasMany(SalesAgent::class, 'supervisor_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class);
    }
}
