<?php

namespace App\Models\Client_Sales;

use App\Models\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesTax extends Model
{
    use SoftDeletes;

    protected $table = 'sales_taxes';

    protected $fillable = [
        'tax_code',
        'name_ar',
        'name_en',
        'tax_rate',
        'tax_type',
        'calculation_method',
        'is_collectable',
        'account_id',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'tax_rate' => 'decimal:2',
        'is_collectable' => 'boolean',
        'is_active' => 'boolean',
        'created_by' => 'integer',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }
}
