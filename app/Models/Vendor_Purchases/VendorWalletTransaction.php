<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorWalletTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_wallet_id',
        'amount',
        'type',
        'status',
        'reference_type',
        'reference_id',
        'transaction_number',
        'description',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function wallet()
    {
        return $this->belongsTo(VendorWallet::class, 'vendor_wallet_id');
    }
}
