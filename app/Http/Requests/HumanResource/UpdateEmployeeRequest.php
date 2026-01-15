<?php

namespace App\Http\Requests\HumanResource;

use Illuminate\Foundation\Http\FormRequest;

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
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $this->route('employee')->id,
            'phone' => 'nullable|string|max:20',
            'department' => 'required|string|max:255',
            'position' => 'required|string|max:255',
            'hire_date' => 'required|date',
            'salary' => 'nullable|numeric|min:0',
            'nationality' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive,on-leave,terminated',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }
}