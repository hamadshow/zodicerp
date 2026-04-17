<?php

namespace App\Http\Controllers\Api;

use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends BaseApiController
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Get dashboard statistics
     */
    public function stats(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $stats = $this->dashboardService->getDashboardStats($dateFrom, $dateTo);
            return $this->successResponse($stats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve dashboard statistics', 500);
        }
    }

    /**
     * Get sales chart data
     */
    public function salesChart(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $months = $request->input('months', 12);
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $data = $this->dashboardService->getSalesChartData($months, $dateFrom, $dateTo);
            return $this->successResponse($data, 'Sales chart data retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve sales chart data', 500);
        }
    }

    /**
     * Get order status distribution
     */
    public function orderStatusDistribution(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $data = $this->dashboardService->getOrderStatusDistribution($dateFrom, $dateTo);
            return $this->successResponse($data, 'Order status distribution retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve order status distribution', 500);
        }
    }

    /**
     * Get revenue by month data
     */
    public function revenueByMonth(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $months = $request->input('months', 12);
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $data = $this->dashboardService->getRevenueByMonthData($months, $dateFrom, $dateTo);
            return $this->successResponse($data, 'Revenue by month data retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve revenue data', 500);
        }
    }

    /**
     * Get recent activity
     */
    public function recentActivity(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $limit = $request->input('limit', 10);
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $activities = $this->dashboardService->getRecentActivity($limit, $dateFrom, $dateTo);
            return $this->successResponse($activities, 'Recent activity retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve recent activity', 500);
        }
    }

    /**
     * Get top selling products
     */
    public function topSellingProducts(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $limit = $request->input('limit', 5);
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $products = $this->dashboardService->getTopSellingProducts($limit, $dateFrom, $dateTo);
            return $this->successResponse($products, 'Top selling products retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve top selling products', 500);
        }
    }

    /**
     * Get low stock alerts
     */
    public function lowStockAlerts(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $threshold = $request->input('threshold', 10);
            $alerts = $this->dashboardService->getLowStockAlerts($threshold);
            return $this->successResponse($alerts, 'Low stock alerts retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve low stock alerts', 500);
        }
    }
}