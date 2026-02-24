<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;

use Illuminate\Support\Facades\URL;
use App\Models\Country;
use Illuminate\Support\Facades\Config;

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

        $supportedLocales = \App\Models\Language::pluck('lang_code')->toArray();
        if (empty($supportedLocales)) {
            $supportedLocales = ['en', 'ar'];
        }
        
        // Handle Country
        $country = null;
        if ($countryCode && strlen($countryCode) === 2) {
            $country = Country::with('currency')->where('code', strtoupper($countryCode))->where('status', 'active')->first();
        }

        if (!$country && !Session::has('country_code')) {
            // Auto-detect country based on IP if not specified in URL and not in session
            $detectedCountryCode = $this->detectCountryCode($request->ip());
            if ($detectedCountryCode) {
                $country = Country::with('currency')->where('code', strtoupper($detectedCountryCode))->where('status', 'active')->first();
            }
        }

        if ($country) {
            Config::set('app.country', $country);
            Session::put('country_code', strtolower($country->code));
            
            // Set Currency based on country
            $currencyCode = $country->currency->code ?? $country->currency ?? 'SAR';
            Session::put('currency_code', strtoupper($currencyCode));
        } else {
            // Default country if not specified or invalid
            $defaultCountry = Country::with('currency')->where('code', 'SA')->first() ?: Country::where('status', 'active')->first();
            if ($defaultCountry) {
                Config::set('app.country', $defaultCountry);
                Session::put('country_code', strtolower($defaultCountry->code));
                
                // Set Currency for default country
                $currencyCode = $defaultCountry->currency->code ?? $defaultCountry->currency ?? 'SAR';
                Session::put('currency_code', strtoupper($currencyCode));
            }
        }

        // Handle Language
        if (in_array($langCode, $supportedLocales)) {
            App::setLocale($langCode);
            Session::put('locale', $langCode);
        } elseif (Session::has('locale')) {
            App::setLocale(Session::get('locale'));
        } else {
            // Default language based on country or fallback
            $locale = Config::get('app.country')->default_language ?? 'ar';
            App::setLocale($locale);
        }

        // Set URL defaults for country and lang
        $currentCountry = session('country_code', 'sa');
        $currentLocale = session('locale', 'ar');

        URL::defaults([
            'country' => $currentCountry,
            'lang' => $currentLocale,
        ]);

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
        if ($ip === '127.0.0.1') return 'SA';
        
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
