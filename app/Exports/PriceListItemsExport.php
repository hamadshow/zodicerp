<?php

namespace App\Exports;

use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\PriceListItem;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class PriceListItemsExport implements FromQuery, WithHeadings, WithMapping
{
    public function __construct(private PriceList $priceList) {}

    public function query(): Builder
    {
        return PriceListItem::query()
            ->where('price_list_id', $this->priceList->id)
            ->with([
                'product:id,product_code,name,sku',
                'unit:id,name',
            ])
            ->orderBy('id');
    }

    public function headings(): array
    {
        return [
            'price_list_id',
            'price_list_code',
            'price_list_name',
            'currency_code',
            'product_id',
            'product_code',
            'product_name',
            'sku',
            'unit_id',
            'unit',
            'min_quantity',
            'unit_price',
            'discount_percentage',
            'discount_amount',
            'effective_date',
            'expiry_date',
            'notes',
        ];
    }

    public function map($item): array
    {
        return [
            $this->priceList->id,
            $this->priceList->code,
            $this->priceList->name_en ?: $this->priceList->name_ar,
            $this->priceList->currency?->code,
            $item->product_id,
            $item->product?->product_code,
            $item->product?->name,
            $item->product?->sku,
            $item->unit_id,
            $item->unit?->name,
            $item->min_quantity,
            $item->unit_price,
            $item->discount_percentage,
            $item->discount_amount,
            $item->effective_date?->toDateString(),
            $item->expiry_date?->toDateString(),
            $item->notes,
        ];
    }
}
