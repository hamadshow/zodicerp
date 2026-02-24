<?php

use App\Http\Controllers\Accounting\AccountsController;
use App\Http\Controllers\Accounting\JournalController;
use App\Http\Controllers\CheckoutController;
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
use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\Auth\SupplierAuthController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Client_Sales\CustomerAddressController;
use App\Http\Controllers\Purchases\SupplierController;
use App\Http\Controllers\Sales\CustomerController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// 1. Media Files (No localization)
Route::get('/media-files/{path}', function (string $path) {
    $relativePath = ltrim($path, '/');
    $normalized = preg_replace('#^(files|storage|media-files)/#', '', $relativePath);
    
    // Check if it's already a full path from public
    if (Storage::disk('public')->exists($normalized)) {
        return Storage::disk('public')->response($normalized);
    }
    
    // Check if it's in media subfolder
    if (Storage::disk('public')->exists('media/' . $normalized)) {
        return Storage::disk('public')->response('media/' . $normalized);
    }

    abort(404);
})->where('path', '.*');

// 2. Root Redirect to default country/lang
Route::get('/', function () {
    $country = session('country_code', 'sa');
    $lang = session('locale', 'ar');
    return redirect("/$country/$lang");
});

Route::get('/Auth', function () {
    $country = session('country_code', 'sa');
    $lang = session('locale', 'ar');
    return redirect("/$country/$lang/Auth");
});

Route::get('/auth', function () {
    $country = session('country_code', 'sa');
    $lang = session('locale', 'ar');
    return redirect("/$country/$lang/Auth");
});

Route::get('/login', function () {
    $country = session('country_code', 'sa');
    $lang = session('locale', 'ar');
    return redirect("/$country/$lang/Auth");
});

Route::get('/admin', function () {
    $country = session('country_code', 'sa');
    $lang = session('locale', 'ar');
    return redirect("/$country/$lang/admin");
});

