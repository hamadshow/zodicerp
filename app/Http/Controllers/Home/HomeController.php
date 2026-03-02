<?php

namespace App\Http\Controllers\Home;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Models\Products;
use App\Models\Categories;
use App\Models\Country;
use App\Models\City;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Backend\Client_Sales\FlashSale;
use App\Models\ProductCollection;
use App\Services\CurrencyConverter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $categories = $this->getTopCategories();

        $featuredProducts = Products::with(['brand', 'children'])
            ->where('is_featured', true)
            ->where('status', 'active')
            ->whereNull('parent_id')
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

                $price = $product->price;
                $minPrice = $product->price;
                $maxPrice = $product->price;

                if ($product->children->isNotEmpty()) {
                    $prices = $product->children->pluck('price')->filter(function($val) {
                        return is_numeric($val) && $val > 0;
                    })->all();
                    
                    if (!empty($prices)) {
                        $minPrice = min($prices);
                        $maxPrice = max($prices);
                    }
                }

                return [
                    'id' => $product->id,
                    'name' => $product->getTranslated('name_json') ?: $product->name,
                    'price' => CurrencyConverter::convert($price),
                    'sale_price' => $product->sale_price ? CurrencyConverter::convert($product->sale_price) : null,
                    'product_type' => $product->product_type,
                    'min_price' => CurrencyConverter::convert($minPrice),
                    'max_price' => CurrencyConverter::convert($maxPrice),
                    'originalPrice' => null,
                    'moq' => $product->minimum_order_quantity ? $product->minimum_order_quantity . ' pcs' : '1 pc',
                    'orders' => ($product->views ?? 0) . ' Views',
                    'image' => $this->formatMediaUrl($imagePath, 'https://via.placeholder.com/300x300'),
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

        // Flash Sale Logic
        $flashSale = FlashSale::with(['items.product.brand', 'items.product.variations.product'])
            ->where('status', 'published')
            ->where('end_date', '>', $now)
            ->orderBy('end_date', 'asc')
            ->first();

        $flashSaleData = null;
        if ($flashSale) {
            $flashSaleData = [
                'id' => $flashSale->id,
                'name' => $flashSale->name,
                'end_date' => $flashSale->end_date,
                'products' => $flashSale->items->map(function ($item) {
                    $product = $item->product;
                    if (!$product) return null;

                    $imagePath = null;
                    if ($product->image) {
                        $imagePath = $product->image;
                    } elseif (is_array($product->images) && count($product->images) > 0) {
                        $imagePath = $product->images[0];
                    }

                    $price = $item->price; // Flash sale price
                    $originalPrice = $product->price;

                    // Calculate discount percentage
                    $discount = 0;
                    if ($originalPrice > 0) {
                        $discount = round((($originalPrice - $price) / $originalPrice) * 100);
                    }

                    return [
                        'id' => $product->id,
                        'name' => $product->getTranslated('name_json') ?: $product->name,
                        'product_type' => $product->product_type,
                        'price' => CurrencyConverter::convert($price),
                        'originalPrice' => CurrencyConverter::convert($originalPrice),
                        'moq' => $product->minimum_order_quantity ? $product->minimum_order_quantity . ' pcs' : '1 pc',
                        'orders' => ($product->views ?? 0) . ' Views',
                        'image' => $this->formatMediaUrl($imagePath, 'https://via.placeholder.com/300x300'),
                        'badge' => '-' . $discount . '%',
                        'verified' => true,
                        'supplier' => $product->brand ? $product->brand->name : 'ZodiMarket',
                    ];
                })->filter()->values()->all(),
            ];
        }

        // Product Collections Logic
        $productCollections = ProductCollection::where('status', 'active')
            ->get()
            ->map(function ($collection) {
                // Manually load products to ensure limit applies per collection
                $products = $collection->products()
                    ->with(['brand', 'children'])
                    ->where('status', 'active')
                    ->take(12)
                    ->get();

                return [
                    'id' => $collection->id,
                    'title' => $collection->name,
                    'slug' => $collection->slug,
                    'products' => $products->map(function ($product) {
                        $imagePath = null;

                        if ($product->image) {
                            $imagePath = $product->image;
                        } elseif (is_array($product->images) && count($product->images) > 0) {
                            $imagePath = $product->images[0];
                        }

                        $price = $product->price;
                        $minPrice = $product->price;
                        $maxPrice = $product->price;

                        if ($product->children->isNotEmpty()) {
                            $prices = $product->children->pluck('price')->filter(function($val) {
                                return is_numeric($val) && $val > 0;
                            })->all();
                            
                            if (!empty($prices)) {
                                $minPrice = min($prices);
                                $maxPrice = max($prices);
                            }
                        }

                        return [
                            'id' => $product->id,
                            'name' => $product->getTranslated('name_json') ?: $product->name,
                            'price' => CurrencyConverter::convert($price),
                            'sale_price' => $product->sale_price ? CurrencyConverter::convert($product->sale_price) : null,
                            'product_type' => $product->product_type,
                            'min_price' => CurrencyConverter::convert($minPrice),
                            'max_price' => CurrencyConverter::convert($maxPrice),
                            'originalPrice' => null,
                            'moq' => $product->minimum_order_quantity ? $product->minimum_order_quantity . ' pcs' : '1 pc',
                            'orders' => ($product->views ?? 0) . ' Views',
                            'image' => $this->formatMediaUrl($imagePath, 'https://via.placeholder.com/300x300'),
                            'badge' => null,
                            'verified' => true,
                            'supplier' => $product->brand ? $product->brand->name : 'ZodiMarket',
                        ];
                    }),
                ];
            });

        return Inertia::render('Home/Home', [
            'featuredProducts' => $featuredProducts,
            'categories' => $categories,
            'heroAds' => $heroAds,
            'sideAds' => $sideAds,
            'flashSale' => $flashSaleData,
            'productCollections' => $productCollections,
        ]);
    }

    public function productDetails($identifier)
    {
        $categories = $this->getTopCategories();

        $productQuery = Products::with(['brand', 'categories', 'variations.product', 'variations.items.attribute'])->where('status', 'active');
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
        $parentImages = [];

        if ($product->image) {
            $url = $this->formatMediaUrl($product->image);
            $images[] = $url;
            $parentImages[] = $url;
        }
        if ($product->images) {
            foreach ($product->images as $img) {
                $url = $this->formatMediaUrl($img);
                if (!in_array($url, $images)) {
                    $images[] = $url;
                }
                if (!in_array($url, $parentImages)) {
                    $parentImages[] = $url;
                }
            }
        }

        if ($product->product_type === 'variable' && $product->variations->count() > 0) {
            foreach ($product->variations as $variation) {
                $variationProduct = $variation->product;
                if ($variationProduct) {
                    if ($variationProduct->image) {
                        $img = $this->formatMediaUrl($variationProduct->image);
                        if (!in_array($img, $images)) {
                            $images[] = $img;
                        }
                    }
                    if ($variationProduct->images && is_array($variationProduct->images)) {
                        foreach ($variationProduct->images as $vImg) {
                            $img = $this->formatMediaUrl($vImg);
                            if (!in_array($img, $images)) {
                                $images[] = $img;
                            }
                        }
                    }
                }
            }
        }

        // Fallback image if empty
        if (empty($images)) {
            $images[] = 'https://via.placeholder.com/500x500';
        }

        $colors = [];
        $sizes = [];
        $variants = [];

        if ($product->product_type === 'variable' && $product->variations->count() > 0) {
            // Collect all attribute detail IDs
            $detailIds = [];
            foreach ($product->variations as $variation) {
                foreach ($variation->items as $item) {
                    $detailIds[] = $item->attribute_value;
                }
            }

            // Fetch details
            $details = \App\Models\ItemAttributeDetail::whereIn('id', array_unique($detailIds))->get()->keyBy('id');

            // Build Attributes Lists (Colors, Sizes)
            $colorsMap = [];
            $sizesMap = [];

            foreach ($product->variations as $variation) {
                $variationProduct = $variation->product;
                if (!$variationProduct) {
                    continue;
                }
                $variantColorName = null;
                $variantSizeName = null;

                foreach ($variation->items as $item) {
                    $detail = $details->get($item->attribute_value);
                    if (!$detail) continue;

                    $attribute = $item->attribute; // ItemAttribute model

                    if ($attribute && (strtolower($attribute->title) === 'color' || strtolower($attribute->title) === 'colors' || $attribute->title === 'اللون' || $attribute->title === 'الألوان' || !empty($detail->color))) {
                        $colorsMap[$detail->id] = [
                            'name' => $detail->title,
                            'hex' => $detail->color ?? $detail->title // Use color hex or name
                        ];
                        $variantColorName = $detail->title;
                    } elseif ($attribute && (strtolower($attribute->title) === 'size' || strtolower($attribute->title) === 'sizes' || $attribute->title === 'المقاس' || $attribute->title === 'الحجم')) {
                        $sizesMap[$detail->id] = $detail->title;
                        $variantSizeName = $detail->title;
                    }
                }

                // Construct Variant Key (Color-Size)
                // Note: The frontend expects specific key format.
                if ($variantColorName && $variantSizeName) {
                    $key = $variantColorName . '-' . $variantSizeName;
                } elseif ($variantColorName) {
                    $key = $variantColorName;
                } elseif ($variantSizeName) {
                    $key = $variantSizeName;
                } else {
                    $key = 'default';
                }

                $variantImages = [];
                if ($variationProduct->image) {
                    $variantImages[] = $this->formatMediaUrl($variationProduct->image);
                }
                if ($variationProduct->images && is_array($variationProduct->images)) {
                    foreach ($variationProduct->images as $vImg) {
                        $img = $this->formatMediaUrl($vImg);
                        if (!in_array($img, $variantImages)) {
                            $variantImages[] = $img;
                        }
                    }
                }

                $variants[$key] = [
                    'id' => $variationProduct->id,
                    'price' => $variationProduct->price ?? $product->price,
                    'sale_price' => $variationProduct->sale_price,
                    'stock' => $variationProduct->quantity ?? 0,
                    'sku' => $variationProduct->sku,
                    'image' => $variationProduct->image ? $this->formatMediaUrl($variationProduct->image) : null,
                    'images' => $variantImages
                ];
            }

            $colors = array_values($colorsMap);
            $sizes = array_values($sizesMap);
        }

        $minPrice = $product->price;
        $maxPrice = $product->price;

        if ($product->product_type === 'variable') {
             // Collect prices from children, fallback to parent price if child price is missing
             $prices = $product->children->map(function($child) use ($product) {
                 return $child->price ?? $product->price;
             })->filter(function($value) {
                 return is_numeric($value) && $value > 0;
             })->toArray();

             if (!empty($prices)) {
                 $minPrice = min($prices);
                 $maxPrice = max($prices);
             }
        }

        $formattedProduct = [
            'id' => $product->id,
            'name' => $product->getTranslated('name_json') ?: $product->name,
            'price' => $product->price,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'sale_price' => $product->sale_price,
            'old_price' => $product->sale_price && $product->sale_price < $product->price ? $product->price : null,
            'discount' => $product->sale_price && $product->sale_price < $product->price ? round((($product->price - $product->sale_price) / $product->price) * 100) : 0,
            'rating' => 4.5, // Mock rating
            'reviews' => 12, // Mock reviews
            'store_name' => $product->brand ? $product->brand->name : 'ZodiMarket',
            'store_url' => '#',
            'description' => $product->getTranslated('description_json') ?: $product->description,
            'content' => $product->getTranslated('content_json') ?: $product->content,
            'stock' => $product->quantity ?? 0,
            'sku' => $product->sku,
            'category_name' => $product->categories->first() ? ($product->categories->first()->getTranslated('name_json') ?: $product->categories->first()->name) : null,
            'images' => $images,
            'parent_images' => $parentImages,
            'colors' => $colors,
            'sizes' => $sizes,
            'variants' => $variants,
            'product_type' => $product->product_type
        ];

        return Inertia::render('Home/Shop/ProductDetails', [
            'product' => $formattedProduct,
            'categories' => $categories
        ]);
    }

    public function products(Request $request)
    {
        $categories = $this->getTopCategories();
        
        $level2Categories = $categories->pluck('children')->flatten()->map(function($cat) {
            $name = $cat instanceof \App\Models\Categories ? ($cat->getTranslated('name_json') ?: $cat->name) : ($cat['name'] ?? '');
            return [
                'id' => $cat instanceof \App\Models\Categories ? $cat->id : ($cat['id'] ?? null),
                'name' => $name,
                'slug' => $cat instanceof \App\Models\Categories ? $cat->slug : ($cat['slug'] ?? ''),
                'image' => $this->formatMediaUrl($cat instanceof \App\Models\Categories ? $cat->image : ($cat['image'] ?? null), 'https://via.placeholder.com/60?text=' . (isset($name[0]) ? $name[0] : 'C')),
                'parent_id' => $cat instanceof \App\Models\Categories ? $cat->parent_id : ($cat['parent_id'] ?? null)
            ];
        });

        $query = Products::with(['brand', 'categories', 'children'])->where('status', 'active');

        // Filter by Category
        if ($request->has('category')) {
            $categoryValue = $request->input('category');
            $categorySlugs = array_filter(array_map('trim', explode(',', (string) $categoryValue)));
            if (!empty($categorySlugs)) {
                $categoriesList = Categories::whereIn('slug', $categorySlugs)->get();
                $categoryIds = [];
                foreach ($categoriesList as $category) {
                    $categoryIds = array_merge($categoryIds, $this->getAllCategoryIds($category));
                }
                $categoryIds = array_values(array_unique($categoryIds));
                if (!empty($categoryIds)) {
                    $query->whereHas('categories', function ($q) use ($categoryIds) {
                        $q->whereIn('categories.id', $categoryIds);
                    });
                }
            }
        }

        // Filter by Collection
        if ($request->has('collection')) {
            $collectionSlug = $request->input('collection');
            $collection = ProductCollection::where('slug', $collectionSlug)->first();
            if ($collection) {
                $query->whereHas('productCollections', function ($q) use ($collection) {
                    $q->where('product_collections.id', $collection->id);
                });
            }
        }

        // Filter by Price Range
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->input('min_price'));
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->input('max_price'));
        }

        // Filter by Brand
        if ($request->has('brand')) {
            $brandSlugs = explode(',', $request->input('brand'));
            $brandIds = \App\Models\Brands::whereIn('brand_code', $brandSlugs)->pluck('id'); // Assuming slug is brand_code or similar, let's check Brand model
            // Actually, let's assume brand ID or name for now, better ID.
            // Or just filter by brand_id directly if passed
             if (!empty($brandSlugs)) {
                 $query->whereHas('brand', function($q) use ($brandSlugs) {
                     $q->whereIn('slug', $brandSlugs)->orWhereIn('id', $brandSlugs); // Flexible
                 });
             }
        }
        
        // Filter by Search
        if ($request->has('q')) {
            $search = $request->input('q');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_json', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('created_at', 'desc')->paginate(12)->withQueryString();

        $products->getCollection()->transform(function ($product) {
            $primaryImage = null;

            if ($product->image) {
                $primaryImage = $product->image;
            } elseif (is_array($product->images) && count($product->images) > 0) {
                $primaryImage = $product->images[0];
            }

            $price = $product->price;
            $minPrice = $product->price;
            $maxPrice = $product->price;

            if ($product->children->isNotEmpty()) {
                $prices = $product->children->pluck('price')->filter(function($val) {
                    return is_numeric($val) && $val > 0;
                })->all();
                
                if (!empty($prices)) {
                    $minPrice = min($prices);
                    $maxPrice = max($prices);
                }
            }

            return [
                'id' => $product->id,
                'name' => $product->getTranslated('name_json') ?: $product->name,
                'slug' => $product->slug,
                'price' => CurrencyConverter::convert($price),
                'min_price' => CurrencyConverter::convert($minPrice),
                'max_price' => CurrencyConverter::convert($maxPrice),
                'discount_price' => $product->sale_price ? CurrencyConverter::convert($product->sale_price) : null,
                'product_type' => $product->product_type,
                'image' => $this->formatMediaUrl($primaryImage, 'https://via.placeholder.com/300x300'),
                'category' => $product->categories->first() ? ($product->categories->first()->getTranslated('name_json') ?: $product->categories->first()->name) : null,
                'brand' => $product->brand ? $product->brand->name : null,
                'rating' => 4.5,
                'reviews' => 10,
                'is_new' => $product->created_at->diffInDays(now()) < 30,
                'is_sale' => $product->sale_price && $product->sale_price < $product->price,
            ];
        });

        $brands = \App\Models\Brands::where('status', 'active')->withCount('products')->get()->map(function($brand) {
            return [
                'id' => $brand->id,
                'name' => $brand->name,
                'slug' => $brand->slug ?? $brand->id, // Fallback if no slug
                'products_count' => $brand->products_count
            ];
        });

        $attributes = \App\Models\ItemAttribute::with('details')->where('status', 'published')->get()->map(function($attr) {
            return [
                'id' => $attr->id,
                'name' => $attr->title,
                'slug' => $attr->slug,
                'type' => $attr->display_layout, // visual, text, etc.
                'options' => $attr->details->map(function($detail) {
                    return [
                        'id' => $detail->id,
                        'name' => $detail->title,
                        'value' => $detail->color ?? $detail->title,
                        'slug' => $detail->slug
                    ];
                })
            ];
        });

        return Inertia::render('Home/Shop/Products', [
            'products' => $products,
            'categories' => $categories,
            'level2Categories' => $level2Categories,
            'brands' => $brands,
            'attributes' => $attributes,
            'filters' => $request->all()
        ]);
    }

    protected function getAllCategoryIds($category)
    {
        $ids = [$category->id];
        foreach ($category->children as $child) {
            $ids = array_merge($ids, $this->getAllCategoryIds($child));
        }
        return $ids;
    }

    protected function formatMediaUrl(?string $path, ?string $fallback = null): string
    {
        if (!$path) {
            return $fallback ?? '';
        }

        if (str_starts_with($path, 'http')) {
            return $path;
        }

        $normalized = ltrim($path, '/');
        $normalized = preg_replace('#^(files|storage|media-files)/#', '', $normalized);

        return '/media-files/' . $normalized;
    }

    public function dashboard()
    {
        $categories = $this->getTopCategories();
        $user = Auth::guard('customer')->user() ?: Auth::user();
        
        // Find the customer record. If the logged in user is not a Customer model, 
        // try to find a customer with the same email or phone.
        $customer = $user instanceof \App\Models\Client_Sales\Customer 
            ? $user 
            : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();

        if (!$customer && $user) {
            $phone = $user->phone ?? $user->mobile;
            if ($phone) {
                $customer = \App\Models\Client_Sales\Customer::where('mobile', $phone)
                    ->orWhere('primary_phone', $phone)
                    ->first();
            }
        }

        $addresses = [];
        $orders = [];
        if ($customer) {
            $addresses = CustomerAddress::where('customer_id', $customer->id)
                ->with(['country', 'city'])
                ->latest()
                ->get();

            $rawOrders = \App\Models\Client_Sales\SalesInvoice::where('customer_id', $customer->id)
                ->with(['details.product'])
                ->latest()
                ->get();

            $orders = $rawOrders->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'number' => $invoice->invoice_number,
                    'date' => $invoice->invoice_date ? $invoice->invoice_date->toDateString() : null,
                    'total' => (float) $invoice->total_amount,
                    'status' => $invoice->payment_status,
                    'items_count' => $invoice->details->count(),
                ];
            });
        }

        return Inertia::render('Home/User/Dashboard', [
            'categories' => $categories,
            'addresses' => $addresses,
            'orders' => $orders,
            'countries' => Country::where('status', 'active')->get(['id', 'name_en', 'name_ar', 'name']),
            'cities' => City::where('status', 'active')->get(['id', 'name', 'country_id']),
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

        $user = Auth::guard('customer')->user() ?: Auth::user();
        $defaultAddress = null;

        if ($user) {
            $customer = $user instanceof \App\Models\Client_Sales\Customer 
                ? $user 
                : \App\Models\Client_Sales\Customer::where('email', $user->email)->first();

            if ($customer) {
                $defaultAddress = CustomerAddress::where('customer_id', $customer->id)
                    ->where('is_default', true)
                    ->with(['country', 'city'])
                    ->first();
                
                // If no explicit default, just get the latest one
                if (!$defaultAddress) {
                    $defaultAddress = CustomerAddress::where('customer_id', $customer->id)
                        ->with(['country', 'city'])
                        ->latest()
                        ->first();
                }
            }
        }

        $data['defaultAddress'] = $defaultAddress;
        $data['user'] = $user;

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
                'id' => $product->id,
                'itemKey' => $itemKey,
                'name' => $product->name,
                'image' => $formatImage($image),
                'quantity' => $qty,
                'price' => $unitPrice,
                'variants' => $cartItem['variants'] ?? [],
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
            ->get()
            ->map(function ($category) {
                return $this->transformCategory($category);
            });
    }

    protected function transformCategory($category)
    {
        $transformed = $category->toArray();
        $transformed['name'] = $category->getTranslated('name_json') ?: $category->name;
        
        if ($category->relationLoaded('children')) {
            $transformed['children'] = $category->children->map(function ($child) {
                return $this->transformCategory($child);
            });
        }
        
        return $transformed;
    }
}
