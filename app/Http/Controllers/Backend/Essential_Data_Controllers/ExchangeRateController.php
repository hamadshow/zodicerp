<?php

namespace App\Http\Controllers\Backend\Essential_Data_Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExchangeRate;
use App\Models\Currency;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;

class ExchangeRateController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $exchangeRates = ExchangeRate::with(['fromCurrency', 'toCurrency'])
            ->orderBy('rate_date', 'desc')
            ->get();
            
        $currencies = Currency::where('status', 'active')->get();

        return Inertia::render('Backend/01-Essential_Data/Exchange_rates', [
            'exchangeRates' => $exchangeRates,
            'currencies' => $currencies
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'rate_date' => 'required|date',
            'from_currency_id' => 'required|exists:currencies,id',
            'to_currency_id' => 'required|exists:currencies,id|different:from_currency_id',
            'rate' => 'required|numeric|min:0',
            'source' => 'nullable|string|max:255',
        ]);

        // Check if rate already exists for this pair and date
        $exists = ExchangeRate::where('rate_date', $validated['rate_date'])
            ->where('from_currency_id', $validated['from_currency_id'])
            ->where('to_currency_id', $validated['to_currency_id'])
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['rate_date' => 'An exchange rate for this currency pair on this date already exists.']);
        }

        ExchangeRate::create($validated);

        return redirect()->back()->with('success', 'Exchange rate created successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ExchangeRate $exchangeRate)
    {
        $validated = $request->validate([
            'rate_date' => 'required|date',
            'from_currency_id' => 'required|exists:currencies,id',
            'to_currency_id' => 'required|exists:currencies,id|different:from_currency_id',
            'rate' => 'required|numeric|min:0',
            'source' => 'nullable|string|max:255',
        ]);

        // Check if rate already exists for this pair and date (excluding current record)
        $exists = ExchangeRate::where('rate_date', $validated['rate_date'])
            ->where('from_currency_id', $validated['from_currency_id'])
            ->where('to_currency_id', $validated['to_currency_id'])
            ->where('id', '!=', $exchangeRate->id)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['rate_date' => 'An exchange rate for this currency pair on this date already exists.']);
        }

        $exchangeRate->update($validated);

        return redirect()->back()->with('success', 'Exchange rate updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ExchangeRate $exchangeRate)
    {
        $exchangeRate->delete();

        return redirect()->back()->with('success', 'Exchange rate deleted successfully.');
    }

    /**
     * Fetch latest rates from external API.
     */
    public function fetchRates(Request $request)
    {
        $baseCurrency = Currency::where('is_base', true)->first();
        
        if (!$baseCurrency) {
            // Fallback: Try to find USD or first active currency if no base is set
            $baseCurrency = Currency::where('code', 'USD')->first() 
                         ?? Currency::where('status', 'active')->first();
                         
            if (!$baseCurrency) {
                return redirect()->back()->withErrors(['message' => 'No base currency found. Please create currencies first.']);
            }
        }

        $normalize = function (?string $code): string {
            $code = strtoupper((string) $code);
            return match ($code) {
                'EGY' => 'EGP',
                'USA', 'US', 'USD$', '$' => 'USD',
                'EURO' => 'EUR',
                default => $code,
            };
        };
        $baseCode = $normalize($baseCurrency->code);

        try {
            $response = Http::timeout(20)->acceptJson()->get('https://api.exchangerate.host/latest', [
                'base' => $baseCode,
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                $rates = (is_array($data) && is_array($data['rates'] ?? null)) ? $data['rates'] : [];
                $date = now()->format('Y-m-d');
                
                $activeCurrencies = Currency::where('status', 'active')
                    ->where('id', '!=', $baseCurrency->id)
                    ->get();

                $count = 0;

                foreach ($activeCurrencies as $currency) {
                    $apiCode = $normalize($currency->code);
                    if (isset($rates[$apiCode])) {
                        $rateValue = (float) $rates[$apiCode];
                        
                        // Check if rate already exists for today
                        $existing = ExchangeRate::where('rate_date', $date)
                            ->where('from_currency_id', $baseCurrency->id)
                            ->where('to_currency_id', $currency->id)
                            ->first();
                            
                        if ($existing) {
                            $existing->update([
                                'rate' => $rateValue,
                                'source' => 'API: exchangerate.host'
                            ]);
                        } else {
                            ExchangeRate::create([
                                'rate_date' => $date,
                                'from_currency_id' => $baseCurrency->id,
                                'to_currency_id' => $currency->id,
                                'rate' => $rateValue,
                                'source' => 'API: exchangerate.host'
                            ]);
                        }
                        $count++;
                    }
                }

                return redirect()->back()->with('success', "Successfully fetched and updated {$count} exchange rates (Base: {$baseCurrency->code}).");
            } else {
                $fallback = Http::withOptions(['verify' => false])->timeout(20)->acceptJson()->get('https://api.exchangerate.host/latest', [
                    'base' => $baseCode,
                ]);
                if ($fallback->successful()) {
                    $data = $fallback->json();
                    $rates = (is_array($data) && is_array($data['rates'] ?? null)) ? $data['rates'] : [];
                    $date = now()->format('Y-m-d');
                    $activeCurrencies = Currency::where('status', 'active')
                        ->where('id', '!=', $baseCurrency->id)
                        ->get();
                    $count = 0;
                    foreach ($activeCurrencies as $currency) {
                        $apiCode = $normalize($currency->code);
                        if (isset($rates[$apiCode])) {
                            $rateValue = (float) $rates[$apiCode];
                            $existing = ExchangeRate::where('rate_date', $date)
                                ->where('from_currency_id', $baseCurrency->id)
                                ->where('to_currency_id', $currency->id)
                                ->first();
                            if ($existing) {
                                $existing->update([
                                    'rate' => $rateValue,
                                    'source' => 'API: exchangerate.host'
                                ]);
                            } else {
                                ExchangeRate::create([
                                    'rate_date' => $date,
                                    'from_currency_id' => $baseCurrency->id,
                                    'to_currency_id' => $currency->id,
                                    'rate' => $rateValue,
                                    'source' => 'API: exchangerate.host'
                                ]);
                            }
                            $count++;
                        }
                    }
                    return redirect()->back()->with('success', "Successfully fetched and updated {$count} exchange rates (Base: {$baseCurrency->code}).");
                }
                return redirect()->back()->withErrors(['message' => 'Failed to fetch rates from external API.']);
            }
        } catch (\Throwable $e) {
            try {
                $fallback = Http::withOptions(['verify' => false])->timeout(20)->acceptJson()->get('https://api.exchangerate.host/latest', [
                    'base' => $baseCode,
                ]);
                if ($fallback->successful()) {
                    $data = $fallback->json();
                    $rates = (is_array($data) && is_array($data['rates'] ?? null)) ? $data['rates'] : [];
                    $date = now()->format('Y-m-d');
                    $activeCurrencies = Currency::where('status', 'active')
                        ->where('id', '!=', $baseCurrency->id)
                        ->get();
                    $count = 0;
                    foreach ($activeCurrencies as $currency) {
                        $apiCode = $normalize($currency->code);
                        if (isset($rates[$apiCode])) {
                            $rateValue = (float) $rates[$apiCode];
                            $existing = ExchangeRate::where('rate_date', $date)
                                ->where('from_currency_id', $baseCurrency->id)
                                ->where('to_currency_id', $currency->id)
                                ->first();
                            if ($existing) {
                                $existing->update([
                                    'rate' => $rateValue,
                                    'source' => 'API: exchangerate.host'
                                ]);
                            } else {
                                ExchangeRate::create([
                                    'rate_date' => $date,
                                    'from_currency_id' => $baseCurrency->id,
                                    'to_currency_id' => $currency->id,
                                    'rate' => $rateValue,
                                    'source' => 'API: exchangerate.host'
                                ]);
                            }
                            $count++;
                        }
                    }
                    return redirect()->back()->with('success', "Successfully fetched and updated {$count} exchange rates (Base: {$baseCurrency->code}).");
                }
            } catch (\Throwable $t) {
            }
            return redirect()->back()->withErrors(['message' => 'Error fetching rates.']);
        }
    }
}
