<?php

use App\Http\Controllers\Backend\Accounting\FinancialReportController;
use App\Http\Controllers\Backend\AdminController;
use App\Http\Controllers\Backend\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Backend\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Backend\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Backend\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Backend\Auth\NewPasswordController;
use App\Http\Controllers\Backend\Auth\PasswordController;
use App\Http\Controllers\Backend\Auth\PasswordResetLinkController;
use App\Http\Controllers\Backend\Auth\VerifyEmailController;
use App\Http\Controllers\Backend\Client_Sales\CustomerAddressController;
use App\Http\Controllers\Backend\Location\LocationController;
use App\Http\Controllers\Backend\Media\MediaController;
use App\Http\Controllers\Backend\Profile\ProfileController;
// Authentication Controllers
use App\Http\Controllers\Backend\Purchases\SupplierController;
use App\Http\Controllers\Backend\Sales\CustomerController;
use App\Http\Controllers\Home\Auth\CustomerAuthController;
// Accounting Controllers
use App\Http\Controllers\Home\Auth\RegisteredUserController;
// Human Resource Controllers

// Location & Media Controllers
use App\Http\Controllers\Home\CartController;
use App\Http\Controllers\Home\CheckoutController;
// Purchases & Sales Controllers
use App\Http\Controllers\Home\CompanyRegisterController;
use App\Http\Controllers\Home\HomeController;
use App\Http\Controllers\Home\CareerController;
// Alias to avoid conflict if needed
use App\Http\Controllers\Suppliers\Auth\SupplierAuthController; // Check usage, seems to be dashboard controller
// Other Controllers
use App\Models\Employee;
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
// 0. Development/Boost Logger (Fix for ERR_ABORTED)
// ========================================================================
Route::any('/_boost/browser-logs', function () {
    return response()->json([], 200);
});

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
    if (Storage::disk('public')->exists('media/'.$normalized)) {
        return response()->file(Storage::disk('public')->path('media/'.$normalized));
    }

    abort(404);
})->where('path', '.*');

// ========================================================================
// 2. Root Home (Static Home page)
// ========================================================================
Route::get('/', function () {
    return redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')));
});

Route::get('/Home', function () {
    return redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')));
});

