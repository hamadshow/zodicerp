<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskAssignmentRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'task_id' => 'required|exists:tasks,id',
            'user_id' => 'required|exists:employees,id',
            'assigned_at' => 'nullable|date',
        ];
    }
}
