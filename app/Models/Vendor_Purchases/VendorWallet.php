<?php

namespace App\Models\Vendor_Purchases;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VendorWallet extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_id',
        'balance',
        'pending_balance',
        'withdrawn_balance',
        'currency_id',
        'is_active',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'pending_balance' => 'decimal:2',
        'withdrawn_balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function transactions()
    {
        return $this->hasMany(VendorWalletTransaction::class);
    }

    /**
     * Credit the wallet balance.
     */
    public function credit($amount, $referenceType = null, $referenceId = null, $description = null)
    {
        $this->increment('balance', $amount);

        return $this->transactions()->create([
            'amount' => $amount,
            'type' => 'credit',
            'status' => 'completed',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'transaction_number' => 'CR'.time().rand(100, 999),
            'description' => $description,
        ]);
    }

    /**
     * Debit the wallet balance.
     */
    public function debit($amount, $referenceType = null, $referenceId = null, $description = null)
    {
        if ($this->balance < $amount) {
            throw new \Exception('Insufficient balance');
        }

        $this->decrement('balance', $amount);

        return $this->transactions()->create([
            'amount' => $amount,
            'type' => 'debit',
            'status' => 'completed',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'transaction_number' => 'DB'.time().rand(100, 999),
            'description' => $description,
        ]);
    }
}
