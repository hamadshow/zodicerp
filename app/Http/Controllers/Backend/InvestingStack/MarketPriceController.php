<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\ListedCompany;
use App\Models\InvestingStack\MarketPrice;
use App\Models\InvestingStack\MarketPriceSyncLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

use App\Models\InvestingStack\MarketPriceDetail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MarketPriceController extends Controller
{
    public function syncPrice(Request $request)
    {
        $symbol = $request->query('symbol');
        
        if (!$symbol) {
            return response()->json(['status' => 'error', 'message' => 'Symbol is required'], 400);
        }

        try {
            $apiKey = config('services.twelvedata.key', 'demo'); 
            $response = Http::get("https://api.twelvedata.com/quote", [
                'symbol' => $symbol,
                'apikey' => $apiKey
            ]);

            $data = $response->json();

            if ($response->successful() && !isset($data['code'])) {
                $result = [
                    'bid_price' => $data['bid'] ?? $data['close'] ?? 0,
                    'ask_price' => $data['ask'] ?? $data['close'] ?? 0,
                    'last_price' => $data['close'] ?? 0,
                    'open_price' => $data['open'] ?? 0,
                    'high_price' => $data['high'] ?? 0,
                    'low_price' => $data['low'] ?? 0,
                    'volume' => $data['volume'] ?? 0,
                    'change_amount' => $data['change'] ?? 0,
                    'change_percent' => $data['percent_change'] ?? 0,
                    'data_source' => 'TwelveData'
                ];

                MarketPriceSyncLog::create([
                    'symbol' => $symbol,
                    'status' => 'success',
                    'message' => 'Synced from TwelveData',
                    'response_data' => $data
                ]);

                return response()->json($result);
            }

            // Fallback to last stored price if API fails
            // Redesigned lookup: Find master then get latest detail
            $lastPriceMaster = MarketPrice::whereHas('instrument', function ($q) use ($symbol) {
                $q->where('ticker_symbol', $symbol);
            })->orderBy('price_date', 'desc')->first();

            if ($lastPriceMaster) {
                $lastDetail = $lastPriceMaster->details()->orderBy('price_timestamp', 'desc')->first();
                
                if ($lastDetail) {
                    $result = [
                        'bid_price' => $lastDetail->bid_price,
                        'ask_price' => $lastDetail->ask_price,
                        'last_price' => $lastDetail->last_price,
                        'open_price' => $lastDetail->open_price,
                        'high_price' => $lastDetail->high_price,
                        'low_price' => $lastDetail->low_price,
                        'volume' => $lastDetail->volume,
                        'change_amount' => $lastDetail->change_amount,
                        'change_percent' => $lastDetail->change_percent,
                        'data_source' => 'Database Fallback'
                    ];

                    MarketPriceSyncLog::create([
                        'symbol' => $symbol,
                        'status' => 'fallback',
                        'message' => 'API failed, using database fallback: ' . ($data['message'] ?? 'Unknown error'),
                        'response_data' => $data
                    ]);

                    return response()->json($result);
                }
            }

            throw new \Exception($data['message'] ?? 'API failed and no fallback available');

        } catch (\Exception $e) {
            MarketPriceSyncLog::create([
                'symbol' => $symbol,
                'status' => 'error',
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        // Get unique master records (one per instrument)
        $query = MarketPrice::with(['instrument', 'details' => function($q) {
            $q->orderBy('price_timestamp', 'desc');
        }]);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('instrument', function ($q) use ($search) {
                $q->where('legal_name_ar', 'like', "%{$search}%")
                    ->orWhere('legal_name_en', 'like', "%{$search}%")
                    ->orWhere('company_code', 'like', "%{$search}%")
                    ->orWhere('ticker_symbol', 'like', "%{$search}%");
            });
        }

        $marketPrices = $query->paginate(15)->withQueryString();

        // Transform to show latest info in the main table
        $marketPrices->getCollection()->transform(function ($master) {
            $latest = $master->details->first();
            if ($latest) {
                $master->last_price = $latest->last_price;
                $master->change_percent = $latest->change_percent;
                $master->volume = $latest->volume;
                $master->price_date = $latest->price_date->format('Y-m-d');
                $master->price_time = $latest->price_time;
            }
            return $master;
        });

        $companies = ListedCompany::select('id', 'company_code', 'ticker_symbol', 'legal_name_ar', 'legal_name_en')->get();

        return Inertia::render('Backend/InvestingStack/MarketPrices', [
            'marketPrices' => $marketPrices,
            'companies' => $companies,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'instrument_id' => 'required|exists:companies_shares,id',
            'price_date' => 'required|date',
            'data_source' => 'nullable|string|max:100',
            'is_eod' => 'boolean',
            'is_intraday' => 'boolean',
            
            // Detail data
            'price_time' => 'required',
            'price_timestamp' => 'required|date',
            'bid_price' => 'nullable|numeric',
            'ask_price' => 'nullable|numeric',
            'last_price' => 'nullable|numeric',
            'open_price' => 'nullable|numeric',
            'high_price' => 'nullable|numeric',
            'low_price' => 'nullable|numeric',
            'close_price' => 'nullable|numeric',
            'bid_volume' => 'nullable|numeric',
            'ask_volume' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'change_amount' => 'nullable|numeric',
            'change_percent' => 'nullable|numeric',
        ]);

        DB::transaction(function () use ($validated) {
            // Logic: ONE master record per instrument.
            // If the company exists, we reuse the master record and just add details.
            $master = MarketPrice::firstOrCreate(
                [
                    'instrument_id' => $validated['instrument_id'],
                    'company_id' => Auth::user()->company_id ?? 1,
                ],
                [
                    'data_source' => $validated['data_source'],
                    'is_eod' => $validated['is_eod'] ?? false,
                    'is_intraday' => $validated['is_intraday'] ?? true,
                ]
            );

            // Always create a new detail record (The history)
            $master->details()->create([
                'price_date' => $validated['price_date'],
                'price_time' => $validated['price_time'],
                'price_timestamp' => $validated['price_timestamp'],
                'bid_price' => $validated['bid_price'],
                'ask_price' => $validated['ask_price'],
                'last_price' => $validated['last_price'],
                'open_price' => $validated['open_price'],
                'high_price' => $validated['high_price'],
                'low_price' => $validated['low_price'],
                'close_price' => $validated['close_price'],
                'bid_volume' => $validated['bid_volume'],
                'ask_volume' => $validated['ask_volume'],
                'volume' => $validated['volume'],
                'change_amount' => $validated['change_amount'],
                'change_percent' => $validated['change_percent'],
            ]);
        });

        return redirect()->back()->with('success', 'Market Price recorded successfully.');
    }

    public function update(Request $request, MarketPrice $marketPrice)
    {
        // Update logic for redesigned structure:
        // Usually, we update the master record flags or data source.
        // If we want to update the "latest" detail, we handle it here.
        
        $validated = $request->validate([
            'data_source' => 'nullable|string|max:100',
            'is_eod' => 'boolean',
            'is_intraday' => 'boolean',
            'price_date' => 'required|date',
            
            // Allow updating the latest detail if needed
            'bid_price' => 'nullable|numeric',
            'ask_price' => 'nullable|numeric',
            'last_price' => 'nullable|numeric',
            // ... add others as needed
        ]);

        DB::transaction(function () use ($validated, $marketPrice) {
            $marketPrice->update([
                'data_source' => $validated['data_source'] ?? $marketPrice->data_source,
                'is_eod' => $validated['is_eod'] ?? $marketPrice->is_eod,
                'is_intraday' => $validated['is_intraday'] ?? $marketPrice->is_intraday,
            ]);

            // Update the latest detail record for this master
            $latestDetail = $marketPrice->details()->orderBy('price_timestamp', 'desc')->first();
            if ($latestDetail) {
                $latestDetail->update(array_intersect_key($validated, array_flip([
                    'price_date', 'bid_price', 'ask_price', 'last_price', 'open_price', 'high_price', 'low_price', 'close_price',
                    'bid_volume', 'ask_volume', 'volume', 'change_amount', 'change_percent'
                ])));
            }
        });

        return redirect()->back()->with('success', 'Market Price updated successfully.');
    }

    public function destroy(MarketPrice $marketPrice)
    {
        $marketPrice->delete();

        return redirect()->back()->with('success', 'Market Price deleted successfully.');
    }

    public function updateDetail(Request $request, MarketPriceDetail $detail)
    {
        $validated = $request->validate([
            'price_date' => 'required|date',
            'price_time' => 'required',
            'bid_price' => 'nullable|numeric',
            'ask_price' => 'nullable|numeric',
            'last_price' => 'nullable|numeric',
            'open_price' => 'nullable|numeric',
            'high_price' => 'nullable|numeric',
            'low_price' => 'nullable|numeric',
            'close_price' => 'nullable|numeric',
            'bid_volume' => 'nullable|numeric',
            'ask_volume' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'change_amount' => 'nullable|numeric',
            'change_percent' => 'nullable|numeric',
        ]);

        $detail->update($validated);

        return redirect()->back()->with('success', 'Detail record updated successfully.');
    }

    public function destroyDetail(MarketPriceDetail $detail)
    {
        $detail->delete();

        return redirect()->back()->with('success', 'Detail record deleted successfully.');
    }
}
