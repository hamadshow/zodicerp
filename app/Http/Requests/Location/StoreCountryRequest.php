<?php

namespace App\Http\Requests\Location;

use Illuminate\Foundation\Http\FormRequest;

class StoreCountryRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:10',
            'currency' => 'nullable|string|max:255',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'default_language' => 'nullable|string|max:5',
            'timezone' => 'nullable|string|max:255',
            'phone_code' => 'nullable|string|max:50',
            'status' => 'required|in:active,inactive',
        ];
    }
}
