<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'sometimes|required|exists:task_categories,id',
            'priority_id' => 'sometimes|required|exists:task_priorities,id',
            'status_id' => 'sometimes|required|exists:task_statuses,id',
            'due_date' => 'nullable|date',
            'assigned_users' => 'nullable|array',
            'assigned_users.*' => 'exists:employees,id',
        ];
    }
}
