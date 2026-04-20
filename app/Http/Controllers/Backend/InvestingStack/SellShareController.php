<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\SellShare;
use App\Models\InvestingStack\SellShareItem;
use App\Models\InvestingStack\ListedCompany;
use App\Models\Currency;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SellShareController extends Controller
{
    public function index(Request $request)
    {
        $query = SellShare::with(['currency', 'items']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('stock_symbol', 'like', "%{$search}%")
                ->orWhere('company_name', 'like', "%{$search}%")
                ->orWhereHas('items', function($q) use ($search) {
                    $q->where('stock_symbol', 'like', "%{$search}%")
                      ->orWhere('company_name', 'like', "%{$search}%");
                });
        }

        $sellShares = $query->orderBy('sell_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        $currencies = Currency::select('id', 'name', 'code')->get();
        $companies = ListedCompany::select('id', 'company_code', 'ticker_symbol', 'legal_name_ar', 'legal_name_en')->get();
        
        $portfolio = \App\Models\InvestingStack\Portfolio::with('stock')
            ->where('quantity', '>', 0)
            ->get();

        return Inertia::render('Backend/InvestingStack/SellShares', [
            'sellShares' => $sellShares,
            'currencies' => $currencies,
            'companies' => $companies,
            'portfolio' => $portfolio,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sell_date' => 'required|date',
            'currency_id' => 'nullable|exists:currencies,id',
            'notes' => 'nullable|string',
            'commission' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'grand_total' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.stock_id' => 'required|exists:companies_shares,id',
            'items.*.stock_symbol' => 'required|string|max:20',
            'items.*.company_name' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.price_per_share' => 'required|numeric|min:0',
            'items.*.total_amount' => 'required|numeric|min:0',
        ]);

        // Validate quantities against portfolio
        foreach ($validated['items'] as $item) {
            $portfolio = \App\Models\InvestingStack\Portfolio::where('stock_id', $item['stock_id'])->first();
            if (!$portfolio || $portfolio->quantity < $item['quantity']) {
                $stockName = $item['company_name'] ?? $item['stock_symbol'];
                $available = $portfolio ? $portfolio->quantity : 0;
                return redirect()->back()->withErrors([
                    'items' => "Insufficient quantity for {$stockName}. Available: {$available}, Requested: {$item['quantity']}"
                ]);
            }
        }

        $sellShare = SellShare::create([
            'sell_date' => $validated['sell_date'],
            'currency_id' => $validated['currency_id'],
            'notes' => $validated['notes'],
            'commission' => $validated['commission'] ?? 0,
            'tax_total' => $validated['tax_total'] ?? 0,
            'grand_total' => $validated['grand_total'],
            'stock_symbol' => $validated['items'][0]['stock_symbol'],
            'company_name' => $validated['items'][0]['company_name'],
            'price_per_share' => $validated['items'][0]['price_per_share'],
            'quantity' => collect($validated['items'])->sum('quantity'),
            'total_amount' => collect($validated['items'])->sum('total_amount'),
        ]);

        foreach ($validated['items'] as $item) {
            $sellShare->items()->create($item);
            
            // Update portfolio
            $portfolio = \App\Models\InvestingStack\Portfolio::where('stock_id', $item['stock_id'])->first();
            $portfolio->decrement('quantity', $item['quantity']);
        }

        return redirect()->back()->with('success', 'Share sale record created successfully.');
    }

    public function update(Request $request, SellShare $sellShare)
    {
        $validated = $request->validate([
            'sell_date' => 'required|date',
            'currency_id' => 'nullable|exists:currencies,id',
            'notes' => 'nullable|string',
            'commission' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'grand_total' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.stock_id' => 'required|exists:companies_shares,id',
            'items.*.stock_symbol' => 'required|string|max:20',
            'items.*.company_name' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.price_per_share' => 'required|numeric|min:0',
            'items.*.total_amount' => 'required|numeric|min:0',
        ]);

        // For update, we need to check the difference in quantity
        foreach ($validated['items'] as $item) {
            $oldItem = $sellShare->items()->where('stock_id', $item['stock_id'])->first();
            $oldQuantity = $oldItem ? $oldItem->quantity : 0;
            $diff = $item['quantity'] - $oldQuantity;

            if ($diff > 0) {
                $portfolio = \App\Models\InvestingStack\Portfolio::where('stock_id', $item['stock_id'])->first();
                if (!$portfolio || $portfolio->quantity < $diff) {
                    $stockName = $item['company_name'] ?? $item['stock_symbol'];
                    $available = $portfolio ? $portfolio->quantity + $oldQuantity : $oldQuantity;
                    return redirect()->back()->withErrors([
                        'items' => "Insufficient quantity for {$stockName}. Available: {$available}, Requested: {$item['quantity']}"
                    ]);
                }
            }
        }

        // Revert old quantities before updating
        foreach ($sellShare->items as $oldItem) {
            \App\Models\InvestingStack\Portfolio::where('stock_id', $oldItem->stock_id)
                ->increment('quantity', $oldItem->quantity);
        }

        $sellShare->update([
            'sell_date' => $validated['sell_date'],
            'currency_id' => $validated['currency_id'],
            'notes' => $validated['notes'],
            'commission' => $validated['commission'] ?? 0,
            'tax_total' => $validated['tax_total'] ?? 0,
            'grand_total' => $validated['grand_total'],
            'stock_symbol' => $validated['items'][0]['stock_symbol'],
            'company_name' => $validated['items'][0]['company_name'],
            'price_per_share' => $validated['items'][0]['price_per_share'],
            'quantity' => collect($validated['items'])->sum('quantity'),
            'total_amount' => collect($validated['items'])->sum('total_amount'),
        ]);

        $sellShare->items()->delete();
        foreach ($validated['items'] as $item) {
            $sellShare->items()->create($item);
            
            // Apply new quantities to portfolio
            \App\Models\InvestingStack\Portfolio::where('stock_id', $item['stock_id'])
                ->decrement('quantity', $item['quantity']);
        }

        return redirect()->back()->with('success', 'Share sale record updated successfully.');
    }

    public function destroy(SellShare $sellShare)
    {
        $sellShare->delete();
        return redirect()->back()->with('success', 'Share sale record deleted successfully.');
    }
}
