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
        return Products::with(['categories', 'brand', 'unit'])
            ->where('company_id', $this->companyId)
            ->whereNull('parent_id')
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
            $product->cost_per_item,
            $product->quantity,
            $product->unit ? $product->unit->name : '',
            $product->status,
            $product->brand ? $product->brand->name : '',
            $product->categories->pluck('name')->implode(', '),
            $product->is_featured ? 'yes' : 'no',
            $product->is_default ? 'yes' : 'no',
            $product->order,
        ];
    }
}
