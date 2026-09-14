<?php

namespace App\Http\Requests\HumanResource;

use App\Models\Backend\HumanResource\Profession;
use App\Services\CompanyContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class UpdateProfessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('professions.update') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'profession_name' => $this->profession_name === null ? null : Str::squish((string) $this->profession_name),
            'profession_code' => $this->profession_code === null ? null : strtoupper(trim((string) $this->profession_code)),
            'category' => $this->category === '' ? null : $this->category,
        ]);
    }

    public function rules(): array
    {
        $companyId = app(CompanyContext::class)->id();
        $profession = $this->route('professionId') ?? $this->route('profession');
        $professionId = $profession instanceof Profession ? $profession->getKey() : $profession;

        return [
            'company_id' => ['prohibited'],
            'profession_name' => ['required', 'string', 'max:255'],
            'profession_code' => [
                'required',
                'string',
                'max:100',
                Rule::unique('professions', 'profession_code')
                    ->where(fn ($query) => $query->where('company_id', $companyId))
                    ->ignore($professionId),
            ],
            'category' => [
                'nullable',
                'integer',
                Rule::exists('departments', 'id')->where(fn ($query) => $query->where(function ($scope) use ($companyId): void {
                    $scope->where('company_id', $companyId)->orWhereNull('company_id');
                })),
            ],
            'description' => ['nullable', 'string'],
            'min_salary' => ['nullable', 'numeric', 'min:0'],
            'max_salary' => ['nullable', 'numeric', 'min:0', 'after_or_equal:min_salary'],
            'required_experience' => ['nullable', 'integer', 'min:0'],
            'education_level' => ['nullable', Rule::in(['High School', 'Diploma', 'Bachelor', 'Master', 'PhD'])],
            'key_skills' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
