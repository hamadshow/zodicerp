<?php

namespace App\Http\Requests\Cash;

use Illuminate\Foundation\Http\FormRequest;

class StoreTreasuryTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Spatie permissions will handle this in controller
    }

    public function rules(): array
    {
        return [
            'from_treasury_id' => 'required|exists:cash_accounts,id|different:to_treasury_id',
            'to_treasury_id' => 'required|exists:cash_accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'transfer_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'currency' => 'nullable|string|size:3',
        ];
    }

    public function messages(): array
    {
        return [
            'from_treasury_id.different' => __('TreasuryTransfer.validation.different_treasuries'),
            'amount.min' => __('TreasuryTransfer.validation.amount_min'),
        ];
    }
}
