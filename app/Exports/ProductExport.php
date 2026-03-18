<?php

namespace App\Exports;

use App\Models\Products;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductExport implements FromCollection, WithHeadings, WithMapping
{
    protected $companyId;

    public function __construct($companyId)
    {
        $this->companyId = $companyId;
    }

    public function collection()
    {
        // Eager load relationships for performance
        return Products::with(['categories', 'brand'])
            ->whereNull('parent_id') // Export only parent products for now? Or all? User said "products table", usually main products.
            // Let's export all for completeness, or maybe just main ones. 
            // If we export variants, we need to handle parent_id.
            // For simplicity and common use case, let's export all but include parent_code if exists.
            ->get();
    }

    public function headings(): array
    {
        return [
            'Product Code',
            'Name',
            'Slug',
            'SKU',
            'Description',
            'Price',
            'Sale Price',
            'Cost Price',
            'Quantity',
            'Unit',
            'Status',
            'Brand',
            'Categories', // Comma separated names
            'Is Featured',
            'Is Default',
            'Order',
        ];
    }

    public function map($product): array
    {
        return [
            $product->product_code,
            $product->name,
            $product->slug,
            $product->sku,
            $product->description,
            $product->price,
            $product->sale_price,
            $product->cost_price,
            $product->quantity,
            $product->unit,
            $product->status,
            $product->brand ? $product->brand->name : '',
            $product->categories->pluck('name')->implode(', '),
            $product->is_featured ? 'yes' : 'no',
            $product->is_default ? 'yes' : 'no',
            $product->order,
        ];
    }
}
