<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'QaidRef' => [
                'nullable',
                'string',
                'max:500',
            ],
            'QaidDate' => [
                'required',
                'date',
            ],
            'QaidDetails' => [
                'nullable',
                'string',
                'max:500',
            ],
            'QaidStatus' => [
                'required',
                'string',
                'max:50',
            ],
            'lines' => [
                'required',
                'array',
                'min:1',
            ],
            'lines.*.QaidBodyAccID' => [
                'required',
                'integer',
                'exists:accounts,AccID',
            ],
            'lines.*.QaidDebit' => [
                'required',
                'numeric',
                'min:0',
            ],
            'lines.*.QaidCredit' => [
                'required',
                'numeric',
                'min:0',
            ],
            'lines.*.QaidBodyDetails' => [
                'nullable',
                'string',
                'max:500',
            ],
            'lines.*.idName' => [
                'nullable',
                'string',
                'max:30',
            ],
            'lines.*.NameDetails' => [
                'nullable',
                'string',
                'max:100',
            ],
            'lines.*.copCode' => [
                'nullable',
                'string',
                'max:50',
            ],
        ];
    }
}
