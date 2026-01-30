<?php

namespace App\Http\Requests\Accounting;

use App\Models\Account;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $account = $this->route('account');
        $accountId = $account ? $account->AccID : null;

        return [
            'AccCode' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('accounts', 'AccCode')->ignore($accountId, 'AccID'),
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
                'nullable',
                'string',
                Rule::in(['asset', 'cash', 'bank', 'expense', 'COGs', 'liability', 'equity', 'income']),
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
            $account = $this->route('account');
            if (!$account) {
                return;
            }

            $parentCode = $this->input('AccParent');
            if ($parentCode) {
                $currentCode = $account->AccCode;
                if ((int) $parentCode === 0) {
                    return;
                }
                if ((int) $parentCode === (int) $currentCode) {
                    $validator->errors()->add('AccParent', 'Parent cannot be the same as the account.');
                    return;
                }
                $ancestorCode = $parentCode;
                while ($ancestorCode && (int)$ancestorCode !== 0) {
                    if ((int)$ancestorCode === (int)$currentCode) {
                        $validator->errors()->add('AccParent', 'Circular parent selection is not allowed.');
                        break;
                    }
                    $ancestor = Account::where('AccCode', $ancestorCode)->first();
                    if (!$ancestor) {
                        // If ancestor code is valid (non-zero) but not found in DB
                        $validator->errors()->add('AccParent', 'Parent account code does not exist.');
                        break;
                    }
                    $ancestorCode = $ancestor->AccParent;
                }
            }

            $finalFlag = (int) ($this->input('AccFinal') ?? 0);

        });
    }
}
