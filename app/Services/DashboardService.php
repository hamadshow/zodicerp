<?php

namespace App\Services;

use App\Models\User;
use App\Models\Products;
use App\Models\Order;
use App\Models\Categories;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Client_Sales\SalesReturn;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Models\Vendor_Purchases\PurchaseReturn;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardService
{
    protected UserService $userService;
    protected ProductService $productService;
    protected OrderService $orderService;

    // Cache duration in seconds (5 minutes)
    protected int $cacheDuration = 300;

    public function __construct(
        UserService $userService,
        ProductService $productService,
        OrderService $orderService
    ) {
        $this->userService = $userService;
        $this->productService = $productService;
        $this->orderService = $orderService;
    }

    /**
     * Generate a cache key for date range filtered data
     */
    protected function getCacheKey(string $method, ?string $dateFrom = null, ?string $dateTo = null, array $params = []): string
    {
        $dateKey = md5($dateFrom . '::' . $dateTo);
        $paramKey = md5(json_encode($params));
        return "dashboard_{$method}_{$dateKey}_{$paramKey}";
    }

    /**
     * Get main dashboard statistics
     */
    protected function applyDateRangeFilters($query, ?string $dateFrom, ?string $dateTo, string $column = 'created_at')
    {
        if (!empty($dateFrom)) {
            $query->whereDate($column, '>=', Carbon::parse($dateFrom)->format('Y-m-d'));
        }

        if (!empty($dateTo)) {
            $query->whereDate($column, '<=', Carbon::parse($dateTo)->format('Y-m-d'));
        }

        return $query;
    }

    public function getDashboardStats(?string $dateFrom = null, ?string $dateTo = null): array
    {
        $cacheKey = $this->getCacheKey('stats', $dateFrom, $dateTo);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($dateFrom, $dateTo) {
            $userStats = $this->userService->getDashboardStats();
            $productStats = $this->productService->getDashboardStats();
            $orderStats = $this->orderService->getDashboardStats($dateFrom, $dateTo);
            $netRevenue = $this->getNetInvoiceRevenue($dateFrom, $dateTo);
            $netPurchases = $this->getNetPurchases($dateFrom, $dateTo);

            return [
                'users' => $userStats,
                'products' => $productStats,
                'orders' => $orderStats,
                'categories' => [
                    'total_categories' => Categories::count(),
                    'active_categories' => Categories::where('status', 'active')->count(),
                ],
                'summary' => [
                    'total_users' => $userStats['total_users'],
                    'total_products' => $productStats['total_products'],
                    'total_orders' => $orderStats['total_orders'],
                    'total_revenue' => $netRevenue,
                    'total_net_purchases' => $netPurchases,
                ]
            ];
        });
    }

    /**
     * Get net revenue from invoices minus returns
     */
    protected function getNetInvoiceRevenue(?string $dateFrom = null, ?string $dateTo = null): float
    {
        $totalInvoicesQuery = SalesInvoice::query();
        $totalReturnsQuery = SalesReturn::query();

        $this->applyDateRangeFilters($totalInvoicesQuery, $dateFrom, $dateTo);
        $this->applyDateRangeFilters($totalReturnsQuery, $dateFrom, $dateTo);

        $totalInvoices = $totalInvoicesQuery->sum('total_amount') ?? 0;
        $totalReturns = $totalReturnsQuery->sum('total_amount') ?? 0;

        return max(0, $totalInvoices - $totalReturns);
    }

    /**
     * Get net purchases from purchase invoices minus purchase returns
     */
    protected function getNetPurchases(?string $dateFrom = null, ?string $dateTo = null): float
    {
        $totalPurchasesQuery = PurchaseInvoice::query();
        $totalPurchaseReturnsQuery = PurchaseReturn::query();

        $this->applyDateRangeFilters($totalPurchasesQuery, $dateFrom, $dateTo);
        $this->applyDateRangeFilters($totalPurchaseReturnsQuery, $dateFrom, $dateTo);

        $totalPurchases = $totalPurchasesQuery->sum('total_amount') ?? 0;
        $totalPurchaseReturns = $totalPurchaseReturnsQuery->sum('total_amount') ?? 0;

        return max(0, $totalPurchases - $totalPurchaseReturns);
    }

    /**
     * Get sales chart data
     */
    public function getSalesChartData(int $months = 12, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $cacheKey = $this->getCacheKey('sales_chart', $dateFrom, $dateTo, ['months' => $months]);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($months, $dateFrom, $dateTo) {
            $query = Order::selectRaw('
                    YEAR(created_at) as year,
                    MONTH(created_at) as month,
                    COUNT(*) as orders_count,
                    SUM(total_amount) as revenue
                ');

            if (!empty($dateFrom) || !empty($dateTo)) {
                $this->applyDateRangeFilters($query, $dateFrom, $dateTo);
            } else {
                $query->where('created_at', '>=', Carbon::now()->subMonths($months));
            }

            $data = $query->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            $labels = [];
            $orders = [];
            $revenue = [];

            $startDate = !empty($dateFrom) ? Carbon::parse($dateFrom)->startOfMonth() : Carbon::now()->subMonths($months - 1)->startOfMonth();
            $endDate = !empty($dateTo) ? Carbon::parse($dateTo)->endOfMonth() : Carbon::now()->endOfMonth();
            $currentDate = $startDate->copy();

            while ($currentDate <= $endDate) {
                $labels[] = $currentDate->format('M Y');

                $monthData = $data->first(function ($item) use ($currentDate) {
                    return $item->year == $currentDate->year && $item->month == $currentDate->month;
                });

                $orders[] = $monthData ? $monthData->orders_count : 0;
                $revenue[] = $monthData ? $monthData->revenue : 0;
                $currentDate->addMonth();
            }

            return [
                'labels' => $labels,
                'orders' => $orders,
                'revenue' => $revenue,
            ];
        });
    }

    /**
     * Get order status distribution
     */
    public function getOrderStatusDistribution(?string $dateFrom = null, ?string $dateTo = null): array
    {
        $cacheKey = $this->getCacheKey('order_status', $dateFrom, $dateTo);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($dateFrom, $dateTo) {
            $query = Order::selectRaw('status, COUNT(*) as count');

            if (!empty($dateFrom) || !empty($dateTo)) {
                $this->applyDateRangeFilters($query, $dateFrom, $dateTo);
            }

            $data = $query->groupBy('status')->get();

            return [
                'labels' => $data->pluck('status')->map(fn($status) => ucfirst($status)),
                'data' => $data->pluck('count'),
                'colors' => ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            ];
        });
    }

    /**
     * Get revenue by month chart
     */
    public function getRevenueByMonthData(int $months = 12, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $cacheKey = $this->getCacheKey('revenue_by_month', $dateFrom, $dateTo, ['months' => $months]);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($months, $dateFrom, $dateTo) {
            $query = Order::selectRaw('
                    YEAR(created_at) as year,
                    MONTH(created_at) as month,
                    SUM(total_amount) as revenue
                ');

            if (!empty($dateFrom) || !empty($dateTo)) {
                $this->applyDateRangeFilters($query, $dateFrom, $dateTo);
            } else {
                $query->where('created_at', '>=', Carbon::now()->subMonths($months));
            }

            $data = $query->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            $labels = [];
            $values = [];

            $startDate = !empty($dateFrom) ? Carbon::parse($dateFrom)->startOfMonth() : Carbon::now()->subMonths($months - 1)->startOfMonth();
            $endDate = !empty($dateTo) ? Carbon::parse($dateTo)->endOfMonth() : Carbon::now()->endOfMonth();
            $currentDate = $startDate->copy();

            while ($currentDate <= $endDate) {
                $labels[] = $currentDate->format('M Y');

                $monthData = $data->first(function ($item) use ($currentDate) {
                    return $item->year == $currentDate->year && $item->month == $currentDate->month;
                });

                $values[] = $monthData ? $monthData->revenue : 0;
                $currentDate->addMonth();
            }

            return [
                'labels' => $labels,
                'data' => $values,
            ];
        });
    }

    /**
     * Get recent activity
     */
    public function getRecentActivity(int $limit = 10, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $cacheKey = $this->getCacheKey('recent_activity', $dateFrom, $dateTo, ['limit' => $limit]);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($limit, $dateFrom, $dateTo) {
            $activities = [];

            // Recent orders
            $orderQuery = Order::with('creator')->latest();
            if (!empty($dateFrom) || !empty($dateTo)) {
                $this->applyDateRangeFilters($orderQuery, $dateFrom, $dateTo);
            }

            $recentOrders = $orderQuery
                ->take(5)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => "order_{$order->id}",
                        'type' => 'order',
                        'title' => "New order #{$order->order_number}",
                        'description' => "Order placed by " . ($order->creator ? $order->creator->name : 'Guest'),
                        'amount' => $order->total_amount,
                        'created_at' => $order->created_at,
                    ];
                });

            // Recent users
            $userQuery = User::latest();
            if (!empty($dateFrom) || !empty($dateTo)) {
                $this->applyDateRangeFilters($userQuery, $dateFrom, $dateTo);
            }

            $recentUsers = $userQuery
                ->take(3)
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => "user_{$user->id}",
                        'type' => 'user',
                        'title' => "New user registered",
                        'description' => $user->name . " joined the platform",
                        'created_at' => $user->created_at,
                    ];
                });

            // Recent products
            $productQuery = Products::latest();
            if (!empty($dateFrom) || !empty($dateTo)) {
                $this->applyDateRangeFilters($productQuery, $dateFrom, $dateTo);
            }

            $recentProducts = $productQuery
                ->take(2)
                ->get()
                ->map(function ($product) {
                    return [
                        'id' => "product_{$product->id}",
                        'type' => 'product',
                        'title' => "New product added",
                        'description' => $product->name . " is now available",
                        'created_at' => $product->created_at,
                    ];
                });

            $activities = collect()
                ->merge($recentOrders)
                ->merge($recentUsers)
                ->merge($recentProducts)
                ->sortByDesc('created_at')
                ->take($limit)
                ->values()
                ->toArray();

            return $activities;
        });
    }

    /**
     * Get top selling products
     */
    public function getTopSellingProducts(int $limit = 5, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $cacheKey = $this->getCacheKey('top_selling_products', $dateFrom, $dateTo, ['limit' => $limit]);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($limit, $dateFrom, $dateTo) {
            $query = DB::table('sales_order_details')
                ->join('products', 'sales_order_details.product_id', '=', 'products.id')
                ->join('sales_orders', 'sales_order_details.order_id', '=', 'sales_orders.id')
                ->where('sales_orders.status', 'completed');

            if (!empty($dateFrom) || !empty($dateTo)) {
                if (!empty($dateFrom)) {
                    $query->whereDate('sales_orders.created_at', '>=', Carbon::parse($dateFrom)->format('Y-m-d'));
                }
                if (!empty($dateTo)) {
                    $query->whereDate('sales_orders.created_at', '<=', Carbon::parse($dateTo)->format('Y-m-d'));
                }
            }

            return $query
                ->selectRaw('
                    products.id,
                    products.name,
                    products.image,
                    SUM(sales_order_details.quantity) as total_sold,
                    SUM(sales_order_details.line_total) as total_revenue
                ')
                ->groupBy('products.id', 'products.name', 'products.image')
                ->orderBy('total_sold', 'desc')
                ->limit($limit)
                ->get()
                ->toArray();
        });
    }

    /**
     * Get low stock alerts
     */
    public function getLowStockAlerts(int $threshold = 10): array
    {
        $cacheKey = $this->getCacheKey('low_stock_alerts', null, null, ['threshold' => $threshold]);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($threshold) {
            return Products::where('quantity', '<=', $threshold)
                ->where('quantity', '>', 0)
                ->where('status', 'active')
                ->orderBy('quantity')
                ->take(10)
                ->get()
                ->toArray();
        });
    }
}