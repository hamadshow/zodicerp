<?php

namespace App\Http\Middleware;

use App\Models\Language;
use App\Models\LanguageLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Define the translations to be shared.
     */
    protected function getTranslations()
    {
        $locale = App::getLocale();
        $fallbackLocale = config('app.fallback_locale', 'en');

        return Cache::remember("inertia.translations.{$locale}.v3", 3600, function () use ($locale, $fallbackLocale) {
            $safeLocale = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $locale);
            $safeFallbackLocale = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $fallbackLocale);

            // 1. File Translations
            $fileTranslations = [];
            $files = ['homepage', 'home', 'header', 'cart', 'common', 'ads', 'messages', 'orders', 'product', 'products', 'settings', 'sidebar', 'auth', 'verify_email', 'confirm', 'reset_password', 'ItemUnits', 'Warehouses', 'ChartOfAccounts', 'Suppliers', 'BudgeDashBoard', 'Budget', 'BudgetCategory', 'BudgetMonitoring', 'BudgetItems', 'FinancialReports', 'TrialBalance', 'Journal', 'MarketPrices', 'ListedCompanies', 'SalesInvoice', 'career', 'dashboard', 'applications', 'Bank', 'BankTransactions', 'DashboardTreasury'];

            foreach ($files as $file) {
                $path = lang_path("$locale/$file.php");
                if (file_exists($path)) {
                    $translations = require $path;
                    if (is_array($translations)) {
                        foreach ($translations as $key => $value) {
                            $fileTranslations["$file.$key"] = is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : (string)$value;
                        }
                    }
                }
            }

            // 2. Database Translations (Only override files when locale-specific value exists)
            $dbTranslations = LanguageLine::query()
                ->select(['group', 'key', 'text'])
                ->get()
                ->mapWithKeys(function ($line) use ($safeLocale, $safeFallbackLocale, $fileTranslations) {
                    $compoundKey = $line->group . '.' . $line->key;

                    $text = is_array($line->text) ? $line->text : json_decode((string) $line->text, true);
                    if (!is_array($text)) {
                        if (array_key_exists($compoundKey, $fileTranslations)) {
                            return [];
                        }

                        return [$compoundKey => (string) $line->key];
                    }

                    if (array_key_exists($safeLocale, $text)) {
                        return [$compoundKey => (string) $text[$safeLocale]];
                    }

                    $fileHasKey = array_key_exists($compoundKey, $fileTranslations);
                    $shouldUseFallback = ($safeLocale === $safeFallbackLocale) || !$fileHasKey;

                    if ($shouldUseFallback && array_key_exists($safeFallbackLocale, $text)) {
                        return [$compoundKey => (string) $text[$safeFallbackLocale]];
                    }

                    return [];
                })
                ->toArray();

            return array_merge($fileTranslations, $dbTranslations);
        });
    }

    private function getUserPermissions($user)
    {
        $permissions = [];
        // Ensure roles are loaded
        if ($user && method_exists($user, 'roles')) {
            $roles = $user->roles;
            foreach ($roles as $role) {
                if (is_array($role->permissions)) {
                    foreach ($role->permissions as $group => $resources) {
                        foreach ($resources as $resource => $actions) {
                            $normalizedResource = str_replace(' ', '_', strtolower($resource));
                            foreach ($actions as $action) {
                                $permissions[] = $normalizedResource . '.' . strtolower($action);
                            }
                        }
                    }
                }
            }
        }
        return array_unique($permissions);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $isAdminRoute = $request->is('*/admin/*') || $request->is('*/admin');
        
        // Optimize: Only load translations if not an admin route or as needed
        $translations = $this->getTranslations();
        if (!is_array($translations)) {
            $translations = [];
        }

        $cartCount = 0;
        $cartVersion = 0;

        if (!$isAdminRoute && $request->hasSession()) {
            $cart = $request->session()->get('cart', []);
            $cartVersion = (int) $request->session()->get('cart_version', 0);
            if (is_array($cart)) {
                foreach ($cart as $item) {
                    if (is_array($item) && isset($item['quantity']) && (int)$item['quantity'] > 0) {
                        $cartCount += 1;
                    }
                }
            }
        }

        // Validate and sanitize country code
        $countryCode = $request->session()->get('country_code');
        if (!preg_match('/^[a-zA-Z]{2,3}$/', $countryCode)) {
            $countryCode = 'sa';
            $request->session()->put('country_code', $countryCode);
        }

        $user = $request->user() ?: $request->user('employee');
        $permissions = [];
        if ($user) {
            if ($user instanceof \App\Models\User) {
                // System users get all permissions if they have specific roles
                $systemRoles = ['admin', 'superadmin', 'super_admin', 'owner', 'developer', 'programmer', 'technical_administrator'];
                if (in_array(strtolower($user->role), $systemRoles)) {
                    $permissions = ['*']; // All access
                } else {
                    $permissions = $this->getUserPermissions($user);
                }
            } else if ($user instanceof \App\Models\Employee) {
                $permissions = $this->getUserPermissions($user);
            }
        }

        return array_merge(is_array(parent::share($request)) ? parent::share($request) : [], [
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), ['permissions' => $permissions]) : null,
                'customer' => $isAdminRoute ? null : $request->user('customer'),
                'supplier' => $isAdminRoute ? null : $request->user('supplier'),
            ],
            'localization' => [
                'current_country' => strtolower($countryCode),
                'current_locale' => (string)app()->getLocale(),
                'is_rtl' => app()->getLocale() === 'ar',
                'country_code' => strtolower($countryCode),
                'currency_code' => (string)$request->session()->get('currency_code', 'SAR'),
                'translations' => $translations,
            ],
            'flash' => [
                'success' => $request->hasSession() ? $request->session()->get('success') : null,
                'error' => $request->hasSession() ? $request->session()->get('error') : null,
            ],
            'cart' => [
                'count' => (int) $cartCount,
                'version' => (int) $cartVersion,
            ],
        ]);
    }
}
