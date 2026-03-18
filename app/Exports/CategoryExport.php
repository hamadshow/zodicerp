<?php

namespace App\Exports;

use App\Models\Categories;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class CategoryExport implements FromCollection, WithHeadings, WithMapping
{
    protected $companyId;

    public function __construct($companyId)
    {
        $this->companyId = $companyId;
    }

    public function collection()
    {
        return Categories::where('company_id', $this->companyId)->get();
    }

    public function headings(): array
    {
        return [
            'Category Code',
            'Name',
            'Slug',
            'Description',
            'Parent ID',
            'Status',
            'Order',
            'Is Featured',
            'Is Default',
        ];
    }

    public function map($category): array
    {
        return [
            $category->category_code,
            $category->name,
            $category->slug,
            $category->description,
            $category->parent_id,
            $category->status,
            $category->order,
            $category->is_featured ? 'yes' : 'no',
            $category->is_default ? 'yes' : 'no',
        ];
    }
}
