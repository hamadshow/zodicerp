<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class UpdateJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reference' => [
                'nullable',
                'string',
                'max:500',
            ],
            'date' => [
                'required',
                'date',
            ],
            'description' => [
                'nullable',
                'string',
                'max:500',
            ],
            'status' => [
                'required',
                'string',
                'max:50',
            ],
            'lines' => [
                'required',
                'array',
                'min:1',
            ],
            'lines.*.account_id' => [
                'required',
                'integer',
                'exists:accounts,AccID',
            ],
            'lines.*.debit' => [
                'required',
                'numeric',
                'min:0',
            ],
            'lines.*.credit' => [
                'required',
                'numeric',
                'min:0',
            ],
            'lines.*.description' => [
                'nullable',
                'string',
                'max:500',
            ],
            'lines.*.related_id_name' => [
                'nullable',
                'string',
                'max:30',
            ],
            'lines.*.related_name_details' => [
                'nullable',
                'string',
                'max:100',
            ],
            'lines.*.cost_center_code' => [
                'nullable',
                'string',
                'max:50',
            ],
        ];
    }
}
