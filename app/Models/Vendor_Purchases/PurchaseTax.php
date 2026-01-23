<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Account;
use App\Models\User;

class PurchaseTax extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tax_code',
        'name_ar',
        'name_en',
        'tax_rate',
        'tax_type',
        'calculation_method',
        'is_recoverable',
        'recoverable_percentage',
        'account_id',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'tax_rate' => 'decimal:2',
        'is_recoverable' => 'boolean',
        'recoverable_percentage' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
