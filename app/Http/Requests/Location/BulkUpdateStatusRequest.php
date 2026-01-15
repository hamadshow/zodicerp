<?php

namespace App\Http\Requests\Location;

use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateStatusRequest extends FormRequest
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
            'type' => 'required|in:countries,cities,areas',
            'ids' => 'required|array',
            'ids.*' => 'integer',
            'status' => 'required|in:active,inactive',
        ];
    }
}
