<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email:rfc,dns|max:255',
            'phone' => ['required', 'string', 'regex:/^([0-9\s\-\+\(\)]*)$/', 'min:8', 'max:20'],
            'career_id' => 'required|exists:careers,id',
            'gender' => 'required|in:male,female',
            'age' => 'required|integer|min:18|max:65',
            'nationality' => 'required|string|max:100',
            'country' => 'required|string|max:100',
            'city' => 'required|string|max:100',
            'area' => 'nullable|string|max:255',
            'qualification' => 'required|in:high-school,diploma,bachelor,master',
            'specialization' => 'required|string|max:255',
            'experience_years' => 'required|in:0,1,3,5',
            'shift_type' => 'nullable|array',
            'shift_type.*' => 'in:full-time,remote',
            'expected_salary' => 'nullable|numeric|min:0|max:999999',
            'availability_date' => 'nullable|string|max:255',
            'cv' => 'required|file|mimes:pdf,doc,docx|max:5120',
            'certificates' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
            'message' => 'nullable|string|max:5000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('Full name is required.'),
            'email.required' => __('Email address is required.'),
            'email.email' => __('Please provide a valid email address.'),
            'phone.required' => __('Phone number is required.'),
            'phone.regex' => __('Phone number must contain only numbers and standard symbols (+, -, (, )).'),
            'age.required' => __('Age is required.'),
            'age.integer' => __('Age must be a valid number.'),
            'age.min' => __('Minimum age for application is 18.'),
            'career_id.required' => __('Please select the job you are applying for.'),
            'cv.required' => __('Please upload your CV.'),
            'cv.mimes' => __('CV must be a file of type: PDF, DOC, or DOCX.'),
            'cv.max' => __('CV size must not exceed 5MB.'),
            'certificates.mimes' => __('Certificates must be a file of type: PDF, DOC, or DOCX.'),
            'certificates.max' => __('Certificates size must not exceed 5MB.'),
        ];
    }

    protected function prepareForValidation()
    {
        $this->merge([
            'name' => strip_tags(trim($this->input('name', ''))),
            'message' => $this->filled('message') ? strip_tags($this->input('message')) : null,
            'specialization' => $this->filled('specialization') ? strip_tags($this->input('specialization')) : null,
            'availability_date' => $this->filled('availability_date') ? strip_tags($this->input('availability_date')) : null,
            'area' => $this->filled('area') ? strip_tags($this->input('area')) : null,
        ]);
    }
}
