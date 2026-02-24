<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\ExchangeRate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;

class CurrencyConverter
{
    /**
     * Convert an amount from one currency to another.
     *
     * @param float|null $amount
     * @param string|null $fromCode If null, uses the base currency.
     * @param string|null $toCode If null, uses the current session currency.
     * @return float
     */
    public static function convert(?float $amount, ?string $fromCode = null, ?string $toCode = null): float
    {
        $amount = (float) ($amount ?? 0);

        $fromCode = $fromCode ?: self::getBaseCurrencyCode();
        $toCode = $toCode ?: self::getCurrentCurrencyCode();

        if ($fromCode === $toCode) {
            return $amount;
        }

        $rate = self::getExchangeRate($fromCode, $toCode);

        return round($amount * $rate, 2);
    }

    /**
     * Format the amount with the current currency symbol.
     *
     * @param float $amount
     * @param string|null $currencyCode
     * @return string
     */
    public static function format(float $amount, ?string $currencyCode = null): string
    {
        $currencyCode = $currencyCode ?: self::getCurrentCurrencyCode();
        $currency = self::getCurrency($currencyCode);

        if (!$currency) {
            return number_format($amount, 2) . ' ' . $currencyCode;
        }

        $formatted = number_format($amount, $currency->decimal_places);

        // Simple format: Symbol Amount or Amount Symbol
        return str_replace(['{symbol}', '{amount}'], [$currency->symbol, $formatted], $currency->format ?: '{symbol} {amount}');
    }

    /**
     * Get the current active currency code from session or default.
     *
     * @return string
     */
    public static function getCurrentCurrencyCode(): string
    {
        return Session::get('currency_code', self::getBaseCurrencyCode());
    }

    /**
     * Get the base currency code (usually SAR or USD).
     *
     * @return string
     */
    public static function getBaseCurrencyCode(): string
    {
        return Cache::remember('base_currency_code', 86400, function () {
            return Currency::where('is_base', true)->value('code') ?: 'SAR';
        });
    }

    /**
     * Get exchange rate between two currencies.
     *
     * @param string $from
     * @param string $to
     * @return float
     */
    public static function getExchangeRate(string $from, string $to): float
    {
        $cacheKey = "xr_{$from}_{$to}";

        return Cache::remember($cacheKey, 3600, function () use ($from, $to) {
            $fromCurrency = self::getCurrency($from);
            $toCurrency = self::getCurrency($to);

            if (!$fromCurrency || !$toCurrency) {
                return 1.0;
            }

            // Direct rate
            $rate = ExchangeRate::where('from_currency_id', $fromCurrency->id)
                ->where('to_currency_id', $toCurrency->id)
                ->latest('rate_date')
                ->value('rate');

            if ($rate) {
                return (float) $rate;
            }

            // Inverse rate
            $inverseRate = ExchangeRate::where('from_currency_id', $toCurrency->id)
                ->where('to_currency_id', $fromCurrency->id)
                ->latest('rate_date')
                ->value('rate');

            if ($inverseRate) {
                return 1 / (float) $inverseRate;
            }

            // Cross rate through base currency if neither is base
            $baseCode = self::getBaseCurrencyCode();
            if ($from !== $baseCode && $to !== $baseCode) {
                $fromToBase = self::getExchangeRate($from, $baseCode);
                $baseToTarget = self::getExchangeRate($baseCode, $to);
                return $fromToBase * $baseToTarget;
            }

            return 1.0;
        });
    }

    /**
     * Get currency model by code.
     *
     * @param string $code
     * @return Currency|null
     */
    protected static function getCurrency(string $code): ?Currency
    {
        return Cache::remember("currency_model_{$code}", 86400, function () use ($code) {
            return Currency::where('code', $code)->first();
        });
    }
}
