<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWarehouseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Get the warehouse ID from the route
        $warehouse = $this->route('warehouse');
        $warehouseId = $warehouse instanceof \Illuminate\Database\Eloquent\Model ? $warehouse->id : $warehouse;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('warehouses')->ignore($warehouseId)->where(function ($query) {
                    return $query->where('branch_id', $this->branch_id);
                }),
            ],
            'branch_id' => 'required|exists:branches,id',
            'manager' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'capacity' => 'nullable|integer|min:0',
            'status' => 'required|in:active,inactive,maintenance',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'A warehouse with this name already exists in the selected branch.',
            'branch_id.required' => 'Please select a branch.',
        ];
    }
}
