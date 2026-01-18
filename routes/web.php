<?php

use App\Http\Controllers\Accounting\AccountsController;
use App\Http\Controllers\Accounting\JournalController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\Accounting\FinancialReportController;
use App\Http\Controllers\HumanResource\EmployeeController;
use App\Http\Controllers\HumanResource\NationalityController;
use App\Http\Controllers\Location\LocationController;
use App\Http\Controllers\Media\MediaController;
use App\Http\Controllers\ECommerce\AdsController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\Purchases\SupplierController;
use App\Http\Controllers\Sales\CustomerController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


// Supplier Routes
Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index');

Route::prefix('supplier')->name('supplier.')->group(function () {
    Route::middleware('guest:supplier')->group(function () {
        Route::get('register', [SupplierController::class, 'create'])->name('register');
        Route::post('register', [SupplierController::class, 'store'])->name('store');
        Route::get('login', [SupplierController::class, 'login'])->name('login');
        Route::post('login', [SupplierController::class, 'authenticate'])->name('authenticate');
    });

    Route::middleware('auth:supplier')->group(function () {
        Route::get('dashboard', [SupplierController::class, 'dashboard'])->name('dashboard');
        Route::post('logout', [SupplierController::class, 'logout'])->name('logout');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/admin', [AdminController::class, 'index'])
        ->middleware('admin')
        ->name('admin');

    Route::prefix('admin/media')->middleware('admin')->name('admin.media.')->group(function () {
        Route::get('/{tab?}', [MediaController::class, 'index'])
            ->where('tab', 'images|videos|documents')
            ->name('index');
        Route::post('/store', [MediaController::class, 'store'])->name('store');
        Route::post('/folder', [MediaController::class, 'storeFolder'])->name('folder.store');
        Route::post('/destroy', [MediaController::class, 'destroy'])->name('destroy');
        Route::post('/rename', [MediaController::class, 'rename'])->name('rename');
        Route::post('/move', [MediaController::class, 'move'])->name('move');
    });

    Route::get('/customers', [CustomerController::class, 'index'])
        ->middleware('customer')
        ->name('customers.dashboard');

    Route::get('/admin/location', [LocationController::class, 'index'])->name('admin.location');
    Route::post('/admin/location/countries', [LocationController::class, 'storeCountry']);
    Route::put('/admin/location/countries/{country}', [LocationController::class, 'updateCountry']);
    Route::delete('/admin/location/countries/{country}', [LocationController::class, 'destroyCountry']);
    Route::post('/admin/location/cities', [LocationController::class, 'storeCity']);
    Route::put('/admin/location/cities/{city}', [LocationController::class, 'updateCity']);
    Route::delete('/admin/location/cities/{city}', [LocationController::class, 'destroyCity']);
    Route::post('/admin/location/areas', [LocationController::class, 'storeArea']);
    Route::put('/admin/location/areas/{area}', [LocationController::class, 'updateArea']);
    Route::delete('/admin/location/areas/{area}', [LocationController::class, 'destroyArea']);
    Route::post('/admin/location/bulk-status', [LocationController::class, 'bulkUpdateStatus']);
    Route::post('/admin/location/bulk-delete', [LocationController::class, 'bulkDelete']);

    Route::get('/admin/attendance', function () {
        return Inertia::render('Backend/02_human_resource/Attendance');
    })->name('admin.attendance');

    Route::resource('/admin/company-info', \App\Http\Controllers\Essential_Data_Controllers\CompanyInfoController::class)
        ->names([
            'index' => 'admin.company_info.index',
            'create' => 'admin.company_info.create',
            'store' => 'admin.company_info.store',
            'show' => 'admin.company_info.show',
            'edit' => 'admin.company_info.edit',
            'update' => 'admin.company_info.update',
            'destroy' => 'admin.company_info.destroy',
        ]);

    Route::resource('/admin/categories', \App\Http\Controllers\Inventory\CategoriesController::class)
        ->names([
            'index' => 'admin.categories.index',
            'store' => 'admin.categories.store',
            'update' => 'admin.categories.update',
            'destroy' => 'admin.categories.destroy',
        ]);

    Route::resource('/admin/brands', \App\Http\Controllers\Inventory\BrandsController::class)
        ->names([
            'index' => 'admin.brands.index',
            'store' => 'admin.brands.store',
            'update' => 'admin.brands.update',
            'destroy' => 'admin.brands.destroy',
        ]);

    // Explicitly allow POST for product updates to handle file uploads without method spoofing issues
    Route::post('/admin/products/{product}', [\App\Http\Controllers\Inventory\ProductsController::class, 'update'])->name('admin.products.update');
    Route::resource('/admin/products', \App\Http\Controllers\Inventory\ProductsController::class)
        ->names([
            'index' => 'admin.products.index',
            'store' => 'admin.products.store',
            'destroy' => 'admin.products.destroy',
        ])->except(['update']);

    Route::resource('/admin/branch-info', \App\Http\Controllers\Essential_Data_Controllers\BranchInfoController::class)
        ->names([
            'index' => 'admin.branch_info.index',
            'create' => 'admin.branch_info.create',
            'store' => 'admin.branch_info.store',
            'show' => 'admin.branch_info.show',
            'edit' => 'admin.branch_info.edit',
            'update' => 'admin.branch_info.update',
            'destroy' => 'admin.branch_info.destroy',
        ]);

    Route::get('/admin/departments', function () {
        return Inertia::render('Backend/02_human_resource/Departments');
    })->name('admin.departments');

    Route::get('/admin/profession', function () {
        return Inertia::render('Backend/02_human_resource/Profession');
    })->name('admin.profession');

    Route::get('/admin/employees', [EmployeeController::class, 'index'])->middleware('admin')->name('admin.employees');

    Route::get('/admin/suppliers', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'index'])->middleware('admin')->name('admin.suppliers.index');
    Route::get('/admin/suppliers/{supplier}/profile', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'profile'])->middleware('admin')->name('admin.suppliers.profile');

    Route::get('/admin/permissions', function () {
        return Inertia::render('Backend/02_human_resource/Permissions');
    })->name('admin.permissions');

    Route::get('/admin/nationalities', function () {
        return Inertia::render('Backend/02_human_resource/Nationalities');
    })->name('admin.nationalities');

    Route::get('/admin/reward', function () {
        return Inertia::render('Backend/02_human_resource/Reward');
    })->name('admin.reward');

    Route::get('/admin/overtime', function () {
        return Inertia::render('Backend/02_human_resource/OverTime');
    })->name('admin.overtime');

    Route::get('/admin/end-of-service', function () {
        return Inertia::render('Backend/02_human_resource/End-of-service');
    })->name('admin.end-of-service');

    Route::get('/admin/payroll-advance', function () {
        return Inertia::render('Backend/02_human_resource/Payroll-Advance');
    })->name('admin.payroll-advance');

    Route::get('/admin/deductions', function () {
        return Inertia::render('Backend/02_human_resource/Deductions');
    })->name('admin.deductions');

    Route::get('/admin/salary-receipt', function () {
        return Inertia::render('Backend/02_human_resource/Salary-Receipt');
    })->name('admin.salary-receipt');

    Route::get('/admin/vacations', function () {
        return Inertia::render('Backend/02_human_resource/Vacations');
    })->name('admin.vacations');

    Route::get('/admin/traffic-violations', function () {
        return Inertia::render('Backend/02_human_resource/Traffic-Violations');
    })->name('admin.traffic-violations');

    Route::get('/admin/journals', function () {
        return Inertia::render('Backend/07-Accounting/JournalEntity');
    })->name('admin.journals.index');

    Route::get('/admin/journals/create', function () {
        return Inertia::render('Backend/07-Accounting/JournalEntityCE');
    })->name('admin.journals.create');

    Route::get('/admin/journals/{qaidCode}', function () {
        return Inertia::render('Backend/07-Accounting/JournalEntityCE');
    })->name('admin.journals.show');

    Route::get('/admin/journals/{qaidCode}/edit', function () {
        return Inertia::render('Backend/07-Accounting/JournalEntityCE');
    })->name('admin.journals.edit');

    Route::get('/admin/salary-receipt', function () {
        return Inertia::render('Backend/02_human_resource/Salary-Receipt');
    })->name('admin.salary-receipt');

    Route::get('/admin/tasks', function () {
        return Inertia::render('Backend/Tasks/TaskManager');
    })->middleware('role:admin')->name('admin.tasks');

    Route::resource('/admin/warehouses', \App\Http\Controllers\Inventory\WarehousesController::class)
        ->names([
            'index' => 'admin.warehouses',
            'store' => 'admin.warehouses.store',
            'show' => 'admin.warehouses.show',
            'update' => 'admin.warehouses.update',
            'destroy' => 'admin.warehouses.destroy',
        ])->except(['create', 'edit']);

    Route::resource('/admin/categories', \App\Http\Controllers\Inventory\CategoriesController::class)
        ->names([
            'index' => 'admin.categories',
            'store' => 'admin.categories.store',
            'show' => 'admin.categories.show',
            'update' => 'admin.categories.update',
            'destroy' => 'admin.categories.destroy',
        ])->except(['create', 'edit']);

    Route::prefix('api/tasks')->group(function () {
        Route::middleware('auth')->group(function () {
            // Specific subpaths FIRST to avoid matching by /{task}
            Route::get('/statistics', [\App\Http\Controllers\Tasks\TaskController::class, 'statistics']);
            Route::resource('assignments', \App\Http\Controllers\Tasks\TaskAssignmentController::class);
            Route::resource('attachments', \App\Http\Controllers\Tasks\TaskAttachmentController::class);
            Route::resource('categories', \App\Http\Controllers\Tasks\TaskCategoryController::class);
            Route::resource('comments', \App\Http\Controllers\Tasks\TaskCommentController::class);
            Route::resource('priorities', \App\Http\Controllers\Tasks\TaskPriorityController::class);
            Route::resource('statuses', \App\Http\Controllers\Tasks\TaskStatusController::class);

            // Core task CRUD
            Route::get('/', [\App\Http\Controllers\Tasks\TaskController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Tasks\TaskController::class, 'store']);
            Route::get('/{task}', [\App\Http\Controllers\Tasks\TaskController::class, 'show'])->where('task', '[0-9]+');
            Route::post('/{task}', [\App\Http\Controllers\Tasks\TaskController::class, 'update'])->where('task', '[0-9]+');
            Route::put('/{task}', [\App\Http\Controllers\Tasks\TaskController::class, 'update'])->where('task', '[0-9]+');
            Route::delete('/{task}', [\App\Http\Controllers\Tasks\TaskController::class, 'destroy'])->where('task', '[0-9]+');
        });
    });
    Route::prefix('api')->group(function () {
        Route::get('/countries', [LocationController::class, 'getCountries']);
        Route::get('/cities', [LocationController::class, 'getCities']);
        Route::get('/areas', [LocationController::class, 'getAreas']);

        Route::get('/employees', [EmployeeController::class, 'getEmployees']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::post('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
        Route::post('/employees/bulk-status', [EmployeeController::class, 'bulkUpdateStatus']);
        Route::post('/employees/bulk-delete', [EmployeeController::class, 'bulkDelete']);

        // Admin API for Suppliers
        Route::get('/admin/suppliers/data', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'getSuppliers']);
        Route::post('/admin/suppliers', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'store']);
        Route::post('/admin/suppliers/import', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'import']);
        Route::post('/admin/suppliers/{supplier}', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'update']);
        Route::get('/admin/suppliers/{supplier}', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'show']);
        Route::put('/admin/suppliers/{supplier}', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'update']);
        Route::delete('/admin/suppliers/{supplier}', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'destroy']);
        Route::post('/admin/suppliers/bulk-status', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'bulkUpdateStatus']);
        Route::post('/admin/suppliers/bulk-delete', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'bulkDelete']);
        Route::post('/admin/suppliers/{supplier}/products', [\App\Http\Controllers\Purchases\SupplierManagementController::class, 'assignProducts']);
        Route::get('/accounts', [AccountsController::class, 'index']);
        Route::get('/accounts/tree', [AccountsController::class, 'tree']);
        Route::get('/accounts/{account}', [AccountsController::class, 'show']);
        Route::post('/accounts', [AccountsController::class, 'store']);
        Route::post('/accounts/{account}', [AccountsController::class, 'update']);
        Route::put('/accounts/{account}', [AccountsController::class, 'update']);
        Route::patch('/accounts/{account}/stop', [AccountsController::class, 'stop']);
        Route::delete('/accounts/{account}', [AccountsController::class, 'destroy']);

        Route::get('/journals', [JournalController::class, 'index']);
        Route::get('/journals/next-code', [JournalController::class, 'nextCode']);
        Route::get('/journals/{qaidCode}', [JournalController::class, 'show']);
        Route::post('/journals', [JournalController::class, 'store']);
        Route::put('/journals/{qaidCode}', [JournalController::class, 'update']);
        Route::delete('/journals/{qaidCode}', [JournalController::class, 'destroy']);

        Route::get('/reports/general-ledger', [JournalController::class, 'generalLedger']);

        Route::get('/financial-reports', [FinancialReportController::class, 'index']);
        Route::get('/user/favorite-reports', [FinancialReportController::class, 'favorites']);
        Route::post('/reports/favorite', [FinancialReportController::class, 'toggleFavorite']);

        Route::get('/ads', [AdsController::class, 'index']);
        Route::get('/ads/{ad}', [AdsController::class, 'show']);
        Route::post('/ads', [AdsController::class, 'store']);
        Route::post('/ads/{ad}', [AdsController::class, 'update']);
        Route::put('/ads/{ad}', [AdsController::class, 'update']);
        Route::delete('/ads/{ad}', [AdsController::class, 'destroy']);
        Route::post('/ads/bulk-delete', [AdsController::class, 'bulkDelete']);
        Route::post('/ads/bulk-status', [AdsController::class, 'bulkStatus']);
        Route::post('/ads/{ad}/click', [AdsController::class, 'click']);
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Session-backed API endpoints for dashboard widgets
    Route::prefix('api/dashboard')->group(function () {
        Route::get('/stats', function () {
            return response()->json([
                'totalUsers' => 124,
                'totalOrders' => 56,
                'totalRevenue' => 12450,
                'totalProducts' => 89
            ]);
        });
        Route::get('/activity', function () {
            return response()->json([
                ['id' => 1, 'action' => 'New user registered', 'user' => 'John Doe', 'time' => '2 minutes ago'],
                ['id' => 2, 'action' => 'Order placed', 'user' => 'Jane Smith', 'time' => '15 minutes ago'],
                ['id' => 3, 'action' => 'Product updated', 'user' => 'Admin', 'time' => '1 hour ago'],
                ['id' => 4, 'action' => 'Payment received', 'user' => 'Mike Johnson', 'time' => '3 hours ago'],
            ]);
        });
    });

    Route::get('/admin/chart-of-accounts', function () {
        return Inertia::render('Backend/07-Accounting/ChartOfAccounts');
    })->name('admin.chart-of-accounts');

    Route::get('/reports', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports');
    })->name('admin.reports.index');

    Route::get('/reports/chart-of-accounts', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports/COAReport');
    })->name('admin.reports.chart-of-accounts');

    Route::get('/reports/trial-balance', function () {

        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'trial-balance',
        ]);
    })->name('admin.reports.trial-balance');

    Route::get('/reports/income-statement', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'income-statement',
        ]);
    })->name('admin.reports.income-statement');

    Route::get('/reports/balance-sheet', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'balance-sheet',
        ]);
    })->name('admin.reports.balance-sheet');

    Route::get('/reports/cash-flow', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'cash-flow',
        ]);
    })->name('admin.reports.cash-flow');

    Route::get('/reports/general-ledger', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports/GeneralLedger');
    })->name('admin.reports.general-ledger');

    Route::get('/reports/account-statement', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'account-statement',
        ]);
    })->name('admin.reports.account-statement');

    Route::get('/reports/accounts-receivable-aging', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'ar-aging',
        ]);
    })->name('admin.reports.ar-aging');

    Route::get('/reports/accounts-payable-aging', function () {
        return Inertia::render('Backend/07-Accounting/FinancialReports', [
            'activeReport' => 'ap-aging',
        ]);
    })->name('admin.reports.ap-aging');

    Route::get('/admin/ecommerce/ads', function () {
        return Inertia::render('Backend/E-Commerce/Ads/Ads');
    })->name('admin.ecommerce.ads');

    Route::get('/admin/ecommerce/ads/create', function () {
        return Inertia::render('Backend/E-Commerce/Ads/AdsCE', [
            'mode' => 'create',
        ]);
    })->name('admin.ecommerce.ads.create');

    Route::get('/admin/ecommerce/ads/{adId}/edit', function (int $adId) {
        return Inertia::render('Backend/E-Commerce/Ads/AdsCE', [
            'mode' => 'edit',
            'adId' => $adId,
        ]);
    })->name('admin.ecommerce.ads.edit');


});

Route::get('/', [HomeController::class, 'index'])->name('frontend');
Route::get('/product/{identifier}', [HomeController::class, 'productDetails'])->name('product.details');
Route::post('/cart/add', [CartController::class, 'add'])->name('cart.add');
Route::get('/cart/mini', [CartController::class, 'mini'])->name('cart.mini');
Route::post('/cart/remove', [CartController::class, 'remove'])->name('cart.remove');

require __DIR__.'/auth.php';
