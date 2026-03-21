<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskAttachmentRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'task_id' => 'required|exists:tasks,id',
            'file_path' => 'required|string',
            'file_name' => 'required|string',
        ];
    }
}
