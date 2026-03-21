<?php

namespace App\Models\Client_Sales;

use App\Models\Categories;
use App\Models\Vendor_Purchases\SalesAgent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommissionRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_agent_id',
        'product_category_id',
        'min_amount',
        'max_amount',
        'commission_rate',
        'effective_date',
        'expiry_date',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'effective_date' => 'date',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function salesAgent()
    {
        return $this->belongsTo(SalesAgent::class);
    }

    public function category()
    {
        return $this->belongsTo(Categories::class, 'product_category_id');
    }
}
