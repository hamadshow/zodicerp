<?php

namespace App\Http\Controllers\Backend\Taxes;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Taxes\TaxType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaxTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $taxTypes = TaxType::with('country')->get();
        $countries = Location::where('location_type', 'country')->get();

        return Inertia::render('Backend/09-Taxes/TaxType', [
            'taxTypes' => $taxTypes,
            'countries' => $countries,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        // Handled by modal in index
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:tax_types,code',
            'name_ar' => 'required|string',
            'name_en' => 'required|string',
            'tax_category' => 'required|in:sales,purchase,income,withholding,excise,customs,property,other',
            'tax_level' => 'required|in:federal,state,provincial,county,city,municipal,special',
            'tax_system_code' => 'nullable|string',
            'country_id' => 'required|exists:locations,id',
            'legal_reference' => 'nullable|string',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'is_recoverable' => 'boolean',
            'is_withholding' => 'boolean',
            'is_compound' => 'boolean',
            'is_active' => 'boolean',
        ]);

        TaxType::create($validated);

        return redirect()->back()->with('success', 'Tax Type created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        // Handled by modal in index
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TaxType $type)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:tax_types,code,'.$type->id,
            'name_ar' => 'required|string',
            'name_en' => 'required|string',
            'tax_category' => 'required|in:sales,purchase,income,withholding,excise,customs,property,other',
            'tax_level' => 'required|in:federal,state,provincial,county,city,municipal,special',
            'tax_system_code' => 'nullable|string',
            'country_id' => 'required|exists:locations,id',
            'legal_reference' => 'nullable|string',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'is_recoverable' => 'boolean',
            'is_withholding' => 'boolean',
            'is_compound' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $type->update($validated);

        return redirect()->back()->with('success', 'Tax Type updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TaxType $type)
    {
        $type->delete();

        return redirect()->back()->with('success', 'Tax Type deleted successfully.');
    }
}
