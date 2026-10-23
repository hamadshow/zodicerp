<?php

namespace App\Services;

use App\Models\ProductVariation;
use App\Models\Products;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Product catalog rules shared by screens that must offer ONLY genuinely
 * sellable products (Phase 1 Product Domain):
 *
 *   * simple / service root SKUs of the active company
 *   * simple child SKUs linked to an active variation parent by exactly one
 *     product_variations row (the variable parent itself is never sellable)
 *
 * The canonical definition of these rules lives with the price list
 * administration screen (PriceListController::eligibleSellableProductsQuery /
 * variationDisplayNames); this service exists so the Sales Quotations flow can
 * apply the exact same rules without duplicating them inside another
 * controller. Presentation names are built the same way the price list screen
 * builds them (parent + variation attributes + brand), so both screens show
 * identical labels for the same child SKU.
 *
 * This class never resolves a price: ProductPriceResolver remains the single
 * pricing authority.
 */
class SellableProductCatalog
{
    /**
     * Query builder over sellable products of the given company.
     */
    public function sellableQuery(int $companyId): Builder
    {
        return Products::query()
            ->where('products.company_id', $companyId)
            ->where('products.status', 'active')
            ->where(function ($query) use ($companyId) {
                $query->where(function ($rootQuery) {
                    $rootQuery->whereNull('products.parent_id')
                        ->whereIn('products.product_type', [
                            Products::PRODUCT_TYPE_SIMPLE,
                            Products::PRODUCT_TYPE_SERVICE,
                        ]);
                })->orWhere(function ($variationQuery) use ($companyId) {
                    $variationQuery->where('products.product_type', Products::PRODUCT_TYPE_SIMPLE)
                        ->whereNotNull('products.parent_id')
                        ->whereExists(function ($parentQuery) use ($companyId) {
                            $parentQuery->selectRaw('1')
                                ->from('products as variation_parents')
                                ->whereColumn('variation_parents.id', 'products.parent_id')
                                ->where('variation_parents.company_id', $companyId)
                                ->where('variation_parents.product_type', Products::PRODUCT_TYPE_VARIATION)
                                ->where('variation_parents.status', 'active')
                                ->whereNull('variation_parents.deleted_at');
                        })
                        ->whereExists(function ($linkQuery) {
                            $linkQuery->selectRaw('1')
                                ->from('product_variations')
                                ->whereColumn('product_variations.product_id', 'products.id')
                                ->whereColumn('product_variations.configurable_product_id', 'products.parent_id');
                        })
                        ->whereRaw(
                            '(select count(*) from product_variations as selectable_variations where selectable_variations.product_id = products.id and selectable_variations.configurable_product_id = products.parent_id) = 1'
                        );
                });
            });
    }

    /**
     * Display-only composite names for child SKUs. Stored product names are
     * never modified.
     *
     * @param  Collection<int, Products>  $products
     * @return array<int, string>
     */
    public function displayNames(Collection $products, string $separator = ', '): array
    {
        $children = $products
            ->filter(fn ($product) => $product instanceof Products
                && $product->parent_id !== null
                && $product->product_type === Products::PRODUCT_TYPE_SIMPLE)
            ->keyBy(fn (Products $product) => (int) $product->id);

        if ($children->isEmpty()) {
            return [];
        }

        $children->loadMissing([
            'parent:id,name,brand_id,product_type',
            'parent.brand:id,name',
            'brand:id,name',
        ]);

        $variations = ProductVariation::query()
            ->with(['items.attribute.details'])
            ->whereIn('product_id', $children->keys())
            ->get()
            ->groupBy('product_id');

        $displayNames = [];

        foreach ($children as $child) {
            $parent = $child->parent;
            if (! $parent || $parent->product_type !== Products::PRODUCT_TYPE_VARIATION) {
                continue;
            }

            $links = $variations->get($child->id, collect())
                ->filter(fn (ProductVariation $variation) => (int) $variation->configurable_product_id === (int) $parent->id);

            if ($links->count() !== 1) {
                continue;
            }

            $values = $this->variationAttributeValues($links->first());
            $brand = $parent->brand?->name ?: $child->brand?->name;

            $displayNames[(int) $child->id] = $this->compositeName($parent->name, $values, $brand, $separator);
        }

        return $displayNames;
    }

    /**
     * Composite label for one product: its stored name plus any computed
     * variation display name. Never mutates the product row.
     */
    public function labelFor(Products $product, array $displayNames): string
    {
        return $displayNames[(int) $product->id] ?? (string) $product->name;
    }

    /**
     * Attribute value titles of one variation link, ordered by attribute
     * definition order (same ordering the price list screen uses).
     *
     * @return array<int, string>
     */
    private function variationAttributeValues(ProductVariation $variation): array
    {
        return $variation->items
            ->sort(function ($left, $right) {
                $leftOrder = $left->attribute?->order ?? PHP_INT_MAX;
                $rightOrder = $right->attribute?->order ?? PHP_INT_MAX;
                $order = $leftOrder <=> $rightOrder;

                return $order !== 0 ? ($left->attribute_id <=> $right->attribute_id) : $order;
            })
            ->map(function ($item) {
                $detail = $item->attribute?->details
                    ->first(fn ($detail) => (int) $detail->id === (int) $item->attribute_value);

                return trim((string) ($detail?->title ?? ''));
            })
            ->filter(fn (string $value) => $value !== '')
            ->values()
            ->all();
    }

    /**
     * Join base name, variation values and brand with the requested separator,
     * dropping empty and duplicate parts (same ordering as the price list).
     */
    private function compositeName(string $baseName, array $values, ?string $brand, string $separator): string
    {
        $parts = [];

        foreach (array_merge([$baseName], $values, [$brand]) as $part) {
            $part = trim((string) ($part ?? ''));
            if ($part === '') {
                continue;
            }

            $normalizedPart = Str::lower($part);
            $normalizedParts = array_map(fn (string $existing) => Str::lower($existing), $parts);
            if (in_array($normalizedPart, $normalizedParts, true)) {
                continue;
            }

            $existingName = Str::lower(implode($separator, $parts));
            $partPattern = '/(?<![\pL\pN])'.preg_quote($normalizedPart, '/').'(?![\pL\pN])/u';
            if (preg_match($partPattern, $existingName) === 1) {
                continue;
            }

            $parts[] = $part;
        }

        return implode($separator, $parts);
    }
}
