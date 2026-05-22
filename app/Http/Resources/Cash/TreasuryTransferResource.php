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
        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'from_treasury' => [
                'id' => $this->fromTreasury->id,
                'name' => $this->fromTreasury->name,
                'account_code' => $this->fromTreasury->account_code,
            ],
            'to_treasury' => [
                'id' => $this->toTreasury->id,
                'name' => $this->toTreasury->name,
                'account_code' => $this->toTreasury->account_code,
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
