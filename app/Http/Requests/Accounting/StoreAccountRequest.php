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
                'required',
                'integer',
                'min:1',
                Rule::unique('accounts', 'AccCode'),
            ],
            'AccName' => [
                'required',
                'string',
                'max:50',
            ],
            'AccType' => [
                'required',
                'integer',
                Rule::in([1, 2, 3, 4, 5]),
            ],
            'AccParent' => [
                'nullable',
                'integer',
                'different:AccCode',
                'exists:accounts,AccCode',
            ],
            'AccDmType' => [
                'required',
                'integer',
                Rule::in([1, 2]),
            ],
            'AccFinal' => [
                'required',
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
                'exists:branch_infos,id',
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
            if (!$parentCode) {
                return;
            }

            $parent = Account::where('AccCode', $parentCode)->first();
            if ($parent && (int) ($parent->AccFinal ?? 0) === 1) {
                $validator->errors()->add('AccParent', 'Parent account cannot be final.');
            }
        });
    }
}
