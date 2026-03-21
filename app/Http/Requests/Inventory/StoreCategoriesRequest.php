<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:categories,slug',
            'parent_id' => 'nullable|integer',
            'status' => 'required|in:active,inactive',
            'order' => 'required|integer|unique:categories,order',
            'description' => 'nullable|string',
            'icon' => 'nullable|string',
            'image' => ['nullable', function ($attribute, $value, $fail) {
                if (is_string($value)) {
                    return;
                }
                $validator = \Illuminate\Support\Facades\Validator::make(
                    ['image' => $value],
                    ['image' => 'image|max:2048']
                );
                if ($validator->fails()) {
                    $fail($validator->errors()->first('image'));
                }
            }],
            'is_featured' => 'boolean',
            'is_default' => 'boolean',
            'author_id' => 'nullable|integer',
            'author_type' => 'nullable|string',
        ];
    }
}
