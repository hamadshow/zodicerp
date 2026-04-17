<?php

namespace App\Http\Middleware;

use App\Models\Country;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

class SetLocalization
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $countryCode = $request->segment(1);
        $langCode = $request->segment(2);

        if (is_string($countryCode) && strtolower($countryCode) === 'sar') {
            $segments = $request->segments();
            $segments[0] = 'sa';

            $url = $request->getSchemeAndHttpHost().'/'.implode('/', $segments);
            $queryString = $request->getQueryString();
            if (is_string($queryString) && $queryString !== '') {
                $url .= '?'.$queryString;
            }

            return redirect()->to($url);
        }

        $supportedLocales = \Illuminate\Support\Facades\Cache::remember('supported_locales', 86400, function () {
            try {
                $locales = \App\Models\Language::pluck('lang_code')->toArray();
                return empty($locales) ? ['en', 'ar'] : $locales;
            } catch (\Exception $e) {
                return ['en', 'ar'];
            }
        });

        $appDefaultLocale = (string) config('app.locale', 'en');
        if (! in_array($appDefaultLocale, $supportedLocales)) {
            $appDefaultLocale = $supportedLocales[0] ?? 'en';
        }

        // Handle Country
        $country = null;
        if ($countryCode && strlen($countryCode) === 2) {
            $country = \Illuminate\Support\Facades\Cache::remember("country.{$countryCode}", 86400, function () use ($countryCode) {
                return Country::where('code', strtoupper($countryCode))->where('status', 'active')->first();
            });
        }

        if (! $country && ! Session::has('country_code')) {
            // Auto-detect country based on IP if not specified in URL and not in session
            $detectedCountryCode = $this->detectCountryCode($request->ip());
            if ($detectedCountryCode) {
                $country = \Illuminate\Support\Facades\Cache::remember("country.{$detectedCountryCode}", 86400, function () use ($detectedCountryCode) {
                    return Country::where('code', strtoupper($detectedCountryCode))->where('status', 'active')->first();
                });
            }
        }

        if ($country) {
            Config::set('app.country', $country);
            Session::put('country_code', strtolower($country->code));
        } else {
            // Default country if not specified or invalid
            $defaultCountry = \Illuminate\Support\Facades\Cache::remember('country.default', 86400, function () {
                return Country::where('code', 'SA')->first() ?: Country::where('status', 'active')->first();
            });
            if ($defaultCountry) {
                Config::set('app.country', $defaultCountry);
                Session::put('country_code', strtolower($defaultCountry->code));
            }
        }

        $currencyCode = session('currency_code', 'SAR');
        Session::put('currency_code', strtoupper($currencyCode));

        // Handle Language
        if (in_array($langCode, $supportedLocales)) {
            App::setLocale($langCode);
            Session::put('locale', $langCode);
        } elseif (Session::has('locale') && in_array(Session::get('locale'), $supportedLocales)) {
            App::setLocale(Session::get('locale'));
        } else {
            App::setLocale($appDefaultLocale);
            Session::put('locale', $appDefaultLocale);
        }

        // Set URL defaults for country and lang
        $currentCountry = strtolower($countryCode ?: session('country_code', 'sa'));
        $currentLocale = strtolower($langCode ?: session('locale', $appDefaultLocale));

        URL::defaults([
            'country' => $currentCountry,
            'lang' => $currentLocale,
        ]);

        $rootUrl = $request->getSchemeAndHttpHost();
        URL::forceRootUrl($rootUrl);
        Config::set('app.url', $rootUrl);

        $request->route()?->forgetParameter('country');
        $request->route()?->forgetParameter('lang');

        return $next($request);
    }

    /**
     * Detect country code from IP address.
     * Stub for enterprise Geo-IP detection.
     */
    protected function detectCountryCode($ip): ?string
    {
        // For development/testing, return SA or use a free API
        if ($ip === '127.0.0.1') {
            return 'SA';
        }

        try {
            // In production, use a package like torann/geoip or an external API
            // $response = Http::get("http://ip-api.com/json/{$ip}");
            // return $response->json('countryCode');
            return 'SA'; // Default for now
        } catch (\Exception $e) {
            return null;
        }
    }
}
