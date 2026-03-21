<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskPriorityRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'level' => 'sometimes|required|integer|min:1|max:10',
            'description' => 'nullable|string',
        ];
    }
}
