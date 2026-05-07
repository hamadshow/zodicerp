<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\BuyShare;
use App\Models\Currency;
use App\Models\InvestingStack\ListedCompany;
use App\Models\InvestingStack\Portfolio;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BuyShareController extends Controller
{
    public function index(Request $request)
    {
        $query = BuyShare::with(['currency', 'items']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('stock_symbol', 'like', "%{$search}%")
                ->orWhere('company_name', 'like', "%{$search}%")
                ->orWhereHas('items', function($q) use ($search) {
                    $q->where('stock_symbol', 'like', "%{$search}%")
                      ->orWhere('company_name', 'like', "%{$search}%");
                });
        }

        $buyShares = $query->orderBy('purchase_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        $currencies = Currency::select('id', 'name', 'code')->get();
        $companies = ListedCompany::select('id', 'company_code', 'ticker_symbol', 'legal_name_ar', 'legal_name_en')->get();

        return Inertia::render('Backend/InvestingStack/BuyShares', [
            'buyShares' => $buyShares,
            'currencies' => $currencies,
            'companies' => $companies,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_date' => 'required|date',
            'currency_id' => 'nullable|exists:currencies,id',
            'notes' => 'nullable|string',
            'commission' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'grand_total' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.stock_symbol' => 'required|string|max:20',
            'items.*.company_name' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price_per_share' => 'required|numeric|min:0',
            'items.*.total_amount' => 'required|numeric|min:0',
        ]);

        $buyShare = BuyShare::create([
            'purchase_date' => $validated['purchase_date'],
            'currency_id' => $validated['currency_id'],
            'notes' => $validated['notes'],
            'commission' => $validated['commission'] ?? 0,
            'tax_total' => $validated['tax_total'] ?? 0,
            'grand_total' => $validated['grand_total'],
            // Store first item's details for backward compatibility/listing
            'stock_symbol' => $validated['items'][0]['stock_symbol'],
            'company_name' => $validated['items'][0]['company_name'],
            'price_per_share' => $validated['items'][0]['price_per_share'],
            'quantity' => collect($validated['items'])->sum('quantity'),
            'total_amount' => collect($validated['items'])->sum('total_amount'),
        ]);

        foreach ($validated['items'] as $item) {
            $buyShare->items()->create($item);
        }

        // Update portfolio for each stock purchased (recalculate completely)
        $stockIds = collect($validated['items'])->map(function ($item) {
            $stock = ListedCompany::where('ticker_symbol', $item['stock_symbol'])->first();
            return $stock ? $stock->id : null;
        })->filter()->unique()->toArray();

        foreach ($stockIds as $stockId) {
            $this->recalculatePortfolioForStock($stockId);
        }

        return redirect()->back()->with('success', 'Share purchase record created successfully.');
    }

    public function update(Request $request, BuyShare $buyShare)
    {
        $validated = $request->validate([
            'purchase_date' => 'required|date',
            'currency_id' => 'nullable|exists:currencies,id',
            'notes' => 'nullable|string',
            'commission' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'grand_total' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.stock_symbol' => 'required|string|max:20',
            'items.*.company_name' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price_per_share' => 'required|numeric|min:0',
            'items.*.total_amount' => 'required|numeric|min:0',
        ]);

        $buyShare->update([
            'purchase_date' => $validated['purchase_date'],
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

        $buyShare->items()->delete();
        foreach ($validated['items'] as $item) {
            $buyShare->items()->create($item);
        }

        // Update portfolio for each stock purchased (recalculate completely)
        $stockIds = collect($validated['items'])->map(function ($item) {
            $stock = ListedCompany::where('ticker_symbol', $item['stock_symbol'])->first();
            return $stock ? $stock->id : null;
        })->filter()->unique()->toArray();

        foreach ($stockIds as $stockId) {
            $this->recalculatePortfolioForStock($stockId);
        }

        return redirect()->back()->with('success', 'Share purchase record updated successfully.');
    }

    public function destroy(BuyShare $buyShare)
    {
        // Get the items before deleting to update portfolio
        $items = $buyShare->items->toArray();
        
        $buyShare->delete();

        // Update portfolio by subtracting the deleted quantities
        $this->updatePortfolioOnDelete($items);

        return redirect()->back()->with('success', 'Share purchase record deleted successfully.');
    }

    private function updatePortfolioOnDelete(array $deletedItems)
    {
        foreach ($deletedItems as $deletedItem) {
            // Find the stock by ticker symbol
            $stock = ListedCompany::where('ticker_symbol', $deletedItem['stock_symbol'])->first();

            if (!$stock) {
                continue; // Skip if stock not found
            }

            // Recalculate portfolio for this stock based on all remaining buy transactions
            $this->recalculatePortfolioForStock($stock->id);
        }
    }

    private function recalculatePortfolioForStock($stockId)
    {
        // Get the stock ticker symbol
        $stock = ListedCompany::find($stockId);
        if (!$stock) {
            return;
        }

        // Get all remaining buy share items for this stock
        $remainingItems = \DB::table('buy_share_items')
            ->where('stock_symbol', $stock->ticker_symbol)
            ->select('quantity', 'price_per_share')
            ->get();

        $portfolio = Portfolio::where('stock_id', $stockId)->first();

        if ($remainingItems->count() > 0) {
            // Calculate new totals
            $totalQuantity = $remainingItems->sum('quantity');
            $totalCost = $remainingItems->sum(function ($item) {
                return $item->quantity * $item->price_per_share;
            });
            $avgPrice = $totalQuantity > 0 ? $totalCost / $totalQuantity : 0;

            if ($portfolio) {
                $portfolio->update([
                    'quantity' => $totalQuantity,
                    'avg_price' => $avgPrice,
                ]);
            } else {
                // This shouldn't happen, but just in case
                Portfolio::create([
                    'stock_id' => $stockId,
                    'quantity' => $totalQuantity,
                    'avg_price' => $avgPrice,
                    'last_price' => $avgPrice,
                    'profit' => 0,
                ]);
            }
        } else {
            // No remaining shares, delete portfolio entry
            if ($portfolio) {
                $portfolio->delete();
            }
        }
    }
}
