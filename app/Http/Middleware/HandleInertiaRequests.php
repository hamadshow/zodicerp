<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

use App\Models\Language;

use App\Models\LanguageLine;
use Illuminate\Support\Facades\App;

class HandleInertiaRequests extends Middleware
{
    /**
     * Define the translations to be shared.
     */
    protected function getTranslations()
    {
        $locale = App::getLocale();
        return LanguageLine::all()->mapWithKeys(function ($line) use ($locale) {
            $key = $line->group . '.' . $line->key;
            $text = $line->text[$locale] ?? ($line->text[config('app.fallback_locale')] ?? $line->key);
            return [$key => $text];
        })->toArray();
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
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

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                'customer' => $request->user('customer'),
                'supplier' => $request->user('supplier'),
            ],
            'localization' => [
                'current_country' => config('app.country'),
                'current_locale' => app()->getLocale(),
                'is_rtl' => Language::where('lang_code', app()->getLocale())->value('lang_is_rtl') == 1,
                'country_code' => session('country_code'),
                'currency_code' => session('currency_code'),
                'active_languages' => Language::orderBy('lang_order', 'asc')->get(),
                'translations' => $this->getTranslations(),
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
