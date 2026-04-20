<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class OrderService extends BaseService
{
    public function __construct(Order $order)
    {
        parent::__construct($order);
    }

    /**
     * Create order with items
     */
    public function createOrder(array $data): Order
    {
        DB::beginTransaction();
        try {
            $orderData = collect($data)->except('items')->toArray();
            $orderItems = $data['items'] ?? [];

            $order = $this->create($orderData);

            if (!empty($orderItems)) {
                $this->createOrderItems($order, $orderItems);
                $this->updateOrderTotals($order);
            }

            DB::commit();
            return $order->load('items.product');
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update order with items
     */
    public function updateOrder(int $id, array $data): Order
    {
        DB::beginTransaction();
        try {
            $orderData = collect($data)->except('items')->toArray();
            $orderItems = $data['items'] ?? [];

            $order = $this->update($id, $orderData);

            if (isset($data['items'])) {
                $this->updateOrderItems($order, $orderItems);
                $this->updateOrderTotals($order);
            }

            DB::commit();
            return $order->load('items.product');
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Create order items
     */
    private function createOrderItems(Order $order, array $items): void
    {
        foreach ($items as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'total' => $item['quantity'] * $item['price'],
            ]);
        }
    }

    /**
     * Update order items
     */
    private function updateOrderItems(Order $order, array $items): void
    {
        // Remove existing items
        $order->items()->delete();

        // Create new items
        $this->createOrderItems($order, $items);
    }

    /**
     * Update order totals
     */
    private function updateOrderTotals(Order $order): void
    {
        $total = $order->items->sum('line_total');
        $tax = $total * 0.1; // 10% tax
        $grandTotal = $total + $tax;

        $order->update([
            'subtotal' => $total,
            'tax_amount' => $tax,
            'total_amount' => $grandTotal,
        ]);
    }

    /**
     * Get orders with items
     */
    public function getOrdersWithItems(int $perPage = 15)
    {
        return $this->model->with(['items.product', 'user'])->paginate($perPage);
    }

    /**
     * Update order status
     */
    public function updateStatus(int $id, string $status): Order
    {
        return $this->update($id, ['status' => $status]);
    }

    /**
     * Get order dashboard stats
     * Default behavior: If no date range provided, use today's date (inclusive)
     */
    public function getDashboardStats(?string $dateFrom = null, ?string $dateTo = null): array
    {
        // Default to today's date if no range provided for consistent filtering
        $effectiveDateFrom = $dateFrom ?? Carbon::today()->format('Y-m-d');
        $effectiveDateTo = $dateTo ?? Carbon::today()->format('Y-m-d');

        $baseQuery = $this->model->query();

        // Apply date range filter with indexed column (created_at)
        // whereDate uses parameterized queries internally for optimal performance
        $baseQuery->whereDate('created_at', '>=', $effectiveDateFrom)
                  ->whereDate('created_at', '<=', $effectiveDateTo);

        $totalOrders = (clone $baseQuery)->count();
        $totalRevenue = (clone $baseQuery)->sum('total_amount');
        $pendingOrders = (clone $baseQuery)->where('status', 'pending')->count();
        $completedOrders = (clone $baseQuery)->where('status', 'completed')->count();

        // Get monthly revenue for the current year or filtered date range
        $monthlyRevenueQuery = (clone $baseQuery);
        $monthlyRevenue = $monthlyRevenueQuery
            ->selectRaw('MONTH(created_at) as month, YEAR(created_at) as year, SUM(total_amount) as revenue')
            ->groupBy('year', 'month')
            ->orderBy('month')
            ->get();

        $statusDistribution = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        return [
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue,
            'pending_orders' => $pendingOrders,
            'completed_orders' => $completedOrders,
            'monthly_revenue' => $monthlyRevenue,
            'status_distribution' => $statusDistribution,
        ];
    }

    /**
     * Get all orders with filters and sorting
     */
    public function getAll(array $filters = [], int $perPage = 15, string $sortBy = 'created_at', string $sortDirection = 'desc')
    {
        $query = $this->model->query()->with(['items.product', 'user']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['customer_id'])) {
            $query->where('user_id', $filters['customer_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (!empty($filters['min_total'])) {
            $query->where('total_amount', '>=', $filters['min_total']);
        }

        if (!empty($filters['max_total'])) {
            $query->where('total_amount', '<=', $filters['max_total']);
        }

        return $query->orderBy($sortBy, $sortDirection)->paginate($perPage);
    }

    /**
     * Search orders
     */
    public function searchOrders(array $filters = [], int $perPage = 15)
    {
        return $this->getAll($filters, $perPage);
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(array $ids, string $status): int
    {
        return $this->model->whereIn('id', $ids)->update(['status' => $status]);
    }
}