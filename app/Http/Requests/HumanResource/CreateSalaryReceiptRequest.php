<?php

namespace App\Http\Requests\HumanResource;

use Illuminate\Foundation\Http\FormRequest;

class CreateSalaryReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payroll_result_id' => ['required', 'integer', 'exists:payroll_results,id'],
            'payment_date' => ['required', 'date'],
            'payment_method' => ['required', 'string', 'max:100'],
            'bank_account' => ['nullable', 'string', 'max:255'],
            'gross_salary' => ['prohibited'],
            'total_deductions' => ['prohibited'],
            'total_advances' => ['prohibited'],
            'total_rewards' => ['prohibited'],
            'net_salary' => ['prohibited'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->route('payrollResult')) {
            $this->merge(['payroll_result_id' => $this->route('payrollResult')->getKey()]);
        }
    }
}
