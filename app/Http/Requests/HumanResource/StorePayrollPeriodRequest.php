<?php

namespace App\Http\Requests\HumanResource;

use Illuminate\Foundation\Http\FormRequest;

class StorePayrollPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'overtime_rate_per_hour' => ['nullable', 'numeric', 'min:0'],
            'absence_deduction_per_day' => ['nullable', 'numeric', 'min:0'],
            'late_deduction_per_incident' => ['nullable', 'numeric', 'min:0'],
            'unpaid_leave_deduction_per_day' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
