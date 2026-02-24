<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductsRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive,draft,pending'],
            
            // Media
            'image' => ['nullable'], // Allow string (path) or file
            'gallery' => ['nullable', 'array'],
            'gallery.*' => ['nullable'], // Allow string (path) or file

            // ID
            'sku' => ['nullable', 'string', 'max:100', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:100', 'unique:products,barcode'],

            // Relations
            'parent_id' => ['nullable', 'exists:products,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'supplier_code' => ['nullable', 'string', 'max:50'],

            // Inventory
            'quantity' => ['nullable', 'integer', 'min:0'],
            'stock_status' => ['required', 'in:in_stock,out_of_stock,on_backorder'],
            'allow_checkout_when_out_of_stock' => ['boolean'],
            'with_storehouse_management' => ['boolean'],
            'minimum_order_quantity' => ['nullable', 'integer', 'min:1'],
            'maximum_order_quantity' => ['nullable', 'integer', 'min:1', 'gte:minimum_order_quantity'],

            // Pricing
            'price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0', 'lt:price'],
            'cost_per_item' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'tax_id' => ['nullable', 'integer'],
            'price_includes_tax' => ['boolean'],

            // Shipping
            'length' => ['nullable', 'numeric', 'min:0'],
            'wide' => ['nullable', 'numeric', 'min:0'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],

            // Other
            'order' => ['nullable', 'integer', 'min:0'],
            'is_featured' => ['boolean'],
            'product_type' => ['required', 'in:simple,variable'],

            // Variations (for variable products)
            'variations' => ['nullable', 'array'],
            'variations.*.sku' => ['nullable', 'string', 'max:150'],
            'variations.*.price' => ['nullable', 'numeric', 'min:0'],
            'variations.*.stock' => ['nullable', 'integer', 'min:0'],
            'variations.*.is_default' => ['nullable', 'boolean'],
            'variations.*.image' => ['nullable'], // Allow string or file
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
