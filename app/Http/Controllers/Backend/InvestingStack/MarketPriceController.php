<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\ListedCompany;
use App\Models\InvestingStack\MarketPrice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MarketPriceController extends Controller
{
    public function index(Request $request)
    {
        $query = MarketPrice::with('instrument');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('instrument', function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('company_code', 'like', "%{$search}%")
                    ->orWhere('legal_name_ar', 'like', "%{$search}%")
                    ->orWhere('legal_name_en', 'like', "%{$search}%");
            });
        }

        $marketPrices = $query->orderBy('price_date', 'desc')
            ->orderBy('price_time', 'desc')
            ->paginate(15)
            ->withQueryString();

        // For the form dropdown, we might need a list of companies.
        // If the list is huge, we should load it asynchronously or use a searchable select.
        // For now, let's load a limited set or all if reasonable.
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
            'bid_price' => 'required|numeric',
            'ask_price' => 'required|numeric',
            'last_price' => 'required|numeric',
            'open_price' => 'nullable|numeric',
            'high_price' => 'nullable|numeric',
            'low_price' => 'nullable|numeric',
            'close_price' => 'nullable|numeric',
            'price_date' => 'required|date',
            'price_time' => 'required',
            'price_timestamp' => 'required|date',
            'bid_volume' => 'nullable|numeric',
            'ask_volume' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'change_amount' => 'nullable|numeric',
            'change_percent' => 'nullable|numeric',
            'data_source' => 'nullable|string|max:100',
            'is_eod' => 'boolean',
            'is_intraday' => 'boolean',
        ]);

        MarketPrice::create($validated);

        return redirect()->back()->with('success', 'Market Price created successfully.');
    }

    public function update(Request $request, MarketPrice $marketPrice)
    {
        $validated = $request->validate([
            'instrument_id' => 'required|exists:companies_shares,id',
            'bid_price' => 'required|numeric',
            'ask_price' => 'required|numeric',
            'last_price' => 'required|numeric',
            'open_price' => 'nullable|numeric',
            'high_price' => 'nullable|numeric',
            'low_price' => 'nullable|numeric',
            'close_price' => 'nullable|numeric',
            'price_date' => 'required|date',
            'price_time' => 'required',
            'price_timestamp' => 'required|date',
            'bid_volume' => 'nullable|numeric',
            'ask_volume' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'change_amount' => 'nullable|numeric',
            'change_percent' => 'nullable|numeric',
            'data_source' => 'nullable|string|max:100',
            'is_eod' => 'boolean',
            'is_intraday' => 'boolean',
        ]);

        $marketPrice->update($validated);

        return redirect()->back()->with('success', 'Market Price updated successfully.');
    }

    public function destroy(MarketPrice $marketPrice)
    {
        $marketPrice->delete();

        return redirect()->back()->with('success', 'Market Price deleted successfully.');
    }
}
