<?php

use App\Http\Controllers\Backend\AdminController;
use App\Http\Controllers\Home\CartController;
use App\Http\Controllers\Home\CheckoutController;
use App\Http\Controllers\Home\HomeController;
use App\Http\Controllers\Backend\Profile\ProfileController;
use App\Http\Controllers\Backend\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Backend\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Backend\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Backend\Auth\NewPasswordController;
use App\Http\Controllers\Backend\Auth\PasswordController;
use App\Http\Controllers\Backend\Auth\PasswordResetLinkController;
use App\Http\Controllers\Backend\Auth\VerifyEmailController;
use App\Http\Controllers\Home\Auth\RegisteredUserController;

// Authentication Controllers
use App\Http\Controllers\Backend\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Home\Auth\CustomerAuthController;
use App\Http\Controllers\Suppliers\Auth\SupplierAuthController;

// Accounting Controllers
use App\Http\Controllers\Backend\Accounting\AccountsController;
use App\Http\Controllers\Backend\Accounting\FinancialReportController;
use App\Http\Controllers\Backend\Accounting\JournalController;

// Human Resource Controllers
use App\Http\Controllers\Backend\HumanResource\EmployeeController;
use App\Http\Controllers\Backend\HumanResource\NationalityController;

// Location & Media Controllers
use App\Http\Controllers\Backend\Location\LocationController;
use App\Http\Controllers\Backend\Media\MediaController;

// Purchases & Sales Controllers
use App\Http\Controllers\Backend\Purchases\SupplierController;
use App\Http\Controllers\Backend\Client_Sales\CustomerAddressController;
use App\Http\Controllers\Backend\Client_Sales\CustomerController as ClientSalesCustomerController; // Alias to avoid conflict if needed
use App\Http\Controllers\Backend\Sales\CustomerController; // Check usage, seems to be dashboard controller

// Other Controllers
use App\Http\Controllers\Backend\ECommerce\AdsController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes (مسارات الويب)
|--------------------------------------------------------------------------
|
| تنظيم ملف المسارات ليشمل أقسام واضحة مع تعليقات باللغة العربية
|
*/

// ========================================================================
// 1. Media Files (ملفات الوسائط - بدون توطين)
// ========================================================================
Route::get('/media-files/{path}', function (string $path) {
    $relativePath = ltrim($path, '/');
    $normalized = preg_replace('#^(files|storage|media-files)/#', '', $relativePath);
    
    // Check if it's already a full path from public
    if (Storage::disk('public')->exists($normalized)) {
        return response()->file(Storage::disk('public')->path($normalized));
    }
    
    // Check if it's in media subfolder
    if (Storage::disk('public')->exists('media/' . $normalized)) {
        return response()->file(Storage::disk('public')->path('media/' . $normalized));
    }

    abort(404);
})->where('path', '.*');

// ========================================================================
// 2. Root Redirect (إعادة توجيه الجذر للدولة واللغة الافتراضية)
// ========================================================================
Route::get('/', function () {
    $country = session('country_code', 'sa');
    $lang = session('locale', 'ar');
    return redirect("/$country/$lang");
});

// Redirect helper routes
Route::get('/Auth', fn() => redirect("/".session('country_code', 'sa')."/".session('locale', 'ar')."/Auth"));
Route::get('/auth', fn() => redirect("/".session('country_code', 'sa')."/".session('locale', 'ar')."/Auth"));
Route::get('/login', fn() => redirect("/".session('country_code', 'sa')."/".session('locale', 'ar')."/Auth"));
Route::get('/admin', fn() => redirect("/".session('country_code', 'sa')."/".session('locale', 'ar')."/admin"));

