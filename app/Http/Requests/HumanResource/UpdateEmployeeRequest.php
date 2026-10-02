<?php

namespace App\Http\Requests\HumanResource;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Backend\HumanResource\Profession;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $employee = $this->route('employee');
        $employeeId = $employee instanceof \Illuminate\Database\Eloquent\Model ? $employee->id : $employee;

        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:employees,email,'.$employeeId,
            'password' => 'nullable|string|min:8',
            'role' => 'nullable|string|max:255',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:roles,id',
            'phone' => 'nullable|string|max:20|unique:employees,phone,'.$employeeId,
            'department' => 'required|string|max:255',
            'position' => 'required|string|max:255',
            'hire_date' => 'required|date',
            'salary' => 'nullable|numeric|min:0',
            'nationality' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive,on-leave,terminated,probation',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'manager_id' => [
                'nullable',
                'integer',
                'exists:employees,id',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $companyId = (int) app(\App\Services\CompanyContext::class)->id();
                    if ($value && ! \App\Models\Employee::query()->where('company_id', $companyId)->whereKey((int) $value)->exists()) {
                        $fail('The selected manager must belong to your company.');
                    }
                },
            ],
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Prevent self-reference in the manager hierarchy.
            $managerId = $this->input('manager_id');
            $employee = $this->route('employee');
            if ($managerId && $employee instanceof \App\Models\Employee && (int) $managerId === (int) $employee->id) {
                $validator->errors()->add('manager_id', 'An employee cannot be their own manager.');
            }

            $salary = $this->input('salary');
            $position = $this->input('position');

            if ($salary && $position) {
                $profession = Profession::where('profession_name', $position)->first();
                if ($profession) {
                    if ($salary < $profession->min_salary || $salary > $profession->max_salary) {
                        $validator->errors()->add('salary', "Salary must be between {$profession->min_salary} and {$profession->max_salary} for the selected profession.");
                    }
                }
            }
        });
    }
}
