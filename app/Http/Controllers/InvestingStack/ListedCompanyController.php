<?php

namespace App\Http\Controllers\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\ListedCompany;
use App\Models\Country;
use App\Models\Currency;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ListedCompanyController extends Controller
{
    public function index(Request $request)
    {
        $query = ListedCompany::with(['country', 'reportingCurrency'])
            ->orderBy('id', 'desc');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('legal_name_ar', 'like', "%{$search}%")
                  ->orWhere('legal_name_en', 'like', "%{$search}%")
                  ->orWhere('company_code', 'like', "%{$search}%")
                  ->orWhere('ticker_symbol', 'like', "%{$search}%");
            });
        }

        $companies = $query->paginate(15)->withQueryString();
        
        return Inertia::render('Backend/InvestingStack/ListedCompanies', [
            'companies' => $companies,
            'filters' => $request->only(['search']),
            'countries' => Country::select('id', 'name_en as name', 'code')->get(),
            'currencies' => Currency::select('id', 'name', 'code')->get(),
            // 'sectors' => Sector::all(), // Uncomment when Sector model is ready
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_code' => 'required|unique:companies,company_code',
            'legal_name_ar' => 'required|string|max:200',
            'country_id' => 'required|exists:countries,id',
            'status' => 'required|in:active,inactive,suspended,bankrupt,dissolved',
            // Add other validations as needed
        ]);

        ListedCompany::create($request->all());

        return redirect()->back()->with('success', 'Company created successfully.');
    }

    public function update(Request $request, $id)
    {
        $company = ListedCompany::findOrFail($id);
        
        $validated = $request->validate([
            'company_code' => 'required|unique:companies,company_code,' . $id,
            'legal_name_ar' => 'required|string|max:200',
            'country_id' => 'required|exists:countries,id',
            'status' => 'required|in:active,inactive,suspended,bankrupt,dissolved',
        ]);

        $company->update($request->all());

        return redirect()->back()->with('success', 'Company updated successfully.');
    }

    public function destroy($id)
    {
        ListedCompany::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Company deleted successfully.');
    }
}
