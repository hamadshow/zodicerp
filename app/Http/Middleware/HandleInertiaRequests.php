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

        return Cache::remember("inertia.translations.{$locale}.v2", 3600, function () use ($locale, $fallbackLocale) {
            $safeLocale = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $locale);
            $safeFallbackLocale = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $fallbackLocale);

            // 1. Database Translations (Optimized Query)
            $dbTranslations = LanguageLine::query()
                ->select(['group', 'key', 'text'])
                ->get()
                ->mapWithKeys(function ($line) use ($safeLocale, $safeFallbackLocale) {
                    $text = is_array($line->text) ? $line->text : json_decode((string)$line->text, true);
                    
                    if (!is_array($text)) {
                        return [($line->group . '.' . $line->key) => (string)$line->key];
                    }

                    $value = $text[$safeLocale] ?? $text[$safeFallbackLocale] ?? $line->key;
                    return [($line->group . '.' . $line->key) => (string)$value];
                })
                ->toArray();

            // 2. File Translations
            $fileTranslations = [];
            $files = ['homepage', 'home', 'header', 'cart', 'common', 'ads', 'messages', 'orders', 'product', 'products', 'settings', 'sidebar', 'auth', 'verify_email', 'confirm', 'reset_password', 'ItemUnits', 'Warehouses', 'ChartOfAccounts', 'Suppliers', 'BudgeDashBoard', 'Budget', 'BudgetCategory', 'BudgetMonitoring', 'BudgetItems', 'FinancialReports', 'TrialBalance', 'Journal', 'MarketPrices', 'ListedCompanies', 'career', 'dashboard', 'applications', 'Bank', 'BankTransactions'];

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

            return array_merge($fileTranslations, $dbTranslations);
        });
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

        return array_merge(is_array(parent::share($request)) ? parent::share($request) : [], [
            'auth' => [
                'user' => $request->user(),
                'customer' => $isAdminRoute ? null : $request->user('customer'),
                'supplier' => $isAdminRoute ? null : $request->user('supplier'),
            ],
            'localization' => [
                'current_country' => (string)session('country_code', config('app.country.code', 'sa')),
                'current_locale' => (string)app()->getLocale(),
                'is_rtl' => app()->getLocale() === 'ar',
                'country_code' => (string)session('country_code', 'sa'),
                'currency_code' => (string)session('currency_code', 'SAR'),
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
