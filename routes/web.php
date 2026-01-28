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
// Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index');

// Route::prefix('supplier')->name('supplier.')->group(function () {
//    Route::middleware('guest:supplier')->group(function () {
//        Route::get('register', [SupplierController::class, 'create'])->name('register');
//        Route::post('register', [SupplierController::class, 'store'])->name('store');
//        Route::get('login', [SupplierController::class, 'login'])->name('login');
//        Route::post('login', [SupplierController::class, 'authenticate'])->name('authenticate');
//    });


//    Route::middleware('auth:supplier')->group(function () {
//        Route::get('dashboard', [SupplierController::class, 'dashboard'])->name('dashboard');
//        Route::post('logout', [SupplierController::class, 'logout'])->name('logout');
//    });
// });

Route::middleware('auth')->group(function () {
    Route::get('/admin', [AdminController::class, 'index'])
        ->middleware('admin')
        ->name('admin');

    Route::prefix('admin/media')->middleware('admin')->name('admin.media.')->group(function () {
        Route::get('/{tab?}', [MediaController::class, 'index'])
            ->where('tab', 'images|videos|documents')
            ->name('index');
        Route::post('/store', [MediaController::class, 'store'])->name('store');
        Route::post('/import-products', [MediaController::class, 'importProductImages'])->name('import-products');
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
    Route::post('/admin/location/bulk-import', [LocationController::class, 'bulkImport']);

    Route::resource('/admin/currencies', \App\Http\Controllers\Essential_Data_Controllers\CurrencyController::class)
        ->names([
            'index' => 'admin.currencies.index',
            'store' => 'admin.currencies.store',
            'update' => 'admin.currencies.update',
            'destroy' => 'admin.currencies.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::post('/admin/exchange-rates/fetch', [\App\Http\Controllers\Essential_Data_Controllers\ExchangeRateController::class, 'fetchRates'])->name('admin.exchange_rates.fetch');
    Route::resource('/admin/exchange-rates', \App\Http\Controllers\Essential_Data_Controllers\ExchangeRateController::class)
        ->names([
            'index' => 'admin.exchange_rates.index',
            'store' => 'admin.exchange_rates.store',
            'update' => 'admin.exchange_rates.update',
            'destroy' => 'admin.exchange_rates.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::get('/admin/attendance', function () {
        return Inertia::render('Backend/02_human_resource/Attendance');
    })->name('admin.attendance');

    Route::resource('/admin/companies', \App\Http\Controllers\Essential_Data_Controllers\CompanyController::class)
        ->names([
            'index' => 'admin.companies.index',
            'create' => 'admin.companies.create',
            'store' => 'admin.companies.store',
            'show' => 'admin.companies.show',
            'edit' => 'admin.companies.edit',
            'update' => 'admin.companies.update',
            'destroy' => 'admin.companies.destroy',
        ]);

    Route::resource('/admin/categories', \App\Http\Controllers\Inventory\CategoriesController::class)
        ->names([
            'index' => 'admin.categories.index',
            'store' => 'admin.categories.store',
            'update' => 'admin.categories.update',
            'destroy' => 'admin.categories.destroy',
        ]);

    Route::prefix('admin/assets')->name('admin.assets.')->group(function () {
        Route::resource('asset-categories', \App\Http\Controllers\Assets\AssetCategoryController::class)
            ->except(['create', 'edit', 'show']);
        Route::resource('asset-attributes', \App\Http\Controllers\Assets\AssetAttributeController::class)
            ->except(['show']);
    });

    // Explicitly allow POST for asset updates to handle file uploads without method spoofing issues
    Route::post('/admin/assets/{asset}', [\App\Http\Controllers\Assets\AssetController::class, 'update'])->name('admin.assets.update');
    Route::resource('/admin/assets', \App\Http\Controllers\Assets\AssetController::class)
        ->names([
            'index' => 'admin.assets.index',
            'create' => 'admin.assets.create',
            'store' => 'admin.assets.store',
            'edit' => 'admin.assets.edit',
            'destroy' => 'admin.assets.destroy',
        ])->except(['update']);

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

    Route::resource('/admin/branches', \App\Http\Controllers\Essential_Data_Controllers\BranchController::class)
        ->names([
            'index' => 'admin.branches.index',
            'create' => 'admin.branches.create',
            'store' => 'admin.branches.store',
            'show' => 'admin.branches.show',
            'edit' => 'admin.branches.edit',
            'update' => 'admin.branches.update',
            'destroy' => 'admin.branches.destroy',
        ]);

    Route::get('/admin/departments', function () {
        return Inertia::render('Backend/02_human_resource/Departments');
    })->name('admin.departments');

    Route::get('/admin/profession', function () {
        return Inertia::render('Backend/02_human_resource/Profession');
    })->name('admin.profession');

    Route::get('/admin/employees', [EmployeeController::class, 'index'])->middleware('admin')->name('admin.employees');

    // Removed legacy SupplierManagement routes (controller deleted)

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

    Route::resource('/admin/banks', \App\Http\Controllers\Cash\BankController::class)
        ->names([
            'index' => 'admin.banks.index',
            'store' => 'admin.banks.store',
            'update' => 'admin.banks.update',
            'destroy' => 'admin.banks.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::resource('/admin/petty-cash', \App\Http\Controllers\Cash\PettyCashController::class)
        ->names([
            'index' => 'admin.petty-cash.index',
            'store' => 'admin.petty-cash.store',
            'update' => 'admin.petty-cash.update',
            'destroy' => 'admin.petty-cash.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::prefix('admin/client-sales')->name('admin.client-sales.')->group(function () {
        Route::resource('customer-groups', \App\Http\Controllers\Client_Sales\CustomerGroupController::class);
        
        Route::post('customers/bulk-delete', [\App\Http\Controllers\Client_Sales\CustomerController::class, 'bulkDelete'])->name('customers.bulk-delete');
        Route::post('customers/bulk-store', [\App\Http\Controllers\Client_Sales\CustomerController::class, 'bulkStore'])->name('customers.bulk-store');
        Route::resource('customers', \App\Http\Controllers\Client_Sales\CustomerController::class);

        Route::resource('invoices', \App\Http\Controllers\Client_Sales\SalesInvoiceController::class)
            ->except(['show']);
    });

    Route::post('/admin/banks/accounts', [\App\Http\Controllers\Cash\BankController::class, 'storeAccount'])->name('admin.banks.accounts.store');
    Route::put('/admin/banks/accounts/{bankAccount}', [\App\Http\Controllers\Cash\BankController::class, 'updateAccount'])->name('admin.banks.accounts.update');
    Route::delete('/admin/banks/accounts/{bankAccount}', [\App\Http\Controllers\Cash\BankController::class, 'destroyAccount'])->name('admin.banks.accounts.destroy');
    Route::get('/admin/banks/{bank}/accounts', [\App\Http\Controllers\Cash\BankController::class, 'getAccounts'])->name('admin.banks.accounts.index');

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

    Route::prefix('admin/taxes')->name('admin.taxes.')->group(function () {
        Route::resource('tax-types', \App\Http\Controllers\Taxes\TaxTypeController::class);
    });

    Route::get('/admin/tasks', function () {
        return Inertia::render('Backend/Tasks/TaskManager');
    })->middleware('role:admin')->name('admin.tasks');

    Route::get('/admin/budget', [\App\Http\Controllers\Backend\BudgetController::class, 'index'])->name('admin.budget.index');
    Route::resource('/admin/budget/categories', \App\Http\Controllers\Budget\BudgetCategoryController::class)
        ->names([
            'index' => 'admin.budget.categories.index',
            'store' => 'admin.budget.categories.store',
            'update' => 'admin.budget.categories.update',
            'destroy' => 'admin.budget.categories.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::get('/admin/investing-stack', [\App\Http\Controllers\Backend\InvestingStackController::class, 'index'])->name('admin.investing-stack.index');

    Route::resource('/admin/warehouses', \App\Http\Controllers\Inventory\WarehousesController::class)
        ->names([
            'index' => 'admin.warehouses',
            'store' => 'admin.warehouses.store',
            'show' => 'admin.warehouses.show',
            'update' => 'admin.warehouses.update',
            'destroy' => 'admin.warehouses.destroy',
        ])->except(['create', 'edit']);

    Route::resource('/admin/item-units', \App\Http\Controllers\Backend\ItemUnitController::class)
        ->names([
            'index' => 'admin.item-units.index',
            'store' => 'admin.item-units.store',
            'update' => 'admin.item-units.update',
            'destroy' => 'admin.item-units.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::resource('/admin/item-attributes', \App\Http\Controllers\Backend\ItemAttributeController::class)
        ->names([
            'index' => 'admin.item-attributes.index',
            'create' => 'admin.item-attributes.create',
            'store' => 'admin.item-attributes.store',
            'edit' => 'admin.item-attributes.edit',
            'update' => 'admin.item-attributes.update',
            'destroy' => 'admin.item-attributes.destroy',
        ])->except(['show']);

    Route::resource('/admin/item-collections', \App\Http\Controllers\Backend\ItemCollectionController::class)
        ->names([
            'index' => 'admin.item-collections.index',
            'create' => 'admin.item-collections.create',
            'store' => 'admin.item-collections.store',
            'edit' => 'admin.item-collections.edit',
            'update' => 'admin.item-collections.update',
            'destroy' => 'admin.item-collections.destroy',
        ])->except(['show']);

    Route::resource('/admin/cheques', \App\Http\Controllers\Cash\ChequeController::class)
        ->names([
            'index' => 'admin.cheques.index',
            'create' => 'admin.cheques.create',
            'store' => 'admin.cheques.store',
            'edit' => 'admin.cheques.edit',
            'update' => 'admin.cheques.update',
            'destroy' => 'admin.cheques.destroy',
        ])->except(['show']);

    Route::get('/admin/bank-transactions', [\App\Http\Controllers\Cash\BankTransactionController::class, 'index'])
        ->name('admin.bank-transactions.index');
    Route::post('/admin/bank-transactions', [\App\Http\Controllers\Cash\BankTransactionController::class, 'store'])
        ->name('admin.bank-transactions.store');
    Route::put('/admin/bank-transactions/{transaction}', [\App\Http\Controllers\Cash\BankTransactionController::class, 'update'])
        ->name('admin.bank-transactions.update');
    Route::delete('/admin/bank-transactions/{transaction}', [\App\Http\Controllers\Cash\BankTransactionController::class, 'destroy'])
        ->name('admin.bank-transactions.destroy');

    Route::resource('/admin/categories', \App\Http\Controllers\Inventory\CategoriesController::class)
        ->names([
            'index' => 'admin.categories',
            'store' => 'admin.categories.store',
            'show' => 'admin.categories.show',
            'update' => 'admin.categories.update',
            'destroy' => 'admin.categories.destroy',
        ]);

    Route::resource('/admin/purchases/quotations', \App\Http\Controllers\Purchases\PurchaseQuotationController::class)
        ->names([
            'index' => 'admin.purchases.quotations.index',
            'store' => 'admin.purchases.quotations.store',
            'update' => 'admin.purchases.quotations.update',
            'destroy' => 'admin.purchases.quotations.destroy',
        ])->except(['create', 'edit', 'show']);

    Route::prefix('api/tasks')->name('tasks.')->group(function () {
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

        // Removed legacy SupplierManagement API routes (controller deleted)
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
        Route::get('/journals/{entryCode}', [JournalController::class, 'show']);
        Route::post('/journals', [JournalController::class, 'store']);
        Route::put('/journals/{entryCode}', [JournalController::class, 'update']);
        Route::delete('/journals/{entryCode}', [JournalController::class, 'destroy']);

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

    
    // Purchase Module Routes (trimmed to active controllers)
    Route::prefix('admin/purchases')->middleware('admin')->name('admin.purchases.')->group(function () {
        // Quotations
        Route::post('quotations/{quotation}/convert', [\App\Http\Controllers\Purchases\PurchaseQuotationController::class, 'convertToPo'])->name('quotations.convert');
        Route::resource('quotations', \App\Http\Controllers\Purchases\PurchaseQuotationController::class);

        // Purchase Orders
        Route::resource('orders', \App\Http\Controllers\Purchases\PurchaseOrderController::class)
            ->except(['create', 'edit', 'show']);

        // Purchase Invoices
        Route::resource('invoices', \App\Http\Controllers\Purchases\PurchaseInvoiceController::class)
            ->except(['create', 'edit', 'show']);

        // Suppliers Submodules
        Route::post('suppliers/bulk-import', [\App\Http\Controllers\Purchases\SupplierController::class, 'bulkImport'])->name('suppliers.bulkImport');
        Route::post('suppliers/{supplier}/toggle-favorite', [\App\Http\Controllers\Purchases\SupplierController::class, 'toggleFavorite'])->name('suppliers.toggleFavorite');
        Route::resource('suppliers', \App\Http\Controllers\Purchases\SupplierController::class)
            ->except(['create', 'edit']);

        Route::resource('supplier-groups', \App\Http\Controllers\Purchases\SupplierGroupController::class)
            ->except(['create', 'edit', 'show']);

        // Removed routes for deleted supplier submodules: contacts, addresses, opening-balances, statements.
    });

    Route::prefix('admin/assets')->name('admin.assets.')->group(function () {
        Route::resource('asset-categories', \App\Http\Controllers\Assets\AssetCategoryController::class)
            ->except(['create', 'edit', 'show']);
    });

    Route::prefix('admin/investing-stack')->name('admin.investing-stack.')->group(function () {
        Route::resource('listed-companies', \App\Http\Controllers\InvestingStack\ListedCompanyController::class)
            ->except(['create', 'edit', 'show']);
        Route::resource('sectors', \App\Http\Controllers\InvestingStack\SectorController::class)
            ->except(['create', 'edit', 'show']);
        Route::resource('industries', \App\Http\Controllers\InvestingStack\IndustryController::class)
            ->except(['create', 'edit', 'show']);
    });

    Route::prefix('admin/client-sales')->middleware('admin')->name('admin.client-sales.')->group(function () {
        Route::resource('customer-groups', \App\Http\Controllers\Client_Sales\CustomerGroupController::class)
            ->except(['create', 'edit', 'show']);
        
        Route::resource('quotations', \App\Http\Controllers\Client_Sales\SalesQuotationController::class)
            ->except(['create', 'edit', 'show']);

        Route::resource('orders', \App\Http\Controllers\Client_Sales\SalesOrderController::class)
            ->except(['create', 'edit', 'show']);
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
