<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:task_categories,id',
            'priority_id' => 'required|exists:task_priorities,id',
            'status_id' => 'required|exists:task_statuses,id',
            'due_date' => 'nullable|date',
        ];
    }
}
