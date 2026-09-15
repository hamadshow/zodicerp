<?php

namespace App\Services;

use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Products;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\PriceListItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use RuntimeException;

class ProductPriceResolver
{
    private const PRICE_SCALE = 4;
    private const DISCOUNT_SCALE = 2;
    private const MATH_SCALE = 6;

    public function resolve(array $context): array
    {
        $product = $context['product'] ?? null;
        if (! $product instanceof Products) {
            throw new RuntimeException('ProductPriceResolver::resolve requires a Products instance in context.product.');
        }

        $customer = $context['customer'] ?? null;
        if ($customer !== null && ! $customer instanceof Customer) {
            throw new RuntimeException('context.customer must be a Customer instance or null.');
        }

        $unitId = (int) ($context['unit_id'] ?? $product->unit_id);
        if ($unitId <= 0) {
            $unitId = (int) $product->unit_id;
        }

        $quantity = $this->toNumeric($context['quantity'] ?? '1');
        if ($this->cmp($quantity, '0') < 0) {
            $quantity = '1.000000';
        }

        $transactionDate = $context['transaction_date'] ?? null;
        $dateStr = $transactionDate instanceof \DateTimeInterface
            ? $transactionDate->format('Y-m-d')
            : (is_string($transactionDate) && $transactionDate !== '' ? $transactionDate : Carbon::now()->format('Y-m-d'));

        $explicitPriceListId = isset($context['price_list_id']) ? (int) $context['price_list_id'] : null;

        $candidateLists = [];

        if ($explicitPriceListId !== null && $explicitPriceListId > 0) {
            $candidateLists[] = ['id' => $explicitPriceListId, 'level' => 'explicit'];
        }

        if ($customer !== null && $customer->price_list_id > 0) {
            $candidateLists[] = ['id' => (int) $customer->price_list_id, 'level' => 'customer_price_list'];
        }

        $group = $customer?->group;
        if ($group === null && $customer?->customer_group_id > 0) {
            $group = CustomerGroup::find($customer->customer_group_id);
        }
        if ($group && $group->price_list_id > 0) {
            $candidateLists[] = ['id' => (int) $group->price_list_id, 'level' => 'customer_group_price_list'];
        }

        $idsToLoad = array_values(array_unique(array_map(
            fn($c) => (int) $c['id'],
            array_filter($candidateLists, fn($c) => $c['id'] > 0)
        )));
        $loadedLists = empty($idsToLoad) ? collect() : $this->loadPriceLists($idsToLoad);

        foreach ($candidateLists as $candidate) {
            $list = $loadedLists->get($candidate['id']);
            if (! $list) {
                continue;
            }

            if (! $this->isListActiveOnDate($list, $dateStr)) {
                continue;
            }

            $matchedItem = $this->matchBestListItem($list, (int) $product->id, $unitId, $quantity, $dateStr);
            if ($matchedItem !== null) {
                return $this->buildResultFromListItem($matchedItem, $list, $candidate['level'], $unitId);
            }
        }

        $groupDiscountPct = '0.00';
        if ($group && $group->discount_percentage !== null) {
            $groupDiscountPct = $this->num($group->discount_percentage, self::DISCOUNT_SCALE);
        }

        if ($this->cmp($groupDiscountPct, '0') > 0) {
            $base = $this->pickProductBasePrice($product);
            if ($base !== null) {
                $basePrice = $this->num($base, self::PRICE_SCALE);
                $discountAmt = $this->mul($basePrice, $this->div($groupDiscountPct, '100.00', self::MATH_SCALE));
                $final = $this->sub($basePrice, $discountAmt);
                if ($this->cmp($final, '0') < 0) {
                    $final = '0.0000';
                }

                return [
                    'unit_price' => $basePrice,
                    'final_price' => $this->num($final, self::PRICE_SCALE),
                    'source' => 'customer_group_discount',
                    'price_list_id' => null,
                    'price_list_item_id' => null,
                    'unit_id' => $unitId,
                    'discount_percentage' => $groupDiscountPct,
                    'discount_amount' => $this->num($discountAmt, self::DISCOUNT_SCALE),
                    'resolved_at' => Carbon::now(),
                ];
            }
        }

        if ($product->sale_price !== null && (string) $product->sale_price !== '') {
            $sp = $this->num($product->sale_price, self::PRICE_SCALE);
            return [
                'unit_price' => $sp,
                'final_price' => $sp,
                'source' => 'product_sale_price',
                'price_list_id' => null,
                'price_list_item_id' => null,
                'unit_id' => $unitId,
                'discount_percentage' => '0.00',
                'discount_amount' => '0.00',
                'resolved_at' => Carbon::now(),
            ];
        }

        if ($product->price !== null && (string) $product->price !== '') {
            $p = $this->num($product->price, self::PRICE_SCALE);
            return [
                'unit_price' => $p,
                'final_price' => $p,
                'source' => 'product_price',
                'price_list_id' => null,
                'price_list_item_id' => null,
                'unit_id' => $unitId,
                'discount_percentage' => '0.00',
                'discount_amount' => '0.00',
                'resolved_at' => Carbon::now(),
            ];
        }

        return [
            'unit_price' => null,
            'final_price' => null,
            'source' => 'none',
            'price_list_id' => null,
            'price_list_item_id' => null,
            'unit_id' => $unitId,
            'discount_percentage' => null,
            'discount_amount' => null,
            'resolved_at' => Carbon::now(),
        ];
    }

