<?php

namespace App\Http\Controllers\Backend\Essential_Data_Controllers;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class CurrencyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $currencies = Currency::latest()->get();
        return Inertia::render('Backend/01-Essential_Data/Currencies', [
            'currencies' => $currencies
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:3|unique:currencies,code',
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'decimal_places' => 'required|integer|min:0|max:8',
            'format' => 'nullable|string',
            'is_base' => 'boolean',
            'status' => 'required|in:active,inactive,archived',
        ]);

        DB::transaction(function () use ($validated) {
            if (!empty($validated['is_base']) && $validated['is_base']) {
                // Unset other base currencies
                Currency::where('is_base', true)->update(['is_base' => false]);
            }

            $validated['created_by'] = auth()->id();
            Currency::create($validated);
        });

        return redirect()->back()->with('success', 'Currency created successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Currency $currency)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:3|unique:currencies,code,' . $currency->id,
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'decimal_places' => 'required|integer|min:0|max:8',
            'format' => 'nullable|string',
            'is_base' => 'boolean',
            'status' => 'required|in:active,inactive,archived',
        ]);

        DB::transaction(function () use ($validated, $currency) {
            if (!empty($validated['is_base']) && $validated['is_base']) {
                // Unset other base currencies
                Currency::where('id', '!=', $currency->id)
                        ->where('is_base', true)
                        ->update(['is_base' => false]);
            }

            $validated['updated_by'] = auth()->id();
            $currency->update($validated);
        });

        return redirect()->back()->with('success', 'Currency updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Currency $currency)
    {
        if ($currency->is_base) {
            return redirect()->back()->with('error', 'Cannot delete the base currency. Please assign a new base currency first.');
        }

        $currency->delete();

        return redirect()->back()->with('success', 'Currency deleted successfully.');
    }
}
