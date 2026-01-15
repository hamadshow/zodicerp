<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductsRequest extends FormRequest
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
        $productId = $this->route('product')->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive,draft,pending'],
            
            // Media
            'image' => ['nullable'], // Allow string (path) or file
            'gallery' => ['nullable', 'array'],
            'gallery.*' => ['nullable'], // Allow string (path) or file
            'existing_images' => ['nullable', 'array'],
            'existing_images.*' => ['string'],
            'delete_image' => ['nullable', 'boolean'],

            // ID
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products')->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('products')->ignore($productId)],

            // Relations
            'parent_id' => [
                'nullable', 
                'exists:products,id',
                function ($attribute, $value, $fail) use ($productId) {
                    // Prevent self-parenting
                    if ($value == $productId) {
                        $fail('A product cannot be its own parent.');
                    }
                },
            ],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'store_id' => ['nullable', 'integer'],

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

            // SEO
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
        ];
    }
}
