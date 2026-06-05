<?php

namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function index(): Response
    {
        return Inertia::render('Backend/Interface');
    }

    public function dashboard(): Response
    {
        // Get dashboard data
        $stats = $this->dashboardService->getDashboardStats();
        $salesChart = $this->dashboardService->getSalesChartData();
        $orderStatusDistribution = $this->dashboardService->getOrderStatusDistribution();
        $revenueByMonth = $this->dashboardService->getRevenueByMonthData();
        $recentActivity = $this->dashboardService->getRecentActivity();

        return Inertia::render('Backend/dashboard', [
            'stats' => $stats,
            'salesChart' => $salesChart,
            'orderStatusDistribution' => $orderStatusDistribution,
            'revenueByMonth' => $revenueByMonth,
            'recentActivity' => $recentActivity,
        ]);
    }
}
