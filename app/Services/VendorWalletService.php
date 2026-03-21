<?php

namespace App\Services;

use App\Models\Vendor_Purchases\VendorWallet;
use App\Models\Vendor_Purchases\VendorWalletTransaction;
use Illuminate\Support\Facades\DB;

class VendorWalletService
{
    /**
     * Credit vendor wallet after a successful order.
     */
    public function creditOrderEarnings(int $supplierId, float $amount, string $orderReference)
    {
        return DB::transaction(function () use ($supplierId, $amount, $orderReference) {
            $wallet = VendorWallet::firstOrCreate(
                ['supplier_id' => $supplierId],
                ['currency_id' => 1, 'balance' => 0, 'pending_balance' => 0, 'withdrawn_balance' => 0]
            );

            // In a real marketplace, we might move to pending first
            $wallet->increment('balance', $amount);

            return VendorWalletTransaction::create([
                'vendor_wallet_id' => $wallet->id,
                'type' => 'credit',
                'amount' => $amount,
                'currency_id' => $wallet->currency_id,
                'description' => "Earnings from order #{$orderReference}",
                'reference_type' => 'order',
                'reference_id' => $orderReference,
                'status' => 'completed',
            ]);
        });
    }

    /**
     * Handle withdrawal request.
     */
    public function requestWithdrawal(int $supplierId, float $amount)
    {
        return DB::transaction(function () use ($supplierId, $amount) {
            $wallet = VendorWallet::where('supplier_id', $supplierId)->firstOrFail();

            if ($wallet->balance < $amount) {
                throw new \Exception('Insufficient balance');
            }

            $wallet->decrement('balance', $amount);
            $wallet->increment('withdrawn_balance', $amount);

            return VendorWalletTransaction::create([
                'vendor_wallet_id' => $wallet->id,
                'type' => 'debit',
                'amount' => $amount,
                'currency_id' => $wallet->currency_id,
                'description' => 'Withdrawal request',
                'status' => 'pending',
            ]);
        });
    }
}
