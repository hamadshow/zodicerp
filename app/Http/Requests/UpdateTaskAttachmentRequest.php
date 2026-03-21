<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskAttachmentRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'file_path' => 'sometimes|required|string',
            'file_name' => 'sometimes|required|string',
        ];
    }
}
