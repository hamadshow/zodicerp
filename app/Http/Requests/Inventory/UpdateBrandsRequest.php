<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBrandsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $brandId = $this->route('brand') ? $this->route('brand')->id : $this->route('id');

        return [
            'name' => 'required|string|max:255',
            'parent_id' => [
                'nullable',
                'exists:brands,id',
                function ($attribute, $value, $fail) use ($brandId) {
                    if ($value == $brandId) {
                        $fail('A brand cannot be its own parent.');
                    }
                },
            ],
            'status' => 'required|in:active,inactive',
            'order' => 'nullable|integer',
        ];
    }
}
