<?php

namespace App\Http\Requests\Inventory;

use App\Models\Products;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $priceIncludesTax = filter_var(
            $this->input('price_includes_tax', false),
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );

        $this->merge([
            'is_featured' => filter_var($this->is_featured, FILTER_VALIDATE_BOOLEAN),
            'allow_checkout_when_out_of_stock' => filter_var($this->allow_checkout_when_out_of_stock, FILTER_VALIDATE_BOOLEAN),
            'with_storehouse_management' => filter_var($this->with_storehouse_management, FILTER_VALIDATE_BOOLEAN),
            'price_includes_tax' => $priceIncludesTax,
            'tax_id' => $priceIncludesTax === true ? $this->input('tax_id') : null,
            'maximum_order_quantity' => $this->input('maximum_order_quantity') === ''
                ? null
                : $this->input('maximum_order_quantity'),
            'delete_image' => filter_var($this->delete_image, FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $companyId = $this->user()?->company_id;
        $isVariableProduct = $this->input('product_type') === Products::PRODUCT_TYPE_VARIATION
            && ! $this->filled('parent_id');

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'status' => ['required', 'in:published,draft,pending,active,inactive'],

            // Media rules live in Products::domainRules() (shared with Update
            // and the API): files validated by extension/size, persisted
            // strings constrained to products/*, suppliers/*, media/*.

            // ID
            'sku' => ['nullable', 'string', 'max:100', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:100', 'unique:products,barcode'],

            // Relations
            'brand_id' => ['nullable', 'exists:brands,id'],
            'unit_id' => ['nullable', 'exists:item_units,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'supplier_code' => ['nullable', 'string', 'max:50'],

            // Inventory
            'quantity' => ['nullable', 'integer', 'min:0'],
            'reorder_point' => ['sometimes', 'required', 'integer', 'min:0'],
            'stock_status' => [Rule::requiredIf(! $isVariableProduct), 'in:in_stock,out_of_stock,on_backorder'],
            'allow_checkout_when_out_of_stock' => ['boolean'],
            'with_storehouse_management' => ['boolean'],
            'minimum_order_quantity' => ['sometimes', 'required', 'integer', 'min:1'],
            'maximum_order_quantity' => ['nullable', 'integer', 'min:1', 'gte:minimum_order_quantity'],

            // Pricing
            'price' => [
                Rule::prohibitedIf(fn () => $isVariableProduct || ($this->input('product_type') === Products::PRODUCT_TYPE_SIMPLE && ! $this->filled('parent_id'))),
                'nullable', 'numeric', 'min:0',
            ],
            'sale_price' => [
                Rule::prohibitedIf(fn () => $isVariableProduct || ($this->input('product_type') === Products::PRODUCT_TYPE_SIMPLE && ! $this->filled('parent_id'))),
                'nullable', 'numeric', 'min:0', 'lt:price',
            ],
            'cost_per_item' => ['nullable', 'numeric', 'min:0'],
            'start_date' => [
                Rule::prohibitedIf(fn () => $isVariableProduct || ($this->input('product_type') === Products::PRODUCT_TYPE_SIMPLE && ! $this->filled('parent_id'))),
                'nullable', 'date',
            ],
            'end_date' => [
                Rule::prohibitedIf(fn () => $isVariableProduct || ($this->input('product_type') === Products::PRODUCT_TYPE_SIMPLE && ! $this->filled('parent_id'))),
                'nullable', 'date', 'after:start_date',
            ],
            'tax_id' => [
                'nullable',
                'integer',
                Rule::exists('taxes', 'id')->where(function ($query) use ($companyId) {
                    $query->where(function ($query) use ($companyId) {
                        if ($companyId === null) {
                            $query->whereNull('company_id');
                        } else {
                            $query->where('company_id', $companyId)->orWhereNull('company_id');
                        }
                    });
                }),
            ],
            'price_includes_tax' => ['boolean'],

            // Shipping
            'length' => ['nullable', 'numeric', 'min:0'],
            'wide' => ['nullable', 'numeric', 'min:0'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],

            // Other
            'order' => ['nullable', 'integer', 'min:0'],
            'is_featured' => ['boolean'],

            // Shared Product Domain contract — the ONE authoritative source for
            // product_type + parent_id semantics (web and API both consume it).
            ...Products::domainRules(),

            // Product Domain (Phase 1):
            // - parent_id set  => the row is a variation child (attribute combos in payload).
            // - parent_id null => a standalone product; only a variation parent carries variations.
            'variations' => [
                'nullable',
                'array',
                Rule::requiredIf(fn () => $this->input('product_type') === Products::PRODUCT_TYPE_VARIATION && ! $this->filled('parent_id')),
                Rule::prohibitedIf(fn () => in_array($this->input('product_type'), [Products::PRODUCT_TYPE_SIMPLE, Products::PRODUCT_TYPE_SERVICE], true) && ! $this->filled('parent_id')),
            ],
            'variations.*.sku' => ['nullable', 'string', 'max:150'],
            'variations.*.barcode' => ['nullable', 'string', 'max:100'],
            'variations.*.cost_per_item' => ['nullable', 'numeric', 'min:0'],
            'variations.*.price_includes_tax' => ['nullable', 'boolean'],
            'variations.*.tax_id' => [
                'nullable',
                'integer',
                Rule::exists('taxes', 'id')->where(function ($query) use ($companyId) {
                    $query->where(function ($query) use ($companyId) {
                        if ($companyId === null) {
                            $query->whereNull('company_id');
                        } else {
                            $query->where('company_id', $companyId)->orWhereNull('company_id');
                        }
                    });
                }),
            ],
            'variations.*.stock' => ['nullable', 'integer', 'min:0'],
            'variations.*.stock_status' => ['nullable', 'in:in_stock,out_of_stock,on_backorder'],
            'variations.*.reorder_point' => ['nullable', 'integer', 'min:0'],
            'variations.*.minimum_order_quantity' => ['nullable', 'integer', 'min:1'],
            'variations.*.maximum_order_quantity' => ['nullable', 'integer', 'min:1', 'gte:variations.*.minimum_order_quantity'],
            'variations.*.weight' => ['nullable', 'numeric', 'min:0'],
            'variations.*.length' => ['nullable', 'numeric', 'min:0'],
            'variations.*.wide' => ['nullable', 'numeric', 'min:0'],
            'variations.*.height' => ['nullable', 'numeric', 'min:0'],
            'variations.*.is_default' => ['nullable', 'boolean'],
            'variations.*.image' => ['nullable'], // Allow string or file
            'variations.*.images' => ['nullable', 'array', 'max:20'],
            'variations.*.images.*' => ['nullable'],
            // Accept both shapes: attributes (array of objects) or attribute_values (associative)
            'variations.*.attributes' => ['nullable', 'array'],
            'variations.*.attributes.*.attribute_id' => ['required_with:variations.*.attributes', 'integer'],
            'variations.*.attributes.*.attribute_value' => ['required_with:variations.*.attributes'],
            'variations.*.attribute_values' => ['nullable', 'array'],

            // SEO
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],

            // Actions
            'save_action' => ['nullable', 'string', 'in:save,save_and_exit'],
        ];
    }
}
