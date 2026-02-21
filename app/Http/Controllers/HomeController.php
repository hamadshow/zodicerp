<?php

namespace App\Http\Controllers;

use App\Models\Ad;
use App\Models\Products;
use App\Models\Categories;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $categories = $this->getTopCategories();

        $featuredProducts = Products::with('brand')
            ->where('is_featured', true)
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get()
            ->map(function ($product) {
                $imagePath = null;

                if ($product->image) {
                    $imagePath = $product->image;
                } elseif (is_array($product->images) && count($product->images) > 0) {
                    $imagePath = $product->images[0];
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'originalPrice' => null,
                    'moq' => $product->minimum_order_quantity ? $product->minimum_order_quantity . ' pcs' : '1 pc',
                    'orders' => ($product->views ?? 0) . ' Views',
                    'image' => $imagePath,
                    'badge' => 'Featured',
                    'verified' => true,
                    'supplier' => $product->brand ? $product->brand->name : 'ZodiMarket',
                ];
            });

        $now = now();

        $heroAds = Ad::query()
            ->where('status', 'published')
            ->where(function ($query) use ($now) {
                $query->whereNull('expired_at')->orWhere('expired_at', '>', $now);
            })
            ->where(function ($query) {
                $query->whereNull('ads_type')->orWhere('ads_type', 'image');
            })
            ->where('location', 'homepage_slider')
            ->orderBy('order')
            ->orderBy('id')
            ->get()
            ->map(function (Ad $ad) {
                return [
                    'id' => $ad->id,
                    'name' => $ad->name,
                    'image' => $ad->image ? (str_starts_with($ad->image, 'http') ? $ad->image : asset('storage/' . $ad->image)) : null,
                    'tablet_image' => $ad->tablet_image ? (str_starts_with($ad->tablet_image, 'http') ? $ad->tablet_image : asset('storage/' . $ad->tablet_image)) : null,
                    'mobile_image' => $ad->mobile_image ? (str_starts_with($ad->mobile_image, 'http') ? $ad->mobile_image : asset('storage/' . $ad->mobile_image)) : null,
                    'url' => $ad->url,
                    'open_in_new_tab' => $ad->open_in_new_tab,
                ];
            })
            ->values()
            ->all();

        $sideAds = Ad::query()
            ->where('status', 'published')
            ->where(function ($query) use ($now) {
                $query->whereNull('expired_at')->orWhere('expired_at', '>', $now);
            })
            ->where(function ($query) {
                $query->whereNull('ads_type')->orWhere('ads_type', 'image');
            })
            ->where('location', 'homepage_side')
            ->orderBy('order')
            ->orderBy('id')
            ->take(3)
            ->get()
            ->map(function (Ad $ad) {
                return [
                    'id' => $ad->id,
                    'name' => $ad->name,
                    'image' => $ad->image ? (str_starts_with($ad->image, 'http') ? $ad->image : asset('storage/' . $ad->image)) : null,
                    'url' => $ad->url,
                    'open_in_new_tab' => $ad->open_in_new_tab,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Home/Home', [
            'featuredProducts' => $featuredProducts,
            'categories' => $categories,
            'heroAds' => $heroAds,
            'sideAds' => $sideAds,
        ]);
    }

    public function productDetails($identifier)
    {
        $categories = $this->getTopCategories();

        $productQuery = Products::with(['brand', 'category'])->where('status', 'active');
        $product = is_numeric($identifier)
            ? $productQuery->find($identifier)
            : $productQuery->where('slug', $identifier)->first();

        if (!$product) {
            return Inertia::render('Home/Shop/ProductDetails', [
                'product' => null,
                'categories' => $categories
            ]);
        }

        // Format images array: Main image + Gallery images
        $images = [];
        if ($product->image) {
            $images[] = str_starts_with($product->image, 'http') ? $product->image : '/storage/' . $product->image;
        }
        if ($product->images) {
            foreach ($product->images as $img) {
                $images[] = str_starts_with($img, 'http') ? $img : '/storage/' . $img;
            }
        }
        // Fallback image if empty
        if (empty($images)) {
            $images[] = 'https://via.placeholder.com/500x500';
        }

        // Mock colors/sizes for now if not in DB
        $colors = [
            ['name' => 'Black', 'value' => '#000000'],
            ['name' => 'White', 'value' => '#FFFFFF'],
            ['name' => 'Blue', 'value' => '#0000FF']
        ];
        $sizes = ['S', 'M', 'L', 'XL'];

        // Mock variants map for dynamic pricing/stock
        $variants = [];
        foreach ($colors as $color) {
            foreach ($sizes as $size) {
                $key = $color['name'] . '-' . $size;
                $price_modifier = 0;
                if ($size === 'XL') $price_modifier = 50; // XL is more expensive
                if ($size === 'L') $price_modifier = 20;
                
                $variants[$key] = [
                    'price' => $product->price + $price_modifier,
                    'stock' => rand(0, 20), // Random stock for demo
                    'sku' => ($product->sku ?? 'SKU') . '-' . strtoupper(substr($color['name'], 0, 1)) . '-' . $size
                ];
            }
        }

        $formattedProduct = [
            'id' => $product->id,
            'name' => $product->name,
            'price' => $product->price,
            'old_price' => $product->compare_price, // Assuming this field exists or null
            'discount' => $product->compare_price ? round((($product->compare_price - $product->price) / $product->compare_price) * 100) : 0,
            'rating' => 4.5, // Mock rating
            'reviews' => 12, // Mock reviews
            'store_name' => $product->brand ? $product->brand->name : 'ZodiMarket',
            'store_url' => '#',
            'description' => $product->description,
            'content' => $product->content,
            'stock' => $product->quantity ?? 0,
            'sku' => $product->sku,
            'category_name' => $product->category ? $product->category->name : null,
            'images' => $images,
            'colors' => $colors,
            'sizes' => $sizes,
            'variants' => $variants
        ];

        return Inertia::render('Home/Shop/ProductDetails', [
            'product' => $formattedProduct,
            'categories' => $categories
        ]);
    }

    public function dashboard()
    {
        $categories = $this->getTopCategories();

        return Inertia::render('Home/User/Dashboard', [
            'categories' => $categories,
        ]);
    }

    public function cart(Request $request)
    {
        $data = $this->buildCartData($request);

        return Inertia::render('Home/Cart/Cart', $data);
    }

    public function checkout(Request $request)
    {
        $data = $this->buildCartData($request);

        return Inertia::render('Home/Checkout/Checkout', $data);
    }

    protected function buildCartData(Request $request): array
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

            $items[] = [
                'id' => $product->id,
                'itemKey' => $itemKey,
                'name' => $product->name,
                'image' => $formatImage($product->image),
                'quantity' => $qty,
                'price' => $unitPrice,
            ];
        }

        $shipping = 0.0;
        $tax = 0.0;
        $total = $subTotal + $shipping + $tax;

        return [
            'cartItems' => $items,
            'currency' => 'EGP ',
            'shippingTotal' => $shipping,
            'taxTotal' => $tax,
            'subtotal' => $subTotal,
            'total' => $total,
            'categories' => $this->getTopCategories(),
        ];
    }

    protected function getTopCategories()
    {
        return Categories::where(function ($query) {
            $query->whereNull('parent_id')->orWhere('parent_id', 0);
        })
            ->where('status', 'active')
            ->with('children')
            ->orderBy('order')
            ->orderBy('name')
            ->get();
    }
}
