<?php

namespace App\Http\Resources\Cash;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TreasuryTransferResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $fromAccount = $this->fromAccount();
        $toAccount = $this->toAccount();
        $isCashFrom = $fromAccount instanceof \App\Models\CashAccount;
        $isCashTo = $toAccount instanceof \App\Models\CashAccount;

        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'from_treasury' => [
                'id' => $this->from_treasury_id,
                'name' => $fromAccount ? ($isCashFrom ? $fromAccount->name : $fromAccount->account_name) : null,
                'account_code' => $fromAccount ? ($isCashFrom ? $fromAccount->account_code : $fromAccount->account_number) : null,
            ],
            'to_treasury' => [
                'id' => $this->to_treasury_id,
                'name' => $toAccount ? ($isCashTo ? $toAccount->name : $toAccount->account_name) : null,
                'account_code' => $toAccount ? ($isCashTo ? $toAccount->account_code : $toAccount->account_number) : null,
            ],
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'transfer_date' => $this->transfer_date->format('Y-m-d'),
            'notes' => $this->notes,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'creator' => $this->creator ? $this->creator->name : null,
            'approver' => $this->approver ? $this->approver->name : null,
            'rejector' => $this->rejector ? $this->rejector->name : null,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
