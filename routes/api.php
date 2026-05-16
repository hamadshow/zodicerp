<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\Tasks\TaskController;
use App\Http\Controllers\Backend\Tasks\TaskCategoryController;
use App\Http\Controllers\Backend\Tasks\TaskPriorityController;
use App\Http\Controllers\Backend\Tasks\TaskStatusController;
use App\Http\Controllers\Backend\Tasks\TaskAssignmentController;
use App\Http\Controllers\Backend\Tasks\TaskAttachmentController;
use App\Http\Controllers\Backend\Tasks\TaskCommentController;

// Authenticated API Routes
Route::middleware(['web', 'auth'])->group(function () {
    // Dashboard API Routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [App\Http\Controllers\Api\DashboardController::class, 'stats']);
        Route::get('/sales-chart', [App\Http\Controllers\Api\DashboardController::class, 'salesChart']);
        Route::get('/order-status-distribution', [App\Http\Controllers\Api\DashboardController::class, 'orderStatusDistribution']);
        Route::get('/revenue-by-month', [App\Http\Controllers\Api\DashboardController::class, 'revenueByMonth']);
        Route::get('/recent-activity', [App\Http\Controllers\Api\DashboardController::class, 'recentActivity']);
        Route::get('/top-selling-products', [App\Http\Controllers\Api\DashboardController::class, 'topSellingProducts']);
        Route::get('/low-stock-alerts', [App\Http\Controllers\Api\DashboardController::class, 'lowStockAlerts']);
    });

    // User Management API Routes
    Route::apiResource('users', App\Http\Controllers\Api\UserController::class);
    Route::post('/users/bulk-delete', [App\Http\Controllers\Api\UserController::class, 'bulkDelete']);
    Route::post('/users/{userId}/assign-role', [App\Http\Controllers\Api\UserController::class, 'assignRole']);
    Route::post('/users/{userId}/remove-role', [App\Http\Controllers\Api\UserController::class, 'removeRole']);
    Route::post('/users/{userId}/check-permission', [App\Http\Controllers\Api\UserController::class, 'checkPermission']);

    // Product Management API Routes
    Route::apiResource('products', App\Http\Controllers\Api\ProductController::class);
    Route::post('/products/bulk-delete', [App\Http\Controllers\Api\ProductController::class, 'bulkDelete']);
    Route::post('/products/bulk-update-status', [App\Http\Controllers\Api\ProductController::class, 'bulkUpdateStatus']);
    Route::post('/products/{id}/update-stock', [App\Http\Controllers\Api\ProductController::class, 'updateStock']);

    // Order Management API Routes
    Route::apiResource('orders', App\Http\Controllers\Api\OrderController::class);
    Route::patch('/orders/{id}/status', [App\Http\Controllers\Api\OrderController::class, 'updateStatus']);
    Route::post('/orders/bulk-delete', [App\Http\Controllers\Api\OrderController::class, 'bulkDelete']);
    Route::post('/orders/bulk-update-status', [App\Http\Controllers\Api\OrderController::class, 'bulkUpdateStatus']);

    // Human resource API Routes
    Route::get('/employees', function (Request $request) {
        return App\Models\Employee::query()
            ->when($request->search, fn($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
                  ->orWhere('position', 'like', "%{$request->search}%")
                  ->orWhere('department', 'like', "%{$request->search}%");
            }))
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10));
    });

    Route::get('/departments', function () {
        return App\Models\Assets\Department::all();
    });

    Route::get('/branches', function () {
        return App\Models\Branch::all();
    });

    // Human Resource API Routes (Extended)
    Route::apiResource('deductions', App\Http\Controllers\Backend\HumanResource\DeductionController::class);
    Route::apiResource('rewards', App\Http\Controllers\Backend\HumanResource\RewardController::class);
    Route::apiResource('attendances', App\Http\Controllers\Backend\HumanResource\AttendanceController::class);
    Route::apiResource('payroll-advances', App\Http\Controllers\Backend\HumanResource\PayrollAdvanceController::class);
    Route::apiResource('traffic-violations', App\Http\Controllers\Backend\HumanResource\TrafficViolationController::class);
    Route::apiResource('nationalities', App\Http\Controllers\Backend\HumanResource\NationalityController::class);
    Route::apiResource('professions', App\Http\Controllers\Backend\HumanResource\ProfessionController::class);

    // Accounting API Routes
    Route::get('/accounts/tree', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'tree']);
    Route::get('/accounts', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'index']);
    Route::apiResource('journals', App\Http\Controllers\Backend\Accounting\JournalController::class);
    Route::get('/journals/next-code', [App\Http\Controllers\Backend\Accounting\JournalController::class, 'nextCode']);
    Route::get('/financial-reports', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getData']);
    Route::post('/reports/favorite', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'favorites']);

    // Category Management API Routes
    Route::get('/categories/tree', [App\Http\Controllers\Api\CategoryController::class, 'tree']);
    Route::apiResource('categories', App\Http\Controllers\Api\CategoryController::class);

    // Task Management API Routes
    Route::get('tasks/categories', [TaskCategoryController::class, 'index']);
    Route::get('tasks/priorities', [TaskPriorityController::class, 'index']);
    Route::get('tasks/statuses', [TaskStatusController::class, 'index']);
    Route::get('tasks/statistics', [TaskController::class, 'statistics']);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('assignments', TaskAssignmentController::class);
    Route::apiResource('attachments', TaskAttachmentController::class);
    Route::apiResource('comments', TaskCommentController::class);

    // Role and Permission Management API Routes
    Route::apiResource('roles', App\Http\Controllers\Api\RoleController::class);
    Route::post('/roles/{roleId}/assign-permission', [App\Http\Controllers\Api\RoleController::class, 'assignPermission']);
    Route::post('/roles/{roleId}/remove-permission', [App\Http\Controllers\Api\RoleController::class, 'removePermission']);
    Route::apiResource('permissions', App\Http\Controllers\Api\PermissionController::class);
});

// Cache Management API Routes (Can remain outside or inside depending on security needs)
Route::prefix('cache')->group(function () {
    Route::post('/clear-app', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearAppCache']);
    Route::post('/clear-config', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearConfigCache']);
    Route::post('/clear-route', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearRouteCache']);
    Route::post('/clear-view', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearViewCache']);
    Route::post('/clear-all', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearAll']);
});

// Market Price Sync API
Route::get('/sync-price', [App\Http\Controllers\Backend\InvestingStack\MarketPriceController::class, 'syncPrice']);
