<?php

namespace App\Http\Controllers\Home;

use App\Http\Controllers\Controller;
use App\Models\Products;
use Illuminate\Http\Request;

class CartController extends Controller
{
    private function bumpCartVersion(Request $request): int
    {
        $next = (int) $request->session()->get('cart_version', 0) + 1;
        $request->session()->put('cart_version', $next);
        return $next;
    }

    private function normalizeVariants($value)
    {
        if (!is_array($value)) {
            return $value;
        }

        $isAssoc = array_keys($value) !== range(0, count($value) - 1);

        $normalized = [];
        foreach ($value as $k => $v) {
            if ($v === null) {
                continue;
            }
            if (is_string($v) && trim($v) === '') {
                continue;
            }

            $normalized[$k] = $this->normalizeVariants($v);
        }

        if ($isAssoc) {
            ksort($normalized);
        }

        return $normalized;
    }

    private function formatCartSummary(array $cart): array
    {
        $cartCount = 0;
        foreach ($cart as $item) {
            if ((int) ($item['quantity'] ?? 0) > 0) {
                $cartCount += 1;
            }
        }

        return [
            'cartCount' => $cartCount,
        ];
    }

    public function add(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'variants' => ['nullable', 'array'],
        ]);

        $product = Products::where('status', 'active')->findOrFail($validated['product_id']);

        $quantity = (int) ($validated['quantity'] ?? 1);
        $variants = $this->normalizeVariants($validated['variants'] ?? []);

        $manageStock = (bool) ($product->with_storehouse_management ?? false);
        $availableStock = (int) ($product->quantity ?? 0);
        $allowOutOfStock = (bool) ($product->allow_checkout_when_out_of_stock ?? false);

        if ($manageStock) {
            if ($availableStock <= 0 && !$allowOutOfStock) {
                return response()->json([
                    'message' => 'This product is out of stock.',
                ], 422);
            }

            if ($availableStock > 0 && $quantity > $availableStock && !$allowOutOfStock) {
                return response()->json([
                    'message' => "Only {$availableStock} item(s) available.",
                ], 422);
            }
        }

        $variantHash = md5(json_encode($variants, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $itemKey = $product->id . '|' . $variantHash;

        $cart = $request->session()->get('cart', []);
        if (!is_array($cart)) {
            $cart = [];
        }

        $existingQty = (int) ($cart[$itemKey]['quantity'] ?? 0);
        $newQty = $existingQty + $quantity;

        if ($manageStock) {
            if ($availableStock > 0 && $newQty > $availableStock && !$allowOutOfStock) {
                return response()->json([
                    'message' => "Only {$availableStock} item(s) available.",
                ], 422);
            }
        }

        $cart[$itemKey] = [
            'product_id' => $product->id,
            'quantity' => $newQty,
            'variants' => $variants,
        ];

        $request->session()->put('cart', $cart);
        $cartVersion = $this->bumpCartVersion($request);

        return response()->json([
            'message' => 'Added to cart.',
            ...$this->formatCartSummary($cart),
            'cartVersion' => $cartVersion,
            'itemKey' => $itemKey,
            'quantity' => $newQty,
        ]);
    }

    public function mini(Request $request)
    {
        $cart = $request->session()->get('cart', []);
        if (!is_array($cart)) {
            $cart = [];
        }

        $productIds = [];
        foreach ($cart as $item) {
            if (isset($item['product_id'])) {
                $productIds[] = (int) $item['product_id'];
            }
        }
        $productIds = array_values(array_unique(array_filter($productIds)));

        $products = Products::whereIn('id', $productIds)
            ->where('status', 'active')
            ->with(['brand', 'parent'])
            ->get()
            ->keyBy('id');

        $items = [];
        $subTotal = 0.0;

        $formatImage = function ($img) {
            if (!$img) {
                return null;
            }

            if (str_starts_with($img, 'http')) {
                return $img;
            }

            $normalized = ltrim($img, '/');
            $normalized = preg_replace('#^(files|storage|media-files)/#', '', $normalized);

            return '/media-files/' . $normalized;
        };

        foreach ($cart as $itemKey => $cartItem) {
            $productId = (int) ($cartItem['product_id'] ?? 0);
            $product = $products->get($productId);
            if (!$product) {
                continue;
            }

            $qty = (int) ($cartItem['quantity'] ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $unitPrice = (float) ($product->sale_price ?? $product->price ?? 0);
            $lineTotal = $unitPrice * $qty;
            $subTotal += $lineTotal;

            $image = $product->image;
            if (!$image && $product->parent) {
                $image = $product->parent->image;
            }

            $items[] = [
                'itemKey' => (string) $itemKey,
                'productId' => $product->id,
                'name' => $product->name,
                'image' => $formatImage($image) ?: 'https://via.placeholder.com/80x80',
                'supplier' => $product->brand ? $product->brand->name : 'ZodiMarket',
                'quantity' => $qty,
                'unitPrice' => $unitPrice,
                'lineTotal' => $lineTotal,
                'variants' => is_array($cartItem['variants'] ?? null) ? $cartItem['variants'] : [],
            ];
        }

        $items = array_slice($items, 0, 5);
        $cartVersion = (int) $request->session()->get('cart_version', 0);

        return response()->json([
            'items' => $items,
            'subTotal' => $subTotal,
            'tax' => 0,
            'total' => $subTotal,
            ...$this->formatCartSummary($cart),
            'cartVersion' => $cartVersion,
        ]);
    }

    public function remove(Request $request)
    {
        $validated = $request->validate([
            'item_key' => ['required', 'string'],
        ]);

        $cart = $request->session()->get('cart', []);
        if (!is_array($cart)) {
            $cart = [];
        }

        unset($cart[$validated['item_key']]);
        $request->session()->put('cart', $cart);
        $cartVersion = $this->bumpCartVersion($request);

        return response()->json([
            'message' => 'Removed from cart.',
            ...$this->formatCartSummary($cart),
            'cartVersion' => $cartVersion,
        ]);
    }
}