// Redirect helper routes
Route::get('/Auth', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/Auth'));
Route::get('/auth', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/Auth'));
Route::get('/login', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/Auth'));
Route::get('/dashboard', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/dashboard'));
Route::get('/logout', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/logout'));
Route::get('/register', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/register'));
Route::get('/admin', fn () => redirect('/'.session('country_code', 'sa').'/'.session('locale', config('app.locale', 'en')).'/admin'));

// ========================================================================
// 3. Main Enterprise Routing (التوجيه الرئيسي للمؤسسة)
// ========================================================================
Route::group([
    'prefix' => '{country}/{lang}',
    'where' => [
        'country' => '[a-zA-Z]{2,3}',
        'lang' => '[a-z]{2}',
    ],
    'middleware' => ['web', \App\Http\Middleware\SetLocalization::class],
], function () {

    // ------------------------------------------------------------------------
    // A. Frontend Routes (المسارات الأمامية - المتجر)
    // ------------------------------------------------------------------------
    Route::get('/', [HomeController::class, 'index'])->name('home');
    Route::get('/products', [HomeController::class, 'products'])->name('products.index');
    Route::get('/product/{identifier}', [HomeController::class, 'productDetails'])->name('product.details');
    Route::get('/suppliers', [HomeController::class, 'suppliers'])->name('suppliers.index');

    // Career Routes (مسارات الوظائف)
    Route::get('/career', [CareerController::class, 'index'])->name('career.index');
    Route::get('/career/{id}', [CareerController::class, 'show'])->name('career.show');
    Route::post('/career/apply', [CareerController::class, 'apply'])->name('career.apply');

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

        Route::post('Auth', [AuthenticatedSessionController::class, 'store'])
            ->name('auth.login.store');
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

    Route::get('logout', function (\Illuminate\Http\Request $request) {
        $params = [
            'country' => $request->segment(1) ?? session('country_code', 'sa'),
            'lang' => $request->segment(2) ?? session('locale', config('app.locale', 'en')),
        ];

        \Illuminate\Support\Facades\Auth::guard('web')->logout();
        \Illuminate\Support\Facades\Auth::guard('customer')->logout();
        \Illuminate\Support\Facades\Auth::guard('supplier')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home', $params);
    });

    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store'])->name('login.store');

    // Sign In/Up Shortcuts
    Route::get('/sign-in', function () {
        return Inertia::render('Backend/Auth/SignIn');
    })->name('sign-in');
    Route::get('/sign-up', function () {
        return Inertia::render('Backend/Auth/SignUp');
    })->name('sign-up');

    // 3. Profile Management (إدارة الملف الشخصي)
    Route::middleware('auth')->group(function () {
        Route::get('company/register', [CompanyRegisterController::class, 'create'])->name('company.register');
        Route::post('company/register', [CompanyRegisterController::class, 'store'])->name('company.register.store');

        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });

    Route::middleware('auth:web,employee')->get('dashboard', function () {
        return Inertia::render('Backend/Interface');
    })->name('dashboard');

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

            // Products CRUD
            Route::get('products', [SupplierController::class, 'products'])->name('products');
            Route::get('products/create', [SupplierController::class, 'createProduct'])->name('products.create');
            Route::post('products', [SupplierController::class, 'storeProduct'])->name('products.store');
            Route::get('products/{product}/edit', [SupplierController::class, 'editProduct'])->name('products.edit');
            Route::post('products/{product}', [SupplierController::class, 'updateProduct'])->name('products.update'); // Using POST for file uploads with method spoofing if needed, or PUT
            Route::delete('products/{product}', [SupplierController::class, 'destroyProduct'])->name('products.destroy');

            Route::get('orders', [SupplierController::class, 'orders'])->name('orders');
            Route::get('earnings', [SupplierController::class, 'earnings'])->name('earnings');
            Route::get('reviews', [SupplierController::class, 'reviews'])->name('reviews');
            Route::get('profile', [SupplierController::class, 'profile'])->name('profile');
            Route::post('logout', [SupplierAuthController::class, 'logout'])->name('logout');
        });
    });

    // ------------------------------------------------------------------------
    // C. Admin & Backend Routes (مسارات لوحة التحكم والإدارة)
    // ------------------------------------------------------------------------
    Route::middleware(['auth:web,employee', 'admin'])->prefix('admin')->name('admin.')->group(function () {

        // Dashboard (لوحة التحكم الرئيسية)
        Route::get('', [AdminController::class, 'index'])->name('dashboard');
        Route::get('system-dashboard', [AdminController::class, 'dashboard'])->name('system.dashboard');

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
        Route::get('hr/dashboard', function () {
            return Inertia::render('Backend/02_human_resource/dashboard');
        })->name('hr.dashboard');
        Route::resource('employees', \App\Http\Controllers\Backend\HumanResource\EmployeeController::class);
        Route::resource('nationalities', \App\Http\Controllers\Backend\HumanResource\NationalityController::class);
        Route::resource('departments', \App\Http\Controllers\Backend\HumanResource\DepartmentController::class);
        Route::resource('professions', \App\Http\Controllers\Backend\HumanResource\ProfessionController::class);

        // Careers and Applications
        Route::resource('careers', \App\Http\Controllers\Backend\HumanResource\CareerController::class);
        Route::get('career-applications', [\App\Http\Controllers\Backend\HumanResource\CareerController::class, 'applications'])->name('careers.applications');
        Route::put('career-applications/{application}', [\App\Http\Controllers\Backend\HumanResource\CareerController::class, 'updateApplicationStatus'])->name('careers.applications.update');
        Route::delete('career-applications/{application}', [\App\Http\Controllers\Backend\HumanResource\CareerController::class, 'destroyApplication'])->name('careers.applications.destroy');

        Route::get('attendance', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/Attendance', [
                'employees' => $employees
            ]);
        })->name('attendance.index');
        Route::get('payroll-advance', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/Payroll-Advance', [
                'employees' => $employees
            ]);
        })->name('payroll-advance.index');
        Route::get('deductions', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/Deductions', [
                'employees' => $employees
            ]);
        })->name('deductions.index');
        Route::get('vacations', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/Vacations', [
                'employees' => $employees
            ]);
        })->name('vacations.index');
        Route::resource('rewards', \App\Http\Controllers\Backend\HumanResource\RewardController::class);
        Route::get('end-of-service', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/End-of-service', [
                'employees' => $employees
            ]);
        })->name('end-of-service.index');
        Route::get('salary-receipt', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/Salary-Receipt', [
                'employees' => $employees
            ]);
        })->name('salary-receipt.index');
        Route::get('traffic-violations', function () {
            $employees = Employee::select('id', 'name', 'position', 'department')->get();
            return Inertia::render('Backend/02_human_resource/Traffic-Violations', [
                'employees' => $employees
            ]);
        })->name('traffic-violations.index');

        // 4. Assets (الأصول الثابتة)
        Route::prefix('assets')->name('assets.')->group(function () {
            Route::resource('categories', \App\Http\Controllers\Backend\Assets\AssetCategoryController::class);
            Route::resource('asset-attributes', \App\Http\Controllers\Backend\Assets\AssetAttributeController::class);
            Route::resource('register', \App\Http\Controllers\Backend\Assets\AssetController::class);
            Route::get('movements', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Asset Movements']);
            })->name('movements.index');
            Route::get('revaluation', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Asset Revaluation']);
            })->name('revaluation.index');
            Route::get('disposal', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Asset Disposal']);
            })->name('disposal.index');
            Route::get('depreciation/run', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Run Depreciation']);
            })->name('depreciation.run');
            Route::get('depreciation/schedule', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Depreciation Schedule']);
            })->name('depreciation.schedule');
            Route::get('depreciation/report', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Depreciation Report']);
            })->name('depreciation.report');
        });

        // 5. Purchases (المشتريات)
        Route::prefix('purchases')->name('purchases.')->group(function () {
            Route::get('dashboard', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Dashboard']);
            })->name('dashboard');
            Route::resource('supplier-groups', \App\Http\Controllers\Backend\Purchases\SupplierGroupController::class);
            Route::post('suppliers/bulk-import', [\App\Http\Controllers\Backend\Purchases\SupplierController::class, 'bulkImport'])->name('suppliers.bulkImport');
            Route::post('suppliers/{supplier}/toggle-favorite', [\App\Http\Controllers\Backend\Purchases\SupplierController::class, 'toggleFavorite'])->name('suppliers.toggleFavorite');
            Route::resource('suppliers', \App\Http\Controllers\Backend\Purchases\SupplierController::class);
            Route::resource('quotations', \App\Http\Controllers\Backend\Purchases\PurchaseQuotationController::class);
            Route::resource('orders', \App\Http\Controllers\Backend\Purchases\PurchaseOrderController::class);
            Route::get('goods-receipts', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Goods Receipts']);
            })->name('goods-receipts.index');
            Route::resource('invoices', \App\Http\Controllers\Backend\Purchases\PurchaseInvoiceController::class);
            Route::get('returns', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Returns']);
            })->name('returns.index');

            // Discounts & Taxes
            Route::get('discounts', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Discounts']);
            })->name('discounts.index');
            Route::get('discounts/rules', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Discount Rules']);
            })->name('discounts.rules');
            Route::get('taxes', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Management']);
            })->name('taxes.index');
            Route::get('taxes/calculations', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Calculations']);
            })->name('taxes.calculations');

            // Costing
            Route::get('costing', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Purchase Costing']);
            })->name('costing.index');
            Route::get('expenses', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Expense Management']);
            })->name('expenses.index');
            Route::get('landed-costs', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Landed Costs']);
            })->name('landed-costs.index');
            Route::get('cost-allocation', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Cost Allocation']);
            })->name('cost-allocation.index');
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

        Route::prefix('inventory')->name('inventory.')->group(function () {
            Route::get('products/export', [\App\Http\Controllers\Backend\Inventory\ProductsController::class, 'export'])->name('products.export');
            Route::get('opening-stock', [\App\Http\Controllers\Backend\Inventory\OpeningStockController::class, 'index'])->name('opening-stock.index');
            Route::post('opening-stock', [\App\Http\Controllers\Backend\Inventory\OpeningStockController::class, 'store'])->name('opening-stock.store');
            Route::get('opening-stock/{openingStock}', [\App\Http\Controllers\Backend\Inventory\OpeningStockController::class, 'show'])->name('opening-stock.show');
            Route::delete('opening-stock/{openingStock}', [\App\Http\Controllers\Backend\Inventory\OpeningStockController::class, 'destroy'])->name('opening-stock.destroy');
            Route::post('products/bulk-import', [\App\Http\Controllers\Backend\Inventory\ProductsController::class, 'bulkImport'])->name('products.bulkImport');
            Route::resource('products', \App\Http\Controllers\Backend\Inventory\ProductsController::class);
            Route::get('categories/export', [\App\Http\Controllers\Backend\Inventory\CategoriesController::class, 'export'])->name('categories.export');
            Route::post('categories/import', [\App\Http\Controllers\Backend\Inventory\CategoriesController::class, 'import'])->name('categories.import');
            Route::post('categories/bulk-import', [\App\Http\Controllers\Backend\Inventory\CategoriesController::class, 'bulkImport'])->name('categories.bulkImport');
            Route::resource('categories', \App\Http\Controllers\Backend\Inventory\CategoriesController::class);
            Route::resource('brands', \App\Http\Controllers\Backend\Inventory\BrandsController::class);
            Route::resource('warehouses', \App\Http\Controllers\Backend\Inventory\WarehousesController::class);
            Route::post('item-units/bulk-import', [\App\Http\Controllers\Backend\Inventory\ItemUnitController::class, 'bulkImport'])->name('item-units.bulkImport');
            Route::resource('item-units', \App\Http\Controllers\Backend\Inventory\ItemUnitController::class);
            Route::resource('item-attributes', \App\Http\Controllers\Backend\Inventory\ItemAttributeController::class);
            Route::get('product-collections/get-products', [\App\Http\Controllers\Backend\Inventory\ProductCollectionController::class, 'getProducts'])->name('product-collections.get-products');
            Route::resource('product-collections', \App\Http\Controllers\Backend\Inventory\ProductCollectionController::class);

            Route::resource('stock-transfers', \App\Http\Controllers\Backend\Inventory\StockTransferController::class);

            Route::get('stock-adjustments', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Stock Adjustments']);
            })->name('stock-adjustments.index');
            Route::get('reports', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Inventory Reports']);
            })->name('reports.index');
        });

        // 8. Accounting & Business (المحاسبة)
        Route::prefix('accounts')->name('accounts.')->group(function () {
            Route::post('bulk-import', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'bulkImport'])->name('bulkImport');
        });
        Route::get('chart-of-accounts', function () {
            return Inertia::render('Backend/07-Accounting/ChartOfAccounts');
        })->name('chart-of-accounts');
        Route::get('journal-entries', function () {
            return Inertia::render('Backend/07-Accounting/JournalEntity');
        })->name('journal-entries');
        Route::get('financial-reports', [FinancialReportController::class, 'index'])->name('financial-reports.index');
        Route::get('financial-reports/coa', [FinancialReportController::class, 'coaReport'])->name('financial-reports.coa');
        Route::get('financial-reports/general-ledger', [FinancialReportController::class, 'generalLedger'])->name('financial-reports.general-ledger');
        Route::get('financial-reports/trial-balance', [FinancialReportController::class, 'trialBalance'])->name('financial-reports.trial-balance');
        Route::get('financial-reports/journal', [FinancialReportController::class, 'journalReport'])->name('financial-reports.journal');
        Route::get('financial-reports/balance-sheet', [FinancialReportController::class, 'balanceSheet'])->name('financial-reports.balance-sheet');
        Route::get('financial-reports/balance-sheet-comparison', [FinancialReportController::class, 'balanceSheetComparison'])->name('financial-reports.balance-sheet-comparison');
        Route::get('financial-reports/balance-sheet-detail', [FinancialReportController::class, 'balanceSheetDetail'])->name('financial-reports.balance-sheet-detail');
        Route::get('financial-reports/profit-loss', [FinancialReportController::class, 'profitLoss'])->name('financial-reports.profit-loss');
        Route::get('financial-reports/profit-loss-class', [FinancialReportController::class, 'profitLossByClass'])->name('financial-reports.profit-loss-class');
        Route::get('financial-reports/profit-loss-customer', [FinancialReportController::class, 'profitLossByCustomer'])->name('financial-reports.profit-loss-customer');
        Route::get('financial-reports/profit-loss-month', [FinancialReportController::class, 'profitLossByMonth'])->name('financial-reports.profit-loss-month');
        Route::get('financial-reports/profit-loss-comparison', [FinancialReportController::class, 'profitLossComparison'])->name('financial-reports.profit-loss-comparison');
        Route::get('financial-reports/profit-loss-detail', [FinancialReportController::class, 'profitLossDetail'])->name('financial-reports.profit-loss-detail');
        Route::get('financial-reports/inventory-valuation-summary', [FinancialReportController::class, 'inventoryValuationSummary'])->name('financial-reports.inventory-valuation-summary');
        Route::get('financial-reports/inventory-valuation-summary/export', [FinancialReportController::class, 'exportInventoryValuationSummary'])->name('financial-reports.inventory-valuation-summary.export');
        Route::get('financial-reports/cash-flow', [FinancialReportController::class, 'cashFlow'])->name('financial-reports.cash-flow');

        // 9. Cash & Banks (النقدية والبنوك)
        Route::get('treasury/dashboard', [\App\Http\Controllers\Backend\Cash\TreasuryDashboardController::class, 'index'])
            ->name('treasury.dashboard');
        Route::get('treasury/account/transactions', [\App\Http\Controllers\Backend\Cash\TreasuryDashboardController::class, 'accountTransactions'])
            ->name('treasury.account.transactions');
        Route::resource('banks', \App\Http\Controllers\Backend\Cash\BankController::class);
        Route::prefix('banks')->name('banks.')->group(function () {
            Route::get('{bank}/accounts', [\App\Http\Controllers\Backend\Cash\BankController::class, 'getAccounts'])->name('accounts.index');
            Route::post('accounts', [\App\Http\Controllers\Backend\Cash\BankController::class, 'storeAccount'])->name('accounts.store');
            Route::put('accounts/{bankAccount}', [\App\Http\Controllers\Backend\Cash\BankController::class, 'updateAccount'])->name('accounts.update');
            Route::delete('accounts/{bankAccount}', [\App\Http\Controllers\Backend\Cash\BankController::class, 'destroyAccount'])->name('accounts.destroy');
        });

        Route::resource('cheques', \App\Http\Controllers\Backend\Cash\ChequeController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::prefix('bank-transactions')->name('bank-transactions.')->controller(\App\Http\Controllers\Backend\Cash\BankTransactionController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{type}/{transaction}', 'update')->whereIn('type', ['payment', 'receipt', 'transfer'])->name('update');
            Route::delete('{type}/{transaction}', 'destroy')->whereIn('type', ['payment', 'receipt', 'transfer'])->name('destroy');
        });
        Route::get('payment-vouchers', function (\Illuminate\Http\Request $request) {
            $search = trim((string) $request->input('search', ''));
            $status = trim((string) $request->input('status', ''));
            $supplierId = $request->input('supplier_id');
            $perPage = max(5, min(100, (int) $request->input('per_page', 10)));

            $vouchersQuery = \App\Models\Vendor_Purchases\SupplierPayment::query()
                ->with([
                    'supplier:id,name_ar',
                    'currency:id,code,name',
                    'allocations.invoice:id,invoice_number,invoice_date',
                ])
                ->latest('id');

            if ($search !== '') {
                $vouchersQuery->where(function ($query) use ($search) {
                    $query->where('payment_number', 'like', "%{$search}%")
                        ->orWhere('reference_number', 'like', "%{$search}%");
                });
            }

            if ($status !== '') {
                $vouchersQuery->where('status', $status);
            }

            if (!empty($supplierId)) {
                $vouchersQuery->where('supplier_id', $supplierId);
            }

            $vouchers = $vouchersQuery->paginate($perPage)->withQueryString();

            $suppliers = \App\Models\Vendor_Purchases\Supplier::query()
                ->select('id', 'name_ar', 'is_active')
                ->where('is_active', true)
                ->orderBy('name_ar')
                ->get();

            $currencies = \App\Models\Currency::query()
                ->select('id', 'code', 'name', 'status')
                ->orderBy('code')
                ->get();

            $bankAccounts = \App\Models\BankAccount::query()
                ->with('glAccount')
                ->whereHas('glAccount', function ($query) {
                    $query->where(function ($q) {
                        $q->where('Nature', 'bank')
                          ->orWhere('Nature', 'cash');
                    })
                    ->where('AccType', 1);
                })
                ->where('status', 'active')
                ->get();

            $cashAccounts = \App\Models\CashAccount::query()
                ->with('glAccount')
                ->whereHas('glAccount', function ($query) {
                    $query->where(function ($q) {
                        $q->where('Nature', 'cash');
                    })
                    ->where('AccType', 1);
                })
                ->where('status', 'active')
                ->get();

            $combinedAccounts = $bankAccounts->map(function ($account) {
                return [
                    'id' => $account->id,
                    'account_name' => $account->account_name,
                    'account_number' => $account->account_number,
                    'currency' => $account->currency,
                ];
            })->concat($cashAccounts->map(function ($account) {
                return [
                    'id' => 'cash_' . $account->id, // Prefix to differentiate from bank accounts
                    'account_name' => $account->name,
                    'account_number' => $account->account_code,
                    'currency' => $account->currency,
                ];
            }))->sortBy('account_name')->values()->all();

            $openInvoices = \App\Models\Vendor_Purchases\PurchaseInvoice::query()
                ->with('currency:id,code,name')
                ->select('id', 'invoice_number', 'invoice_date', 'supplier_id', 'currency_id', 'total_amount', 'paid_amount', 'balance_amount')
                ->where('balance_amount', '>', 0)
                ->where('payment_status', '!=', 'paid')
                ->orderByDesc('id')
                ->limit(200)
                ->get();

            return Inertia::render('Backend/06-Cash/PaymentVoucher', [
                'vouchers' => $vouchers,
                'suppliers' => $suppliers,
                'currencies' => $currencies,
                'bankAccounts' => $bankAccounts,
                'openInvoices' => $openInvoices,
                'filters' => [
                    'search' => $search,
                    'status' => $status,
                    'supplier_id' => $supplierId,
                ],
            ]);
        })->name('payment-vouchers.index');
        Route::post('payment-vouchers', [\App\Http\Controllers\Backend\Cash\PaymentVoucherController::class, 'store'])
            ->name('payment-vouchers.store');
        Route::put('payment-vouchers/{voucher}', [\App\Http\Controllers\Backend\Cash\PaymentVoucherController::class, 'update'])
            ->name('payment-vouchers.update');
        Route::delete('payment-vouchers/{voucher}', [\App\Http\Controllers\Backend\Cash\PaymentVoucherController::class, 'destroy'])
            ->name('payment-vouchers.destroy');

        // 10. Investing (الاستثمار)
        Route::prefix('investing')->name('investing.')->group(function () {
            Route::resource('industries', \App\Http\Controllers\Backend\InvestingStack\IndustryController::class);
            Route::resource('companies', \App\Http\Controllers\Backend\InvestingStack\ListedCompanyController::class);
            Route::resource('brokers', \App\Http\Controllers\Backend\InvestingStack\BrokerController::class);
            Route::resource('prices', \App\Http\Controllers\Backend\InvestingStack\MarketPriceController::class);
            Route::put('prices/details/{detail}', [\App\Http\Controllers\Backend\InvestingStack\MarketPriceController::class, 'updateDetail'])->name('prices.updateDetail');
            Route::delete('prices/details/{detail}', [\App\Http\Controllers\Backend\InvestingStack\MarketPriceController::class, 'destroyDetail'])->name('prices.destroyDetail');
            Route::resource('buy-shares', \App\Http\Controllers\Backend\InvestingStack\BuyShareController::class);
            Route::resource('sell-shares', \App\Http\Controllers\Backend\InvestingStack\SellShareController::class);
            Route::get('portfolio', [\App\Http\Controllers\Backend\InvestingStack\PortfolioController::class, 'index'])->name('portfolio.index');
            Route::resource('wallet', \App\Http\Controllers\Backend\InvestingStack\WalletController::class);
        });

        // 11. Budgeting (الموازنة)
        Route::prefix('budgeting')->name('budgeting.')->group(function () {
            Route::get('budgets', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Budgets']);
            })->name('budgets.index');
            Route::get('reports', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Budget Reports']);
            })->name('reports.index');
        });

        Route::prefix('budget')->name('budget.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'dashboard'])->name('dashboard');
            Route::get('/dashboard', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'dashboard'])->name('dashboard.index');
            
            Route::resource('categories', \App\Http\Controllers\Backend\Budget\BudgetCategoryController::class);
            
            Route::resource('list', \App\Http\Controllers\Backend\Budget\BudgetController::class)->names([
                'index' => 'index',
                'store' => 'store',
                'update' => 'update',
                'destroy' => 'destroy',
            ]);

            Route::resource('items', \App\Http\Controllers\Backend\Budget\BudgetItemController::class)->names([
                'index' => 'items.index',
                'store' => 'items.store',
                'update' => 'items.update',
                'destroy' => 'items.destroy',
            ]);

            Route::prefix('commitments')->name('commitments.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'index'])->name('index');
                Route::get('/items/{budget}', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'getBudgetItems'])->name('items');
                Route::get('/vendors', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'getVendors'])->name('vendors');
                Route::post('/', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'store'])->name('store');
                Route::put('/{commitment}', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'update'])->name('update');
                Route::delete('/{commitment}', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'destroy'])->name('destroy');
                Route::post('/{commitment}/close', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'close'])->name('close');
                Route::post('/{commitment}/utilize', [\App\Http\Controllers\Backend\Budget\BudgetCommitmentController::class, 'markUtilized'])->name('utilize');
            });

            Route::prefix('forecasts')->name('forecasts.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'index'])->name('index');
                Route::get('/items/{budget}', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'getBudgetItems'])->name('items');
                Route::post('/', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'store'])->name('store');
                Route::put('/{forecast}', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'update'])->name('update');
                Route::post('/{forecast}/submit', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'submitForApproval'])->name('submit');
                Route::post('/{forecast}/approve', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'approve'])->name('approve');
                Route::post('/{forecast}/reject', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'reject'])->name('reject');
                Route::post('/{forecast}/implement', [\App\Http\Controllers\Backend\Budget\BudgetForecastController::class, 'implement'])->name('implement');
            });

            Route::prefix('monitoring')->name('monitoring.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'index'])->name('index');
                Route::get('/items/{budget}', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'getBudgetItems'])->name('items');
                Route::get('/export', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'export'])->name('export');
                Route::put('/{monitoring}', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'update'])->name('update');
                Route::post('/{monitoring}/acknowledge', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'acknowledge'])->name('acknowledge');
                Route::post('/{monitoring}/follow-up', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'followUp'])->name('follow-up');
                Route::post('/{monitoring}/mark-done', [\App\Http\Controllers\Backend\Budget\BudgetMonitoringController::class, 'markActionDone'])->name('mark-done');
            });

            Route::prefix('transfers')->name('transfers.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'index'])->name('index');
                Route::get('/items/{budget}', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'getBudgetItems'])->name('items');
                Route::post('/', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'store'])->name('store');
                Route::post('/{transfer}/submit', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'submit'])->name('submit');
                Route::post('/{transfer}/approve', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'approve'])->name('approve');
                Route::post('/{transfer}/reject', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'reject'])->name('reject');
                Route::post('/{transfer}/complete', [\App\Http\Controllers\Backend\Budget\BudgetTransferController::class, 'complete'])->name('complete');
            });
        });

        // 12. Taxes (الضرائب)
        Route::prefix('taxes')->name('taxes.')->group(function () {
            Route::resource('types', \App\Http\Controllers\Backend\Taxes\TaxTypeController::class);
            Route::get('settings', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Settings']);
            })->name('settings.index');
            Route::get('reports', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Tax Reports']);
            })->name('reports.index');
        });

        // 13. E-Commerce (التجارة الإلكترونية)
        Route::prefix('ecommerce')->name('ecommerce.')->group(function () {
            Route::post('ads/bulk-delete', [\App\Http\Controllers\Backend\ECommerce\AdsController::class, 'bulkDelete'])->name('ads.bulk-delete');
            Route::post('ads/bulk-status', [\App\Http\Controllers\Backend\ECommerce\AdsController::class, 'bulkStatus'])->name('ads.bulk-status');
            Route::resource('ads', \App\Http\Controllers\Backend\ECommerce\AdsController::class);
            Route::get('financial-reports', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'E-Commerce Financial Reports']);
            })->name('financial-reports.index');
        });

        // 14. Locations (المواقع الجغرافية)
        Route::prefix('location')->name('location.')->group(function () {
            Route::get('/', [LocationController::class, 'index'])->name('index');
            Route::post('/countries', [LocationController::class, 'storeCountry'])->name('countries.store');
            Route::put('/countries/{country_model}', [LocationController::class, 'updateCountry'])->name('countries.update');
            Route::delete('/countries/{country_model}', [LocationController::class, 'destroyCountry'])->name('countries.destroy');

            Route::post('/cities', [LocationController::class, 'storeCity'])->name('cities.store');
            Route::put('/cities/{city}', [LocationController::class, 'updateCity'])->name('cities.update');
            Route::delete('/cities/{city}', [LocationController::class, 'destroyCity'])->name('cities.destroy');

            Route::post('/areas', [LocationController::class, 'storeArea'])->name('areas.store');
            Route::put('/areas/{area}', [LocationController::class, 'updateArea'])->name('areas.update');
            Route::delete('/areas/{area}', [LocationController::class, 'destroyArea'])->name('areas.destroy');

            Route::post('/bulk-import', [LocationController::class, 'bulkImport'])->name('bulk-import');
            Route::post('/bulk-delete', [LocationController::class, 'bulkDelete'])->name('bulk-delete');
            Route::post('/bulk-status', [LocationController::class, 'bulkUpdateStatus'])->name('bulk-status');
        });

        // 15. Settings (الإعدادات)
        Route::get('settings', function () {
            return Inertia::render('Backend/Settings/Settings');
        })->name('settings');

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
            Route::get('blog', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Blog']);
            })->name('blog.index');
            Route::get('payments', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Payments']);
            })->name('payments.index');
            Route::get('ads', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Ads Page']);
            })->name('ads.index');
            Route::get('contact', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Contact']);
            })->name('contact.index');
            Route::get('sliders', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Simple Sliders']);
            })->name('sliders.index');
            Route::get('faqs', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'FAQs']);
            })->name('faqs.index');
            Route::get('newsletters', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Newsletters']);
            })->name('newsletters.index');
            Route::get('appearance', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Appearance']);
            })->name('appearance.index');
            Route::get('plugins', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Plugins']);
            })->name('plugins.index');
            Route::get('tools', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'Tools']);
            })->name('tools.index');
            Route::get('whatsapp', function () {
                return Inertia::render('Backend/ComingSoon', ['title' => 'WhatsApp Floating Button']);
            })->name('whatsapp.index');
        });

        Route::get('platform-admin', function () {
            return Inertia::render('Backend/Settings/PlatformAdmin');
        })->name('platform-admin.index');
        Route::get('cache-management', [App\Http\Controllers\Backend\Settings\CacheController::class, 'index'])->name('cache.index');
        Route::get('users', function () {
            return Inertia::render('Backend/Settings/Users');
        })->name('users.index');

        // Roles and Permissions
        Route::resource('roles', \App\Http\Controllers\Backend\Settings\RoleController::class)->except(['create', 'edit', 'show']);
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
