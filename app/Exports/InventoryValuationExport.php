<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class InventoryValuationExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    protected $data;

    public function __construct($data)
    {
        $this->data = $data;
    }

    public function collection()
    {
        return collect($this->data);
    }

    public function headings(): array
    {
        return [
            'Product Name',
            'Unit',
            'Opening Qty',
            'Opening Value',
            'In Qty',
            'In Value',
            'Out Qty',
            'Out Value',
            'Closing Qty',
            'Avg Cost',
            'Closing Value',
        ];
    }

    public function map($row): array
    {
        return [
            $row['product_name'],
            $row['unit'],
            $row['opening_qty'],
            $row['opening_value'],
            $row['in_qty'],
            $row['in_value'],
            $row['out_qty'],
            $row['out_value'],
            $row['closing_qty'],
            $row['avg_cost'],
            $row['closing_value'],
        ];
    }
}
