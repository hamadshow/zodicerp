<?php

namespace App\Models\Backend\Client_Sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlashSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'end_date',
        'status',
    ];

    protected $casts = [
        'end_date' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(FlashSaleItem::class);
    }
}
