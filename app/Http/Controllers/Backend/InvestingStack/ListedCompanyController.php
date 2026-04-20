<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\Currency;
use App\Models\State;
use App\Models\City;
use App\Models\InvestingStack\ListedCompany;
use App\Models\InvestingStack\Industry;
use App\Models\InvestingStack\SubIndustry;
use App\Models\InvestingStack\Exchange;
use App\Models\InvestingStack\CreditRating;
use App\Models\InvestingStack\MarketIndex;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ListedCompanyController extends Controller
{
    public function index(Request $request)
    {
        $query = ListedCompany::with(['country', 'reportingCurrency', 'industry', 'subIndustry', 'exchange', 'marketIndices'])
            ->orderBy('id', 'desc');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('legal_name_ar', 'like', "%{$search}%")
                    ->orWhere('legal_name_en', 'like', "%{$search}%")
                    ->orWhere('trade_name_ar', 'like', "%{$search}%")
                    ->orWhere('trade_name_en', 'like', "%{$search}%")
                    ->orWhere('company_code', 'like', "%{$search}%")
                    ->orWhere('ticker_symbol', 'like', "%{$search}%");
            });
        }

        if ($request->filled('internal_rating')) {
            $query->where('internal_rating', $request->internal_rating);
        }

        if ($request->filled('country')) {
            $country = $request->country;
            $query->whereHas('country', function ($q) use ($country) {
                $q->where('name_en', $country)
                    ->orWhere('name_ar', $country)
                    ->orWhere('name', $country);
            });
        }

        if ($request->filled('market_index')) {
            $indexName = $request->market_index;
            $query->whereHas('marketIndices', function ($q) use ($indexName) {
                $q->where('name', $indexName);
            });
        }

        $companies = $query->paginate(15)->withQueryString();

        return Inertia::render('Backend/InvestingStack/ListedCompanies', [
            'companies' => $companies,
            'filters' => $request->only(['search', 'internal_rating', 'country', 'market_index']),
            'countries' => Country::select('id', 'name_en as name', 'code')->get(),
            'currencies' => Currency::select('id', 'name', 'code')->get(),
            'industries' => Industry::select('id', 'industry_name_en as name', 'parent_industry_id as sector_id')->get(),
            'subIndustries' => SubIndustry::select('id', 'sub_industry_name_en as name', 'industry_id')->get(),
            'exchanges' => Exchange::select('id', 'name_en as name', 'code')->get(),
            'marketIndices' => MarketIndex::select('id', 'name')->get(),
            'creditRatings' => CreditRating::select('id', 'rating_symbol as name', 'rating_description_en as agency_name')->get(),
            'states' => State::select('id', 'name_en as name', 'country_id')->get(),
            'cities' => City::select('id', 'name', 'country_id')->get(),
            'stats' => [
                'total' => ListedCompany::count(),
                'active' => ListedCompany::where('status', 'active')->count(),
                'inactive' => ListedCompany::where('status', '!=', 'active')->count(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_code' => 'required|string|max:50|unique:companies_shares,company_code',
            'tax_id' => 'nullable|string|max:50',
            'commercial_registration' => 'nullable|string|max:100',
            'legal_form' => 'required|in:llc,joint_stock,partnership,sole_proprietorship,branch,subsidiary,government,non_profit',
            'legal_name_ar' => 'required|string|max:200',
            'legal_name_en' => 'nullable|string|max:200',
            'trade_name_ar' => 'nullable|string|max:200',
            'trade_name_en' => 'nullable|string|max:200',
            'industry_id' => 'nullable|exists:industries,id',
            'sub_industry_id' => 'nullable|exists:sub_industries,id',
            'company_size' => 'required|in:micro,small,medium,large,enterprise',
            'country_id' => 'required|exists:countries,id',
            'state_id' => 'nullable|exists:states,id',
            'city_id' => 'nullable|exists:cities,id',
            'address_ar' => 'nullable|string|max:500',
            'address_en' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'website' => 'nullable|url|max:500',
            'ceo_name_ar' => 'nullable|string|max:200',
            'ceo_name_en' => 'nullable|string|max:200',
            'chairman_name_ar' => 'nullable|string|max:200',
            'chairman_name_en' => 'nullable|string|max:200',
            'reporting_currency_id' => 'nullable|exists:currencies,id',
            'paid_up_capital' => 'nullable|numeric',
            'authorized_capital' => 'nullable|numeric',
            'annual_revenue' => 'nullable|numeric',
            'exchange_id' => 'nullable|exists:exchanges,id',
            'ticker_symbol' => 'nullable|string|max:20',
            'isin_code' => 'nullable|string|max:20',
            'market_index_ids' => 'nullable|array',
            'market_index_ids.*' => 'exists:market_indices,id',
            'ipo_date' => 'nullable|date',
            'market_cap' => 'nullable|numeric',
            'credit_rating_id' => 'nullable|exists:credit_ratings,id',
            'credit_score' => 'nullable|integer',
            'rating_outlook' => 'required|in:positive,stable,negative,watch',
            'status' => 'required|in:active,inactive,suspended,bankrupt,dissolved',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'internal_rating' => 'required|in:A,B,C,D',
        ]);

        \DB::transaction(function () use ($validated) {
            $company = ListedCompany::create($validated);
            if (isset($validated['market_index_ids'])) {
                $company->marketIndices()->sync($validated['market_index_ids']);
            }
        });

        return redirect()->back()->with('success', 'Company created successfully.');
    }

    public function update(Request $request, $id)
    {
        $company = ListedCompany::findOrFail($id);

        $validated = $request->validate([
            'company_code' => 'required|string|max:50|unique:companies_shares,company_code,'.$id,
            'tax_id' => 'nullable|string|max:50',
            'commercial_registration' => 'nullable|string|max:100',
            'legal_form' => 'required|in:llc,joint_stock,partnership,sole_proprietorship,branch,subsidiary,government,non_profit',
            'legal_name_ar' => 'required|string|max:200',
            'legal_name_en' => 'nullable|string|max:200',
            'trade_name_ar' => 'nullable|string|max:200',
            'trade_name_en' => 'nullable|string|max:200',
            'industry_id' => 'nullable|exists:industries,id',
            'sub_industry_id' => 'nullable|exists:sub_industries,id',
            'company_size' => 'required|in:micro,small,medium,large,enterprise',
            'country_id' => 'required|exists:countries,id',
            'state_id' => 'nullable|exists:states,id',
            'city_id' => 'nullable|exists:cities,id',
            'address_ar' => 'nullable|string|max:500',
            'address_en' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'website' => 'nullable|url|max:500',
            'ceo_name_ar' => 'nullable|string|max:200',
            'ceo_name_en' => 'nullable|string|max:200',
            'chairman_name_ar' => 'nullable|string|max:200',
            'chairman_name_en' => 'nullable|string|max:200',
            'reporting_currency_id' => 'nullable|exists:currencies,id',
            'paid_up_capital' => 'nullable|numeric',
            'authorized_capital' => 'nullable|numeric',
            'annual_revenue' => 'nullable|numeric',
            'exchange_id' => 'nullable|exists:exchanges,id',
            'ticker_symbol' => 'nullable|string|max:20',
            'isin_code' => 'nullable|string|max:20',
            'market_index_ids' => 'nullable|array',
            'market_index_ids.*' => 'exists:market_indices,id',
            'ipo_date' => 'nullable|date',
            'market_cap' => 'nullable|numeric',
            'credit_rating_id' => 'nullable|exists:credit_ratings,id',
            'credit_score' => 'nullable|integer',
            'rating_outlook' => 'required|in:positive,stable,negative,watch',
            'status' => 'required|in:active,inactive,suspended,bankrupt,dissolved',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'internal_rating' => 'required|in:A,B,C,D',
        ]);

        \DB::transaction(function () use ($company, $validated) {
            $company->update($validated);
            if (isset($validated['market_index_ids'])) {
                $company->marketIndices()->sync($validated['market_index_ids']);
            } else {
                $company->marketIndices()->sync([]);
            }
        });

        return redirect()->back()->with('success', 'Company updated successfully.');
    }

    public function destroy($id)
    {
        ListedCompany::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Company deleted successfully.');
    }
}
