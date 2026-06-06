<?php

namespace App\Http\Requests\Accounting;

use App\Models\Account;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'AccCode' => [
                'nullable', // Generated on backend
                'integer',
                'min:1',
            ],
            'AccName' => [
                'required',
                'string',
                'max:50',
            ],
            'AccType' => [
                'required',
                'integer',
            ],
            'AccParent' => [
                'nullable',
                'integer',
            ],
            'Nature' => [
                'required_without:AccParent',
                'nullable',
                'string',
                Rule::in(['asset', 'Inventory', 'Accounts Receivable', 'cash', 'bank', 'expense', 'COGs', 'liability', 'equity', 'income']),
            ],
            'AccDmType' => [
                'required_without:AccParent',
                'nullable',
                'integer',
                Rule::in([1, 2]),
            ],
            'AccFinal' => [
                'required_without:AccParent',
                'nullable',
                'boolean',
            ],
            'AccMaxLimt' => [
                'nullable',
                'integer',
                'min:0',
            ],
            'AccMaxDuration' => [
                'nullable',
                'integer',
                'min:0',
            ],
            'AccBranch' => [
                'nullable',
                'integer',
                'exists:branches,id',
            ],
            'AccStopped' => [
                'boolean',
            ],
            'AccNote' => [
                'nullable',
                'string',
            ],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $parentCode = $this->input('AccParent');
            if (! $parentCode) {
                return;
            }

            if ((int) $parentCode === 0) {
                return;
            }

            $accCode = (int) $this->input('AccCode');
            if ($accCode && (int) $parentCode === $accCode) {
                $validator->errors()->add('AccParent', 'Parent cannot be the same as the account.');

                return;
            }

            $parent = Account::where('AccCode', $parentCode)->first();
            if (! $parent) {
                $validator->errors()->add('AccParent', 'Parent account code does not exist.');
            }

        });
    }
}
