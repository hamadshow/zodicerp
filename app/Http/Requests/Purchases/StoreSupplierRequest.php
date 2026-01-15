<?php

namespace App\Http\Requests\Purchases;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
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
            'supplier_name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:suppliers',
            'phone' => 'nullable|string|max:20',
            'status' => 'required|in:active,inactive',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}
