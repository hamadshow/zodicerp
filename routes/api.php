<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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

// Category Management API Routes
Route::get('/categories/tree', [App\Http\Controllers\Api\CategoryController::class, 'tree']);
Route::apiResource('categories', App\Http\Controllers\Api\CategoryController::class);

// Role and Permission Management API Routes
Route::apiResource('roles', App\Http\Controllers\Api\RoleController::class);
Route::post('/roles/{roleId}/assign-permission', [App\Http\Controllers\Api\RoleController::class, 'assignPermission']);
Route::post('/roles/{roleId}/remove-permission', [App\Http\Controllers\Api\RoleController::class, 'removePermission']);
Route::apiResource('permissions', App\Http\Controllers\Api\PermissionController::class);
