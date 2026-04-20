<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Portfolio extends Model
{
    use HasFactory;

    protected $table = 'portfolio';

    protected $guarded = ['id'];

    protected $casts = [
        'quantity' => 'decimal:4',
        'avg_price' => 'decimal:4',
        'last_price' => 'decimal:4',
        'profit' => 'decimal:4',
    ];

    public function stock()
    {
        return $this->belongsTo(ListedCompany::class, 'stock_id');
    }
}
