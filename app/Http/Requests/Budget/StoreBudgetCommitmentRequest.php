<?php

namespace App\Http\Requests\Budget;

use Illuminate\Foundation\Http\FormRequest;

class StoreBudgetCommitmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'budget_id' => 'required|exists:budgets,id',
            'budget_item_id' => 'required|exists:budget_items,id',
            'reference_type' => 'required|in:purchase_order,contract,invoice,requisition,other',
            'reference_id' => 'required|string', // Can be ID or string depending on implementation
            'reference_number' => 'required|string',
            'commitment_date' => 'required|date',
            'expected_expense_date' => 'nullable|date|after_or_equal:commitment_date',
            'expiry_date' => 'nullable|date|after_or_equal:commitment_date',
            'vendor_id' => 'nullable|exists:suppliers,id', // Assuming suppliers table
            'description' => 'nullable|string',
            'committed_amount' => 'required|numeric|min:0.01',
        ];
    }
}
