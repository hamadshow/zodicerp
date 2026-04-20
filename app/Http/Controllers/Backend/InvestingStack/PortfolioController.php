<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\Portfolio;
use App\Models\InvestingStack\MarketPrice;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class PortfolioController extends Controller
{
    public function index(Request $request)
    {
        // Update portfolio with last prices from market_prices before showing
        $this->updateLastPrices();

        $portfolio = Portfolio::with('stock')
            ->orderBy('profit', 'desc')
            ->get()
            ->map(function ($item) {
                $marketValue = $item->quantity * $item->last_price;
                $costValue = $item->quantity * $item->avg_price;
                $item->market_value = number_format($marketValue, 2);
                $item->cost_value = number_format($costValue, 2);
                $item->profit_pct = $costValue > 0 ? (($marketValue - $costValue) / $costValue) * 100 : 0;
                return $item;
            });

        return Inertia::render('Backend/InvestingStack/portfolio', [
            'portfolio' => $portfolio,
        ]);
    }

    private function updateLastPrices()
    {
        // Subquery to get the latest price for each stock from market_prices
        $latestPrices = DB::table('market_prices')
            ->select('instrument_id', 'last_price')
            ->whereIn('id', function ($query) {
                $query->select(DB::raw('MAX(id)'))
                    ->from('market_prices')
                    ->groupBy('instrument_id');
            })
            ->get()
            ->pluck('last_price', 'instrument_id');

        $portfolios = Portfolio::all();

        foreach ($portfolios as $p) {
            if (isset($latestPrices[$p->stock_id])) {
                $lastPrice = $latestPrices[$p->stock_id];
                $p->last_price = $lastPrice;
                $p->profit = ($lastPrice - $p->avg_price) * $p->quantity;
                $p->save();
            }
        }
    }

    /**
     * Rebuild portfolio from all buy/sell transactions
     * This can be called manually or triggered after transactions
     */
    public function rebuild()
    {
        // Logic to rebuild from BuyShareItem and SellShareItem
        // 1. Get all unique stocks from transactions
        // 2. Calculate net quantity and weighted average price
        // 3. Update or Create Portfolio entries
        
        return redirect()->back()->with('success', 'Portfolio rebuilt successfully.');
    }
}
