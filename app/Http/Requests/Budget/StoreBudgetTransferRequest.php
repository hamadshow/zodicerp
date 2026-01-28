<?php

namespace App\Http\Requests\Budget;

use Illuminate\Foundation\Http\FormRequest;

class StoreBudgetTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transfer_date' => 'required|date',
            'transfer_type' => 'required|in:internal,interdepartmental,supplemental',
            'reason' => 'required|string',
            'justification' => 'required_if:transfer_type,interdepartmental,supplemental',
            'from_budget_id' => 'required|exists:budgets,id',
            'from_budget_item_id' => 'required|exists:budget_items,id',
            'from_amount' => 'required|numeric|min:0.01',
            'to_amount' => 'required|numeric|min:0.01',
            'to_budget_id' => 'required|exists:budgets,id',
            'to_budget_item_id' => 'required|exists:budget_items,id|different:from_budget_item_id',
            'notes' => 'nullable|string',
            'reference_document' => 'nullable|file|mimes:pdf,jpg,png,doc,docx|max:10240',
        ];
    }

    public function messages()
    {
        return [
            'to_budget_item_id.different' => 'Source and Destination budget items cannot be the same.',
        ];
    }
}
