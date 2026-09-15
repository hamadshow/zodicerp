<?php

namespace App\Services;

use App\Models\Products;
use Illuminate\Validation\ValidationException;

class ProductSellingGuard
{
    public static function isSellable(Products $product): bool
    {
        if ($product->children()->count() > 0) {
            return false;
        }

        return true;
    }

    public static function filterSellableIds(array $productIds): array
    {
        $productIds = array_values(array_filter(array_map('intval', $productIds)));
        if (empty($productIds)) {
            return [];
        }

        $hasChildren = Products::query()
            ->whereIn('id', $productIds)
            ->whereHas('children')
            ->pluck('id')
            ->all();

        return array_values(array_diff($productIds, $hasChildren));
    }

    /**
     * @throws ValidationException
     */
    public static function assertSellable(int $productId): void
    {
        $product = Products::query()->find($productId);
        if (! $product) {
            throw ValidationException::withMessages([
                'product_id' => ["Product #{$productId} does not exist."],
            ]);
        }

        if (! self::isSellable($product)) {
            $sku = $product->sku ? "/SKU:{$product->sku}" : '';
            $name = $product->name ?? "Product #{$productId}";
            throw ValidationException::withMessages([
                'product_id' => ["{$name}{$sku} is a configurable parent product and cannot be sold directly. Please select one of its variant/SKU children."],
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    public static function assertAllSellable(array $productIds): void
    {
        $productIds = array_values(array_unique(array_filter(array_map('intval', $productIds))));
        foreach ($productIds as $id) {
            self::assertSellable($id);
        }
    }
}
