<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\Industry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class IndustryController extends Controller
{
    public function index(Request $request)
    {
        $query = Industry::with(['parent'])
            ->withCount('subIndustries');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('industry_name_en', 'like', "%{$search}%")
                  ->orWhere('industry_name_ar', 'like', "%{$search}%")
                  ->orWhere('industry_code', 'like', "%{$search}%");
            });
        }

        $industries = $query->orderBy('display_order')
            ->orderBy('industry_name_en')
            ->get();
        
        // Fetch potential parents (industries) for dropdown
        $parentIndustries = Industry::where('is_active', true)->select('id', 'industry_name_en', 'industry_name_ar')->get();

        if ($request->wantsJson()) {
            return response()->json([
                'industries' => $industries,
                'parents' => $parentIndustries,
            ]);
        }

        return Inertia::render('Backend/InvestingStack/industries', [
            'industries' => $industries,
            'parents' => $parentIndustries,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'industry_code' => 'required|string|max:50|unique:industries,industry_code',
            'gics_industry_code' => 'nullable|string|max:10',
            'trbc_industry_code' => 'nullable|string|max:10',
            'industry_name_ar' => 'required|string|max:200',
            'industry_name_en' => 'required|string|max:200',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'parent_industry_id' => 'nullable|exists:industries,id',
            'capital_intensity' => 'required|in:high,medium,low',
            'cyclicality' => 'required|in:cyclical,defensive,growth,speculative',
            'regulatory_environment' => 'required|in:highly_regulated,moderately_regulated,lightly_regulated',
            'average_profit_margin' => 'nullable|numeric',
            'average_roa' => 'nullable|numeric',
            'average_roe' => 'nullable|numeric',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ]);

        // Auto-generate code if not provided (though validation requires it, usually frontend handles or we generate here)
        // If frontend sends it, we use it.

        Industry::create($validated);

        return redirect()->back()->with('success', 'Industry created successfully.');
    }

    public function update(Request $request, Industry $industry)
    {
        $validated = $request->validate([
            'industry_code' => 'required|string|max:50|unique:industries,industry_code,' . $industry->id,
            'gics_industry_code' => 'nullable|string|max:10',
            'trbc_industry_code' => 'nullable|string|max:10',
            'industry_name_ar' => 'required|string|max:200',
            'industry_name_en' => 'required|string|max:200',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'parent_industry_id' => 'nullable|exists:industries,id',
            'capital_intensity' => 'required|in:high,medium,low',
            'cyclicality' => 'required|in:cyclical,defensive,growth,speculative',
            'regulatory_environment' => 'required|in:highly_regulated,moderately_regulated,lightly_regulated',
            'average_profit_margin' => 'nullable|numeric',
            'average_roa' => 'nullable|numeric',
            'average_roe' => 'nullable|numeric',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ]);

        $industry->update($validated);

        return redirect()->back()->with('success', 'Industry updated successfully.');
    }

    public function destroy(Industry $industry)
    {
        $industry->delete();
        return redirect()->back()->with('success', 'Industry deleted successfully.');
    }
}
