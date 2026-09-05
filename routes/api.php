<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Backend\Tasks\TaskController;
use App\Http\Controllers\Backend\Tasks\TaskCategoryController;
use App\Http\Controllers\Backend\Tasks\TaskPriorityController;
use App\Http\Controllers\Backend\Tasks\TaskStatusController;
use App\Http\Controllers\Backend\Tasks\TaskAssignmentController;
use App\Http\Controllers\Backend\Tasks\TaskAttachmentController;
use App\Http\Controllers\Backend\Tasks\TaskCommentController;

// =========================================================================
// Public API Routes
// =========================================================================
Route::post('/login', [AuthApiController::class, 'login']);

// P0-03: Disable public API registration.
// Web registration at /{country}/{lang}/register is unaffected.
Route::post('/register', function () {
    return response()->json([
        'message' => 'API registration is disabled. Please use the web registration form.',
    ], 403);
});

// Public sync endpoint (needs auth)
Route::middleware([\App\Http\Middleware\ApiAuth::class])->group(function () {
    Route::post('/mobile/sync', [App\Http\Controllers\Api\MobileSyncController::class, 'sync']);
});

// =========================================================================
// Authenticated API Routes — Read-Only (any authenticated user)
// =========================================================================
Route::middleware([\App\Http\Middleware\ApiAuth::class])->group(function () {
    Route::post('/logout', [AuthApiController::class, 'logout']);
    Route::get('/user', [AuthApiController::class, 'user']);

    // Dashboard API Routes (read-only)
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [App\Http\Controllers\Api\DashboardController::class, 'stats']);
        Route::get('/sales-chart', [App\Http\Controllers\Api\DashboardController::class, 'salesChart']);
        Route::get('/order-status-distribution', [App\Http\Controllers\Api\DashboardController::class, 'orderStatusDistribution']);
        Route::get('/revenue-by-month', [App\Http\Controllers\Api\DashboardController::class, 'revenueByMonth']);
        Route::get('/recent-activity', [App\Http\Controllers\Api\DashboardController::class, 'recentActivity']);
        Route::get('/top-selling-products', [App\Http\Controllers\Api\DashboardController::class, 'topSellingProducts']);
        Route::get('/low-stock-alerts', [App\Http\Controllers\Api\DashboardController::class, 'lowStockAlerts']);
    });

    // Read-only reference data
    Route::get('/departments', function () {
        return App\Models\Assets\Department::all();
    });
    Route::get('/branches', function () {
        return App\Models\Branch::all();
    });
    Route::get('/currencies', function () {
        return App\Models\Currency::where('status', 'active')->orderBy('code')->get();
    });

    // Read-only accounting data
    Route::get('/accounts/tree', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'tree']);
    Route::get('/accounts/valid-parents', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'validParents']);
    Route::get('/accounts/next-code', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'getNextCode']);
    Route::get('/accounts', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'index']);
    Route::get('/journals/next-code', [App\Http\Controllers\Backend\Accounting\JournalController::class, 'nextCode']);
    Route::get('/reports/general-ledger', [App\Http\Controllers\Backend\Accounting\JournalController::class, 'generalLedger']);
    Route::get('/reports/balance-sheet', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getBalanceSheetData']);
    Route::get('/reports/trial-balance', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getTrialBalanceData']);
    Route::get('/reports/profit-loss', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossData']);
    Route::get('/reports/profit-loss-class', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossByClassData']);
    Route::get('/reports/profit-loss-customer', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossByCustomerData']);
    Route::get('/reports/profit-loss-month', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossByMonthData']);
    Route::get('/reports/profit-loss-comparison', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossComparisonData']);
    Route::get('/reports/profit-loss-detail', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossDetailData']);
    Route::get('/reports/cash-flow', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getCashFlowData']);
    Route::get('/financial-reports', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getData']);
    Route::get('/financial-reports/inventory-valuation-summary', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getInventoryValuationSummaryData']);
    Route::get('/reports/favorites', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'favorites']);

    // Read-only category data
    Route::get('/categories/tree', [App\Http\Controllers\Api\CategoryController::class, 'tree']);

    // Read-only task reference data
    Route::get('tasks/categories', [TaskCategoryController::class, 'index']);
    Route::get('tasks/priorities', [TaskPriorityController::class, 'index']);
    Route::get('tasks/statuses', [TaskStatusController::class, 'index']);

    // Read-only location data
    Route::get('locations/roots', [App\Http\Controllers\Backend\Location\LocationController::class, 'getRoots'])->name('api.locations.roots');
    Route::get('locations/{id}/children', [App\Http\Controllers\Backend\Location\LocationController::class, 'getChildren'])->name('api.locations.children');
    Route::get('locations/search', [App\Http\Controllers\Backend\Location\LocationController::class, 'index'])->name('api.locations.search');
    Route::get('locations/{location}/path', [App\Http\Controllers\Backend\Location\LocationController::class, 'getPath'])->name('api.locations.path');
    Route::prefix('locations')->group(function () {
        Route::get('countries', [App\Http\Controllers\Backend\Location\LocationController::class, 'getCountries']);
        Route::get('states/{countryId}', [App\Http\Controllers\Backend\Location\LocationController::class, 'getStates']);
        Route::get('cities/{stateId}', [App\Http\Controllers\Backend\Location\LocationController::class, 'getCities']);
        Route::get('areas/{cityId}', [App\Http\Controllers\Backend\Location\LocationController::class, 'getAreas']);
    });

    // =========================================================================
    // Authorized API Routes — Write/Destructive Operations
    // P0-03: Each route group requires the specified permission ability.
    // =========================================================================

    // --- User Management ---
    Route::middleware('api.admin:users.view')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Api\UserController::class)->only(['index', 'show']);
    });
    Route::middleware('api.admin:users.create')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Api\UserController::class)->only(['store']);
    });
    Route::middleware('api.admin:users.edit')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Api\UserController::class)->only(['update']);
        Route::post('/users/{userId}/assign-role', [App\Http\Controllers\Api\UserController::class, 'assignRole']);
        Route::post('/users/{userId}/remove-role', [App\Http\Controllers\Api\UserController::class, 'removeRole']);
    });
    Route::middleware('api.admin:users.delete')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Api\UserController::class)->only(['destroy']);
        Route::post('/users/bulk-delete', [App\Http\Controllers\Api\UserController::class, 'bulkDelete']);
    });

    // --- Product Management ---
    Route::middleware('api.admin:products.view')->group(function () {
        Route::apiResource('products', App\Http\Controllers\Api\ProductController::class)->only(['index', 'show']);
    });
    Route::middleware('api.admin:products.create')->group(function () {
        Route::apiResource('products', App\Http\Controllers\Api\ProductController::class)->only(['store']);
    });
    Route::middleware('api.admin:products.edit')->group(function () {
        Route::apiResource('products', App\Http\Controllers\Api\ProductController::class)->only(['update']);
        Route::post('/products/{id}/update-stock', [App\Http\Controllers\Api\ProductController::class, 'updateStock']);
        Route::post('/products/bulk-update-status', [App\Http\Controllers\Api\ProductController::class, 'bulkUpdateStatus']);
    });
    Route::middleware('api.admin:products.delete')->group(function () {
        Route::apiResource('products', App\Http\Controllers\Api\ProductController::class)->only(['destroy']);
        Route::post('/products/bulk-delete', [App\Http\Controllers\Api\ProductController::class, 'bulkDelete']);
    });

    // --- Order Management ---
    Route::middleware('api.admin:orders.view')->group(function () {
        Route::apiResource('orders', App\Http\Controllers\Api\OrderController::class)->only(['index', 'show']);
    });
    Route::middleware('api.admin:orders.create')->group(function () {
        Route::apiResource('orders', App\Http\Controllers\Api\OrderController::class)->only(['store']);
    });
    Route::middleware('api.admin:orders.edit')->group(function () {
        Route::apiResource('orders', App\Http\Controllers\Api\OrderController::class)->only(['update']);
        Route::patch('/orders/{id}/status', [App\Http\Controllers\Api\OrderController::class, 'updateStatus']);
        Route::post('/orders/bulk-update-status', [App\Http\Controllers\Api\OrderController::class, 'bulkUpdateStatus']);
    });
    Route::middleware('api.admin:orders.delete')->group(function () {
        Route::apiResource('orders', App\Http\Controllers\Api\OrderController::class)->only(['destroy']);
        Route::post('/orders/bulk-delete', [App\Http\Controllers\Api\OrderController::class, 'bulkDelete']);
    });

    // --- Employee Management ---
    Route::middleware('api.admin:employees.view')->group(function () {
        Route::get('/employees', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'getEmployees']);
        Route::get('/employees/{employee}', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'show']);
    });
    Route::middleware('api.admin:employees.create')->group(function () {
        Route::post('/employees', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'store']);
    });
    Route::middleware('api.admin:employees.edit')->group(function () {
        Route::put('/employees/{employee}', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'update']);
        Route::post('/employees/{employee}', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'update']);
        Route::post('/employees/bulk-update-status', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'bulkUpdateStatus']);
    });
    Route::middleware('api.admin:employees.delete')->group(function () {
        Route::delete('/employees/{employee}', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'destroy']);
        Route::post('/employees/bulk-delete', [App\Http\Controllers\Backend\HumanResource\EmployeeController::class, 'bulkDelete']);
    });

    // --- Account (Chart of Accounts) Management ---
    Route::middleware('api.admin:accounts.create')->group(function () {
        Route::apiResource('accounts', App\Http\Controllers\Backend\Accounting\AccountsController::class)->only(['store']);
        Route::post('/accounts/bulk-import', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'bulkImport'])->name('admin.accounts.bulkImport');
    });
    Route::middleware('api.admin:accounts.edit')->group(function () {
        Route::apiResource('accounts', App\Http\Controllers\Backend\Accounting\AccountsController::class)->only(['update']);
        Route::patch('/accounts/{account}/stop', [App\Http\Controllers\Backend\Accounting\AccountsController::class, 'stop']);
    });
    Route::middleware('api.admin:accounts.delete')->group(function () {
        Route::apiResource('accounts', App\Http\Controllers\Backend\Accounting\AccountsController::class)->only(['destroy']);
    });

    // --- Journal Management ---
    Route::middleware('api.admin:journals.view')->group(function () {
        Route::apiResource('journals', App\Http\Controllers\Backend\Accounting\JournalController::class)->only(['index', 'show']);
    });
    Route::middleware('api.admin:journals.create')->group(function () {
        Route::apiResource('journals', App\Http\Controllers\Backend\Accounting\JournalController::class)->only(['store']);
    });
    Route::middleware('api.admin:journals.edit')->group(function () {
        Route::apiResource('journals', App\Http\Controllers\Backend\Accounting\JournalController::class)->only(['update']);
    });
    Route::middleware('api.admin:journals.delete')->group(function () {
        Route::apiResource('journals', App\Http\Controllers\Backend\Accounting\JournalController::class)->only(['destroy']);
    });

    // --- Posting Operations (especially sensitive) ---
    Route::middleware('api.admin:accounting.post')->group(function () {
        Route::post('/reports/post-journal', [App\Http\Controllers\Backend\Accounting\JournalController::class, 'postAll']);
    });
    Route::middleware('api.admin:accounting.unpost')->group(function () {
        Route::post('/reports/unpost-journal', [App\Http\Controllers\Backend\Accounting\JournalController::class, 'unpostAll']);
    });

    // --- Financial Report Favorites ---
    Route::post('/reports/favorite', [App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'toggleFavorite']);

    // --- Category Management ---
    Route::middleware('api.admin:categories.view')->group(function () {
        Route::apiResource('categories', App\Http\Controllers\Api\CategoryController::class)->only(['index', 'show']);
    });
    Route::middleware('api.admin:categories.create')->group(function () {
        Route::apiResource('categories', App\Http\Controllers\Api\CategoryController::class)->only(['store']);
    });
    Route::middleware('api.admin:categories.edit')->group(function () {
        Route::apiResource('categories', App\Http\Controllers\Api\CategoryController::class)->only(['update']);
    });
    Route::middleware('api.admin:categories.delete')->group(function () {
        Route::apiResource('categories', App\Http\Controllers\Api\CategoryController::class)->only(['destroy']);
    });

    // --- HR Resource Management ---
    // These use the closest matching existing permission.
    // deductions/rewards/attendances/payroll-advances/traffic-violations map to HR permissions.
    Route::middleware('api.admin:employees.create')->group(function () {
        Route::apiResource('deductions', App\Http\Controllers\Backend\HumanResource\DeductionController::class);
        Route::apiResource('rewards', App\Http\Controllers\Backend\HumanResource\RewardController::class);
        Route::apiResource('attendances', App\Http\Controllers\Backend\HumanResource\AttendanceController::class);
        Route::apiResource('payroll-advances', App\Http\Controllers\Backend\HumanResource\PayrollAdvanceController::class);
        Route::apiResource('traffic-violations', App\Http\Controllers\Backend\HumanResource\TrafficViolationController::class);
        Route::apiResource('nationalities', App\Http\Controllers\Backend\HumanResource\NationalityController::class);
        Route::apiResource('professions', App\Http\Controllers\Backend\HumanResource\ProfessionController::class);
    });

    // --- Task Management ---
    Route::middleware('api.admin:employees.create')->group(function () {
        Route::get('tasks/statistics', [TaskController::class, 'statistics']);
        Route::apiResource('tasks', TaskController::class);
        Route::apiResource('assignments', TaskAssignmentController::class);
        Route::apiResource('attachments', TaskAttachmentController::class);
        Route::apiResource('comments', TaskCommentController::class);
    });

    // --- Location Management (write operations) ---
    Route::middleware('api.admin:employees.edit')->group(function () {
        Route::patch('locations/{location}/toggle-status', [App\Http\Controllers\Backend\Location\LocationController::class, 'toggleStatus'])->name('api.locations.toggle-status');
        Route::apiResource('locations', App\Http\Controllers\Backend\Location\LocationController::class)->names([
            'index' => 'api.locations.index',
            'store' => 'api.locations.store',
            'show' => 'api.locations.show',
            'update' => 'api.locations.update',
            'destroy' => 'api.locations.destroy',
        ]);
    });

    // =========================================================================
    // P0-01: Cache Management — Admin-only (moved inside ApiAuth group)
    // =========================================================================
    Route::middleware('api.admin:employees.view')->prefix('cache')->name('api.cache.')->group(function () {
        Route::post('/clear-app', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearAppCache'])->name('clear-app');
        Route::post('/clear-config', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearConfigCache'])->name('clear-config');
        Route::post('/clear-route', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearRouteCache'])->name('clear-route');
        Route::post('/clear-view', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearViewCache'])->name('clear-view');
        Route::post('/clear-all', [App\Http\Controllers\Backend\Settings\CacheController::class, 'clearAll'])->name('clear-all');
    });
});

// Market Price Sync API (read-only, P1 item — left as-is for now)
Route::get('/sync-price', [App\Http\Controllers\Backend\InvestingStack\MarketPriceController::class, 'syncPrice']);
