<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

use App\Models\Language;

use App\Models\LanguageLine;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;

class HandleInertiaRequests extends Middleware
{
    /**
     * Define the translations to be shared.
     */
    protected function getTranslations()
    {
        $locale = App::getLocale();
        $fallbackLocale = config('app.fallback_locale');

        return Cache::remember("inertia.translations.{$locale}", 600, function () use ($locale, $fallbackLocale) {
            $safeLocale = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $locale);
            $safeFallbackLocale = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $fallbackLocale);

            $dbTranslations = LanguageLine::query()
                ->select(['group', 'key'])
                ->selectRaw(
                    "COALESCE(" .
                        "JSON_UNQUOTE(JSON_EXTRACT(text, '$.\"{$safeLocale}\"'))," .
                        "JSON_UNQUOTE(JSON_EXTRACT(text, '$.\"{$safeFallbackLocale}\"'))," .
                        "`key`" .
                    ") as value"
                )
                ->get()
                ->mapWithKeys(fn ($line) => [($line->group . '.' . $line->key) => $line->value])
                ->toArray();

            $fileTranslations = [];
            $files = ['home', 'header', 'cart', 'common', 'ads', 'messages', 'orders', 'product', 'products', 'settings', 'sidebar'];

            foreach ($files as $file) {
                $path = lang_path("$locale/$file.php");
                if (file_exists($path)) {
                    $translations = require $path;
                    foreach ($translations as $key => $value) {
                        $fileTranslations["$file.$key"] = $value;
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
        $skipTranslations = $request->path() === '' || $request->is('Home');

        $cart = $request->session()->get('cart', []);
        $cartVersion = (int) $request->session()->get('cart_version', 0);
        $cartCount = 0;
        if (is_array($cart)) {
            foreach ($cart as $item) {
                if ((int) ($item['quantity'] ?? 0) > 0) {
                    $cartCount += 1;
                }
            }
        }
        
        $user = $request->user();
        $customer = $request->user('customer');
        $supplier = $request->user('supplier');

        // \Illuminate\Support\Facades\Log::info('Inertia Share Auth:', [
        //     'user' => $user ? $user->id : null,
        //     'customer' => $customer ? $customer->id : null,
        //     'supplier' => $supplier ? $supplier->id : null,
        // ]);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'customer' => $customer,
                'supplier' => $supplier,
            ],
            'localization' => [
                'current_country' => config('app.country'),
                'current_locale' => app()->getLocale(),
                'is_rtl' => false,
                'country_code' => session('country_code'),
                'currency_code' => session('currency_code'),
                'active_languages' => Cache::remember(
                    'inertia.active_languages',
                    600,
                    fn () => Language::orderBy('lang_order', 'asc')->get()
                ),
                'translations' => $skipTranslations ? [] : $this->getTranslations(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'cart' => [
                'count' => $cartCount,
                'version' => $cartVersion,
            ],
        ];
    }
}
