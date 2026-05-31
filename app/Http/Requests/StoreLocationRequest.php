<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLocationRequest extends FormRequest
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
            'parent_id' => 'nullable|exists:locations,id',
            'location_type' => 'required|in:country,state,city,district,area',
            'code' => 'nullable|string|max:50',
            'status' => 'boolean',
            'sort_order' => 'integer',
            'translations' => 'required|array',
            'translations.ar.name' => 'required|string|max:255',
            'translations.en.name' => 'required|string|max:255',
        ];
    }
}
