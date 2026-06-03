<?php

namespace App\Http\Middleware;

use App\Models\Location;
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
            if (!empty($segments)) {
                $segments[0] = 'sa';

                $url = $request->getSchemeAndHttpHost().'/'.implode('/', $segments);
                $queryString = $request->getQueryString();
                if (is_string($queryString) && $queryString !== '') {
                    $url .= '?'.$queryString;
                }

                return redirect()->to($url);
            }
        }

        $supportedLocales = \Illuminate\Support\Facades\Cache::remember('supported_locales', 86400, function () {
            try {
                $locales = \App\Models\Language::pluck('lang_code')->toArray();
                $locales = array_filter($locales); // Remove any null/empty values
                return empty($locales) ? ['en', 'ar'] : array_values($locales);
            } catch (\Exception $e) {
                return ['en', 'ar'];
            }
        });

        if (!is_array($supportedLocales) || empty($supportedLocales)) {
            $supportedLocales = ['en', 'ar'];
        }

        $appDefaultLocale = (string) config('app.locale', 'en');
        if (! in_array($appDefaultLocale, $supportedLocales)) {
            $appDefaultLocale = $supportedLocales[0] ?? 'en';
        }

        // Validate country code from URL
        if ($countryCode && !preg_match('/^[a-zA-Z]{2,3}$/', $countryCode)) {
            $countryCode = null;
        }

        // Handle Country
        $country = null;
        if ($countryCode && strlen($countryCode) >= 2 && strlen($countryCode) <= 3) {
            $country = \Illuminate\Support\Facades\Cache::remember("country.{$countryCode}", 86400, function () use ($countryCode) {
                return Location::where('location_type', 'country')->where('code', strtoupper($countryCode))->where('status', true)->first();
            });
        }

        if (! $country && ! Session::has('country_code')) {
            // Auto-detect country based on IP if not specified in URL and not in session
            $detectedCountryCode = $this->detectCountryCode($request->ip());
            if ($detectedCountryCode) {
                $country = \Illuminate\Support\Facades\Cache::remember("country.{$detectedCountryCode}", 86400, function () use ($detectedCountryCode) {
                    return Location::where('location_type', 'country')->where('code', strtoupper($detectedCountryCode))->where('status', true)->first();
                });
            }
        }

        $defaultCountryCode = 'sa';
        if ($country) {
            Config::set('app.country', $country);
            $defaultCountryCode = strtolower($country->code);
            Session::put('country_code', $defaultCountryCode);
        } else {
            // Default country if not specified or invalid
            $defaultCountry = \Illuminate\Support\Facades\Cache::remember('country.default', 86400, function () {
                return Location::where('location_type', 'country')->where('code', 'SA')->first() ?: Location::where('location_type', 'country')->where('status', true)->first();
            });
            if ($defaultCountry) {
                Config::set('app.country', $defaultCountry);
                $defaultCountryCode = strtolower($defaultCountry->code);
                Session::put('country_code', $defaultCountryCode);
            }
        }

        // Validate and sanitize existing country code in session
        $sessionCountryCode = Session::get('country_code');
        if ($sessionCountryCode && !preg_match('/^[a-zA-Z]{2,3}$/', $sessionCountryCode)) {
            Session::put('country_code', $defaultCountryCode);
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
        $currentCountry = strtolower($countryCode ?: session('country_code', $defaultCountryCode));
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