// ========================================================================
// 3. Main Enterprise Routing (التوجيه الرئيسي للمؤسسة)
// ========================================================================
Route::group([
    'prefix' => '{country}/{lang}',
    'where' => [
        'country' => '[a-zA-Z]{2}',
        'lang' => '[a-z]{2}'
    ],
    'middleware' => ['web', \App\Http\Middleware\SetLocalization::class]
], function () {

    // ------------------------------------------------------------------------
    // A. Frontend Routes (المسارات الأمامية - المتجر)
    // ------------------------------------------------------------------------
    Route::get('/', [HomeController::class, 'index'])->name('home');
    Route::get('/products', [HomeController::class, 'products'])->name('products.index');
    Route::get('/product/{identifier}', [HomeController::class, 'productDetails'])->name('product.details');
    Route::get('/suppliers', [HomeController::class, 'suppliers'])->name('suppliers.index');
    
    // Shopping Cart (عربة التسوق)
    Route::get('/cart', [HomeController::class, 'cart'])->name('cart.index');
    Route::get('/cart/mini', [CartController::class, 'mini'])->name('cart.mini');
    Route::post('/cart/add', [CartController::class, 'add'])->name('cart.add');
    Route::post('/cart/remove', [CartController::class, 'remove'])->name('cart.remove');
    Route::post('/cart/update', [CartController::class, 'update'])->name('cart.update');
    
    // Checkout (إتمام الطلب)
    Route::get('/checkout', [HomeController::class, 'checkout'])->name('checkout');
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');
    Route::get('/checkout/success', [CheckoutController::class, 'success'])->name('checkout.success');

    // ------------------------------------------------------------------------
    // B. Authentication & Profile (المصادقة والملف الشخصي)
    // ------------------------------------------------------------------------
    
    Route::middleware('guest')->group(function () {
        Route::get('register', [RegisteredUserController::class, 'create'])
            ->name('register');

        Route::post('register', [RegisteredUserController::class, 'store']);

        Route::get('Auth', [AuthenticatedSessionController::class, 'create'])
            ->name('auth.login');
        Route::get('auth', [AuthenticatedSessionController::class, 'create']);

        Route::post('Auth', [AuthenticatedSessionController::class, 'store']);
        Route::post('auth', [AuthenticatedSessionController::class, 'store']);

        Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
            ->name('password.request');

        Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
            ->name('password.email');

        Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
            ->name('password.reset');

        Route::post('reset-password', [NewPasswordController::class, 'store'])
            ->name('password.store');
    });

    Route::middleware('auth')->group(function () {
        Route::get('verify-email', EmailVerificationPromptController::class)
            ->name('verification.notice');

        Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
            ->middleware(['signed', 'throttle:6,1'])
            ->name('verification.verify');

        Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('verification.send');

        Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
            ->name('password.confirm');

        Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

        Route::put('password', [PasswordController::class, 'update'])->name('password.update');

        Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
            ->name('logout');
    });

    // 2. Global Login Override (تجاوز تسجيل الدخول العام)
    // GET: يوجه لصفحة دخول العملاء
    Route::get('login', [CustomerAuthController::class, 'showLoginForm'])->name('login');
    // POST: يعالج تسجيل الدخول لجميع المستخدمين (أدمن، مورد، عميل)
    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    // Sign In/Up Shortcuts
    Route::get('/sign-in', function () { return Inertia::render('Backend/Auth/SignIn'); })->name('sign-in');
    Route::get('/sign-up', function () { return Inertia::render('Backend/Auth/SignUp'); })->name('sign-up');

    // 3. Profile Management (إدارة الملف الشخصي)
    Route::middleware('auth')->group(function () {
        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });

    // 4. Customer Auth (مصادقة العملاء)
    Route::prefix('customer')->name('customer.')->group(function () {
        Route::middleware('guest:customer')->group(function () {
            Route::get('login', [CustomerAuthController::class, 'showLoginForm'])->name('login');
            Route::post('login', [CustomerAuthController::class, 'login'])->name('authenticate');
            Route::get('register', [CustomerAuthController::class, 'showRegisterForm'])->name('register');
            Route::post('register', [CustomerAuthController::class, 'register'])->name('store');
        });

        Route::middleware('auth:customer,web')->group(function () {
            Route::get('/dashboard', [CustomerController::class, 'index'])->name('dashboard');
            Route::post('logout', [CustomerAuthController::class, 'logout'])->name('logout');
            Route::post('addresses', [CustomerAddressController::class, 'store'])->name('addresses.store');
            Route::put('addresses/{address}', [CustomerAddressController::class, 'update'])->name('addresses.update');
            Route::delete('addresses/{address}', [CustomerAddressController::class, 'destroy'])->name('addresses.destroy');
        });
    });

    // 5. Supplier Auth (مصادقة الموردين)
    Route::prefix('supplier')->name('supplier.')->group(function () {
       Route::middleware('guest:supplier')->group(function () {
           Route::get('register', [SupplierAuthController::class, 'showRegisterForm'])->name('register');
           Route::post('register', [SupplierAuthController::class, 'register'])->name('store');
           Route::get('login', [SupplierAuthController::class, 'showLoginForm'])->name('login');
           Route::post('login', [SupplierAuthController::class, 'login'])->name('authenticate');
       });

       Route::middleware('auth:supplier')->group(function () {
           Route::get('dashboard', [SupplierController::class, 'dashboard'])->name('dashboard');
           Route::post('logout', [SupplierAuthController::class, 'logout'])->name('logout');
       });
    });

    // ------------------------------------------------------------------------
    // C. Admin & Backend Routes (مسارات لوحة التحكم والإدارة)
    // ------------------------------------------------------------------------
    Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
        
        // Dashboard (لوحة التحكم الرئيسية)
        Route::get('/', [AdminController::class, 'index'])->name('dashboard');

        // 1. Media Management (إدارة الوسائط)
        Route::prefix('media')->name('media.')->group(function () {
            Route::get('/{tab?}', [MediaController::class, 'index'])->where('tab', 'images|videos|documents')->name('index');
            Route::post('/store', [MediaController::class, 'store'])->name('store');
            Route::post('/folder', [MediaController::class, 'storeFolder'])->name('folder.store');
            Route::post('/destroy', [MediaController::class, 'destroy'])->name('destroy');
            Route::post('/rename', [MediaController::class, 'rename'])->name('rename');
            Route::post('/move', [MediaController::class, 'move'])->name('move');
        });

        // 2. Essential Data (البيانات الأساسية)
        Route::resource('currencies', \App\Http\Controllers\Backend\Essential_Data_Controllers\CurrencyController::class);
        Route::post('exchange-rates/fetch', [\App\Http\Controllers\Backend\Essential_Data_Controllers\ExchangeRateController::class, 'fetchRates'])->name('exchange-rates.fetch');
        Route::resource('exchange-rates', \App\Http\Controllers\Backend\Essential_Data_Controllers\ExchangeRateController::class);
        Route::resource('companies', \App\Http\Controllers\Backend\Essential_Data_Controllers\CompanyController::class);
        Route::resource('branches', \App\Http\Controllers\Backend\Essential_Data_Controllers\BranchController::class);

        // 3. Human Resources (الموارد البشرية)
        Route::get('hr/dashboard', function () { return Inertia::render('Backend/02_human_resource/dashboard'); })->name('hr.dashboard');
        Route::resource('employees', \App\Http\Controllers\Backend\HumanResource\EmployeeController::class);
        Route::resource('nationalities', \App\Http\Controllers\Backend\HumanResource\NationalityController::class);
        Route::get('departments', function () { return Inertia::render('Backend/02_human_resource/Departments'); })->name('departments.index');
        Route::get('profession', function () { return Inertia::render('Backend/02_human_resource/Profession'); })->name('profession.index');
        Route::get('attendance', function () { return Inertia::render('Backend/02_human_resource/Attendance'); })->name('attendance.index');
        Route::get('payroll-advance', function () { return Inertia::render('Backend/02_human_resource/Payroll-Advance'); })->name('payroll-advance.index');
        Route::get('deductions', function () { return Inertia::render('Backend/02_human_resource/Deductions'); })->name('deductions.index');
        Route::get('vacations', function () { return Inertia::render('Backend/02_human_resource/Vacations'); })->name('vacations.index');
        Route::get('reward', function () { return Inertia::render('Backend/02_human_resource/Reward'); })->name('reward.index');
        Route::get('overtime', function () { return Inertia::render('Backend/02_human_resource/OverTime'); })->name('overtime.index');
        Route::get('end-of-service', function () { return Inertia::render('Backend/02_human_resource/End-of-service'); })->name('end-of-service.index');
        Route::get('salary-receipt', function () { return Inertia::render('Backend/02_human_resource/Salary-Receipt'); })->name('salary-receipt.index');
        Route::get('permissions', function () { return Inertia::render('Backend/02_human_resource/Permissions'); })->name('permissions.index');
        Route::get('traffic-violations', function () { return Inertia::render('Backend/02_human_resource/Traffic-Violations'); })->name('traffic-violations.index');

        // 4. Assets (الأصول الثابتة)
        Route::prefix('assets')->name('assets.')->group(function () {
             Route::resource('categories', \App\Http\Controllers\Backend\Assets\AssetCategoryController::class);
             Route::resource('attributes', \App\Http\Controllers\Backend\Assets\AssetAttributeController::class);
             Route::resource('register', \App\Http\Controllers\Backend\Assets\AssetController::class);
             Route::get('movements', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Asset Movements']); })->name('movements.index');
             Route::get('revaluation', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Asset Revaluation']); })->name('revaluation.index');
             Route::get('disposal', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Asset Disposal']); })->name('disposal.index');
             Route::get('depreciation/run', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Run Depreciation']); })->name('depreciation.run');
             Route::get('depreciation/schedule', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Depreciation Schedule']); })->name('depreciation.schedule');
             Route::get('depreciation/report', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Depreciation Report']); })->name('depreciation.report');
        });

        // 5. Purchases (المشتريات)
        Route::prefix('purchases')->name('purchases.')->group(function () {
             Route::get('dashboard', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Dashboard']); })->name('dashboard');
             Route::resource('supplier-groups', \App\Http\Controllers\Backend\Purchases\SupplierGroupController::class);
             Route::resource('suppliers', \App\Http\Controllers\Backend\Purchases\SupplierController::class);
             Route::resource('quotations', \App\Http\Controllers\Backend\Purchases\PurchaseQuotationController::class);
             Route::resource('orders', \App\Http\Controllers\Backend\Purchases\PurchaseOrderController::class);
             Route::get('goods-receipts', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Goods Receipts']); })->name('goods-receipts.index');
             Route::resource('invoices', \App\Http\Controllers\Backend\Purchases\PurchaseInvoiceController::class);
             Route::get('returns', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Returns']); })->name('returns.index');
             
             // Discounts & Taxes
             Route::get('discounts', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Discounts']); })->name('discounts.index');
             Route::get('discounts/rules', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Discount Rules']); })->name('discounts.rules');
             Route::get('taxes', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Management']); })->name('taxes.index');
             Route::get('taxes/calculations', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Calculations']); })->name('taxes.calculations');
             
             // Costing
             Route::get('costing', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Costing']); })->name('costing.index');
             Route::get('expenses', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Expense Management']); })->name('expenses.index');
             Route::get('landed-costs', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Landed Costs']); })->name('landed-costs.index');
             Route::get('cost-allocation', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Cost Allocation']); })->name('cost-allocation.index');
        });

        // 6. Client & Sales (العملاء والمبيعات)
        Route::prefix('client-sales')->name('client-sales.')->group(function () {
            Route::resource('customer-groups', \App\Http\Controllers\Backend\Client_Sales\CustomerGroupController::class);
            Route::post('customers/bulk-store', [\App\Http\Controllers\Backend\Client_Sales\CustomerController::class, 'bulkStore'])->name('customers.bulk-store');
            Route::resource('customers', \App\Http\Controllers\Backend\Client_Sales\CustomerController::class);
            Route::resource('quotations', \App\Http\Controllers\Backend\Client_Sales\SalesQuotationController::class);
            Route::resource('orders', \App\Http\Controllers\Backend\Client_Sales\SalesOrderController::class);
            Route::resource('invoices', \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController::class);
            Route::get('flash-sales/search-products', [\App\Http\Controllers\Backend\Client_Sales\FlashSaleController::class, 'searchProducts'])->name('flash-sales.search-products');
            Route::resource('flash-sales', \App\Http\Controllers\Backend\Client_Sales\FlashSaleController::class);
        });

        // 7. Inventory (المخزون)
        Route::resource('products', \App\Http\Controllers\Backend\Inventory\ProductsController::class);
        Route::resource('categories', \App\Http\Controllers\Backend\Inventory\CategoriesController::class);
        Route::resource('brands', \App\Http\Controllers\Backend\Inventory\BrandsController::class);
        Route::resource('warehouses', \App\Http\Controllers\Backend\Inventory\WarehousesController::class);
        Route::resource('item-units', \App\Http\Controllers\Backend\Inventory\ItemUnitController::class);
        Route::resource('item-attributes', \App\Http\Controllers\Backend\Inventory\ItemAttributeController::class);
        Route::get('product-collections/get-products', [\App\Http\Controllers\Backend\Inventory\ProductCollectionController::class, 'getProducts'])->name('product-collections.get-products');
        Route::resource('product-collections', \App\Http\Controllers\Backend\Inventory\ProductCollectionController::class);
        
        Route::prefix('inventory')->name('inventory.')->group(function () {
             Route::get('stock-transfers', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Stock Transfers']); })->name('stock-transfers.index');
             Route::get('stock-adjustments', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Stock Adjustments']); })->name('stock-adjustments.index');
             Route::get('reports', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Inventory Reports']); })->name('reports.index');
        });

        // 8. Accounting & Business (المحاسبة)
        Route::get('chart-of-accounts', function () { return Inertia::render('Backend/07-Accounting/ChartOfAccounts'); })->name('chart-of-accounts');
        Route::get('journal-entries', function () { return Inertia::render('Backend/07-Accounting/JournalEntity'); })->name('journal-entries');
        Route::get('financial-reports', [FinancialReportController::class, 'index'])->name('financial-reports.index');
        Route::get('financial-reports/coa', [FinancialReportController::class, 'coaReport'])->name('financial-reports.coa');

        // 9. Cash & Banks (النقدية والبنوك)
        Route::resource('banks', \App\Http\Controllers\Backend\Cash\BankController::class);
        Route::prefix('banks')->name('banks.')->group(function () {
             Route::get('{bank}/accounts', [\App\Http\Controllers\Backend\Cash\BankController::class, 'getAccounts'])->name('accounts.index');
             Route::post('accounts', [\App\Http\Controllers\Backend\Cash\BankController::class, 'storeAccount'])->name('accounts.store');
             Route::put('accounts/{bankAccount}', [\App\Http\Controllers\Backend\Cash\BankController::class, 'updateAccount'])->name('accounts.update');
             Route::delete('accounts/{bankAccount}', [\App\Http\Controllers\Backend\Cash\BankController::class, 'destroyAccount'])->name('accounts.destroy');
        });
        Route::resource('petty-cash', \App\Http\Controllers\Backend\Cash\PettyCashController::class);
        Route::resource('cheques', \App\Http\Controllers\Backend\Cash\ChequeController::class);
        Route::resource('bank-transactions', \App\Http\Controllers\Backend\Cash\BankTransactionController::class)->only(['index', 'store', 'update', 'destroy']);

        // 10. Investing (الاستثمار)
        Route::prefix('investing')->name('investing.')->group(function () {
             Route::resource('industries', \App\Http\Controllers\Backend\InvestingStack\IndustryController::class);
             Route::resource('companies', \App\Http\Controllers\Backend\InvestingStack\ListedCompanyController::class);
             Route::resource('brokers', \App\Http\Controllers\Backend\InvestingStack\BrokerController::class);
             Route::resource('prices', \App\Http\Controllers\Backend\InvestingStack\MarketPriceController::class);
        });

        // 11. Budgeting (الموازنة)
        Route::prefix('budgeting')->name('budgeting.')->group(function () {
             Route::get('budgets', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Budgets']); })->name('budgets.index');
             Route::get('reports', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Budget Reports']); })->name('reports.index');
        });

        Route::prefix('budget')->name('budget.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'dashboard'])->name('dashboard');
            Route::get('/categories', [\App\Http\Controllers\Backend\Budget\BudgetCategoryController::class, 'index'])->name('categories');
            Route::get('/list', [\App\Http\Controllers\Backend\Budget\BudgetController::class, 'index'])->name('index');
            Route::get('/forecasts', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'index'])->name('forecasts');
            Route::get('/monitoring', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'index'])->name('monitoring');
            Route::get('/transfers', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'index'])->name('transfers');
            Route::get('/commitments', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'index'])->name('commitments');
        });

        // 12. Taxes (الضرائب)
        Route::prefix('taxes')->name('taxes.')->group(function () {
             Route::resource('types', \App\Http\Controllers\Backend\Taxes\TaxTypeController::class);
             Route::get('settings', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Settings']); })->name('settings.index');
             Route::get('reports', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Reports']); })->name('reports.index');
        });

        // 13. E-Commerce (التجارة الإلكترونية)
        Route::prefix('ecommerce')->name('ecommerce.')->group(function () {
             Route::post('ads/bulk-delete', [\App\Http\Controllers\Backend\ECommerce\AdsController::class, 'bulkDelete'])->name('ads.bulk-delete');
             Route::post('ads/bulk-status', [\App\Http\Controllers\Backend\ECommerce\AdsController::class, 'bulkStatus'])->name('ads.bulk-status');
             Route::resource('ads', \App\Http\Controllers\Backend\ECommerce\AdsController::class);
             Route::get('financial-reports', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'E-Commerce Financial Reports']); })->name('financial-reports.index');
        });

        // 14. Locations (المواقع الجغرافية)
        Route::prefix('location')->name('location.')->group(function () {
            Route::get('/', [LocationController::class, 'index'])->name('index');
            Route::post('/countries', [LocationController::class, 'storeCountry']);
            Route::post('/cities', [LocationController::class, 'storeCity']);
            Route::post('/areas', [LocationController::class, 'storeArea']);
        });

        // 15. Settings (الإعدادات)
        Route::get('settings', function () { return Inertia::render('Backend/Settings/Settings'); })->name('settings');
        
        Route::prefix('settings/locales')->name('settings.locales.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Backend\LanguageController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\Backend\LanguageController::class, 'store'])->name('store');
            Route::put('/{id}', [\App\Http\Controllers\Backend\LanguageController::class, 'update'])->name('update');
            Route::delete('/{id}', [\App\Http\Controllers\Backend\LanguageController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/default', [\App\Http\Controllers\Backend\LanguageController::class, 'setDefault'])->name('set-default');
        });
        
        Route::prefix('settings/theme-translations')->name('settings.theme-translations.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Backend\ThemeTranslationController::class, 'index'])->name('index');
            Route::post('/sync', [\App\Http\Controllers\Backend\ThemeTranslationController::class, 'sync'])->name('sync');
            Route::put('/{languageLine}', [\App\Http\Controllers\Backend\ThemeTranslationController::class, 'update'])->name('update');
        });
        
        Route::prefix('settings/other-translations')->name('settings.other-translations.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Backend\LanguageLineController::class, 'index'])->name('index');
            Route::post('/sync', [\App\Http\Controllers\Backend\LanguageLineController::class, 'sync'])->name('sync');
            Route::put('/{languageLine}', [\App\Http\Controllers\Backend\LanguageLineController::class, 'update'])->name('update');
        });

        // 16. Tasks (المهام)
        Route::resource('tasks', \App\Http\Controllers\Backend\Tasks\TaskController::class);

        // 17. CMS / Pages (إدارة المحتوى)
        Route::prefix('pages')->name('pages.')->group(function () {
             Route::get('blog', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Blog']); })->name('blog.index');
             Route::get('payments', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Payments']); })->name('payments.index');
             Route::get('ads', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Ads Page']); })->name('ads.index');
             Route::get('contact', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Contact']); })->name('contact.index');
             Route::get('sliders', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Simple Sliders']); })->name('sliders.index');
             Route::get('faqs', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'FAQs']); })->name('faqs.index');
             Route::get('newsletters', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Newsletters']); })->name('newsletters.index');
             Route::get('appearance', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Appearance']); })->name('appearance.index');
             Route::get('plugins', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Plugins']); })->name('plugins.index');
             Route::get('tools', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Tools']); })->name('tools.index');
             Route::get('whatsapp', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'WhatsApp Floating Button']); })->name('whatsapp.index');
        });

        Route::get('platform-admin', function () { return Inertia::render('Backend/ComingSoon', ['title' => 'Platform Administration']); })->name('platform-admin.index');
    });

    // ------------------------------------------------------------------------
    // D. API & Search (واجهة برمجة التطبيقات والبحث)
    // ------------------------------------------------------------------------
    Route::prefix('api')->name('api.')->group(function () {
        Route::get('/search', [HomeController::class, 'globalSearch'])->name('search');
        Route::get('/countries', [LocationController::class, 'getCountries']);
        Route::get('/cities', [LocationController::class, 'getCities']);
    });

});