// 3. Main Enterprise Routing with Country and Language Prefixes
Route::group([
    'prefix' => '{country}/{lang}',
    'where' => [
        'country' => '[a-zA-Z]{2}',
        'lang' => '[a-z]{2}'
    ],
    'middleware' => ['web', \App\Http\Middleware\SetLocalization::class]
], function () {

    // --- Frontend Routes ---
    Route::get('/', [HomeController::class, 'index'])->name('home');
    Route::get('/products', [HomeController::class, 'products'])->name('products.index');
    Route::get('/product/{identifier}', [HomeController::class, 'productDetails'])->name('product.details');
    Route::get('/cart', [HomeController::class, 'cart'])->name('cart.index');
    Route::get('/cart/mini', [CartController::class, 'mini'])->name('cart.mini');
    Route::post('/cart/add', [CartController::class, 'add'])->name('cart.add');
    Route::post('/cart/remove', [CartController::class, 'remove'])->name('cart.remove');
    Route::post('/cart/update', [CartController::class, 'update'])->name('cart.update');
    Route::get('/checkout', [HomeController::class, 'checkout'])->name('checkout');
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');
    Route::get('/checkout/success', [CheckoutController::class, 'success'])->name('checkout.success');

    // --- Auth Routes ---
    require __DIR__.'/auth.php';
    Route::get('/sign-in', function () { return Inertia::render('Auth/SignIn'); })->name('sign-in');
    Route::get('/sign-up', function () { return Inertia::render('Auth/SignUp'); })->name('sign-up');

    // Customer Auth
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

    // Supplier Auth & Dashboard
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

    // --- Admin & Backend Routes ---
    Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', [AdminController::class, 'index'])->name('dashboard');

        // Media
        Route::prefix('media')->name('media.')->group(function () {
            Route::get('/{tab?}', [MediaController::class, 'index'])->where('tab', 'images|videos|documents')->name('index');
            Route::post('/store', [MediaController::class, 'store'])->name('store');
            Route::post('/folder', [MediaController::class, 'storeFolder'])->name('folder.store');
            Route::post('/destroy', [MediaController::class, 'destroy'])->name('destroy');
            Route::post('/rename', [MediaController::class, 'rename'])->name('rename');
            Route::post('/move', [MediaController::class, 'move'])->name('move');
        });

        // Essential Data
        Route::resource('currencies', \App\Http\Controllers\Essential_Data_Controllers\CurrencyController::class);
        Route::resource('exchange-rates', \App\Http\Controllers\Essential_Data_Controllers\ExchangeRateController::class);
        Route::resource('companies', \App\Http\Controllers\Essential_Data_Controllers\CompanyController::class);
        Route::resource('branches', \App\Http\Controllers\Essential_Data_Controllers\BranchController::class);

        // Human Resources
        Route::get('hr/dashboard', function () { return Inertia::render('Backend/02_human_resource/dashboard'); })->name('hr.dashboard');
        Route::resource('employees', \App\Http\Controllers\HumanResource\EmployeeController::class);
        Route::resource('nationalities', \App\Http\Controllers\HumanResource\NationalityController::class);
        Route::get('departments', function () { return Inertia::render('Backend/02_human_resource/Departments'); })->name('departments.index');
        Route::get('profession', function () { return Inertia::render('Backend/02_human_resource/Profession'); })->name('profession.index');
        Route::get('attendance', function () { return Inertia::render('Backend/02_human_resource/Attendance'); })->name('attendance.index');
        Route::get('payroll-advance', function () { return Inertia::render('Backend/02_human_resource/Payroll-Advance'); })->name('payroll-advance.index');
        Route::get('deductions', function () { return Inertia::render('Backend/02_human_resource/Deductions'); })->name('deductions.index');
        Route::get('vacations', function () { return Inertia::render('Backend/02_human_resource/Vacations'); })->name('vacations.index');
        Route::get('salary-receipt', function () { return Inertia::render('Backend/02_human_resource/Salary-Receipt'); })->name('salary-receipt.index');

        // Inventory
        Route::resource('products', \App\Http\Controllers\Inventory\ProductsController::class);
        Route::resource('categories', \App\Http\Controllers\Inventory\CategoriesController::class);
        Route::resource('brands', \App\Http\Controllers\Inventory\BrandsController::class);
        Route::resource('warehouses', \App\Http\Controllers\Inventory\WarehousesController::class);
        Route::resource('item-units', \App\Http\Controllers\Inventory\ItemUnitController::class);
        Route::resource('item-attributes', \App\Http\Controllers\Inventory\ItemAttributeController::class);
        Route::resource('item-collections', \App\Http\Controllers\Inventory\ItemCollectionController::class);

        // Accounting & Business
        Route::get('chart-of-accounts', function () { return Inertia::render('Backend/07-Accounting/ChartOfAccounts'); })->name('chart-of-accounts');
        Route::get('financial-reports', [FinancialReportController::class, 'index'])->name('financial-reports.index');
        Route::get('financial-reports/coa', [FinancialReportController::class, 'coaReport'])->name('financial-reports.coa');

        // Budgeting
        Route::prefix('budget')->name('budget.')->group(function () {
            Route::get('/', function () { return Inertia::render('Backend/Budget/BudgeDashBoard'); })->name('dashboard');
            Route::get('/categories', function () { return Inertia::render('Backend/Budget/BudgetCategory'); })->name('categories');
            Route::get('/list', function () { return Inertia::render('Backend/Budget/Budget'); })->name('index');
            Route::get('/forecasts', function () { return Inertia::render('Backend/Budget/BudgetForecast'); })->name('forecasts');
            Route::get('/monitoring', function () { return Inertia::render('Backend/Budget/BudgetMonitoring'); })->name('monitoring');
            Route::get('/transfers', function () { return Inertia::render('Backend/Budget/BudgetTransfer'); })->name('transfers');
            Route::get('/commitments', function () { return Inertia::render('Backend/Budget/BudgetCommitment'); })->name('commitments');
        });
        
        // Location
        Route::prefix('location')->name('location.')->group(function () {
            Route::get('/', [LocationController::class, 'index'])->name('index');
            Route::post('/countries', [LocationController::class, 'storeCountry']);
            Route::post('/cities', [LocationController::class, 'storeCity']);
            Route::post('/areas', [LocationController::class, 'storeArea']);
        });

        // Settings
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
    });

    // --- API & Search (Prefixed by Country/Lang for context) ---
    Route::prefix('api')->name('api.')->group(function () {
        Route::get('/search', [HomeController::class, 'globalSearch'])->name('search');
        Route::get('/countries', [LocationController::class, 'getCountries']);
        Route::get('/cities', [LocationController::class, 'getCities']);
    });

});