    public function resolveMany(array $lineContexts): array
    {
        $results = [];
        foreach ($lineContexts as $index => $ctx) {
            $results[$index] = $this->resolve($ctx);
        }

        return $results;
    }

    private function loadPriceLists(array $ids): Collection
    {
        return PriceList::query()
            ->with(['items'])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');
    }

    private function isListActiveOnDate(PriceList $list, string $dateStr): bool
    {
        if (! $list->is_active) {
            return false;
        }

        $validFrom = $list->valid_from;
        $validTo = $list->valid_to;

        if ($validFrom !== null && (string) $validFrom > $dateStr) {
            return false;
        }

        if ($validTo !== null && (string) $validTo < $dateStr) {
            return false;
        }

        return true;
    }

    private function matchBestListItem(PriceList $list, int $productId, int $unitId, string $quantity, string $dateStr): ?PriceListItem
    {
        $candidates = [];

        foreach ($list->items as $item) {
            if ((int) $item->product_id !== $productId) {
                continue;
            }

            if ($item->unit_id !== null && (int) $item->unit_id !== $unitId) {
                continue;
            }

            $effective = $item->effective_date;
            if ($effective !== null && (string) $effective > $dateStr) {
                continue;
            }

            $expiry = $item->expiry_date;
            if ($expiry !== null && (string) $expiry < $dateStr) {
                continue;
            }

            $minQty = $this->toNumeric($item->min_quantity ?? '0');
            if ($this->cmp($quantity, $minQty) < 0) {
                continue;
            }

            $candidates[] = ['minQty' => $minQty, 'item' => $item];
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, fn($a, $b) => $this->cmp($b['minQty'], $a['minQty']));

        return $candidates[0]['item'];
    }

    private function buildResultFromListItem(PriceListItem $item, PriceList $list, string $sourceLevel, int $unitId): array
    {
        $unitPrice = $this->num($item->unit_price ?? '0', self::PRICE_SCALE);

        $discountPct = $this->num($item->discount_percentage ?? '0', self::DISCOUNT_SCALE);
        $discountAmt = $this->num($item->discount_amount ?? '0', self::DISCOUNT_SCALE);

        $pctAmt = $this->mul($unitPrice, $this->div($discountPct, '100.00', self::MATH_SCALE));
        $totalDiscount = $this->add($pctAmt, $discountAmt);

        $final = $this->sub($unitPrice, $totalDiscount);
        if ($this->cmp($final, '0') < 0) {
            $final = '0.0000';
        }

        return [
            'unit_price' => $unitPrice,
            'final_price' => $this->num($final, self::PRICE_SCALE),
            'source' => $sourceLevel,
            'price_list_id' => (int) $list->id,
            'price_list_item_id' => (int) $item->id,
            'unit_id' => $item->unit_id !== null ? (int) $item->unit_id : $unitId,
            'discount_percentage' => $discountPct,
            'discount_amount' => $this->num($totalDiscount, self::DISCOUNT_SCALE),
            'resolved_at' => Carbon::now(),
        ];
    }

    private function pickProductBasePrice(Products $product): ?string
    {
        if ($product->sale_price !== null && (string) $product->sale_price !== '') {
            return (string) $product->sale_price;
        }

        if ($product->price !== null && (string) $product->price !== '') {
            return (string) $product->price;
        }

        return null;
    }

    private function toNumeric(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '0.000000';
        }

        if (is_numeric($value)) {
            return bcadd((string) $value, '0', self::MATH_SCALE);
        }

        throw new RuntimeException("Value must be numeric, got: " . var_export($value, true));
    }

    private function num(string $value, int $scale): string
    {
        return bcadd((string) $value, '0', $scale);
    }

    private function cmp(string $a, string $b): int { return bccomp($a, $b, self::MATH_SCALE); }
    private function add(string $a, string $b): string { return bcadd($a, $b, self::MATH_SCALE); }
    private function sub(string $a, string $b): string { return bcsub($a, $b, self::MATH_SCALE); }
    private function mul(string $a, string $b): string { return bcmul($a, $b, self::MATH_SCALE); }
    private function div(string $a, string $b, int $scale): string
    {
        if (bccomp($b, '0', $scale) === 0) {
            return '0';
        }

        return bcdiv($a, $b, $scale);
    }
}
