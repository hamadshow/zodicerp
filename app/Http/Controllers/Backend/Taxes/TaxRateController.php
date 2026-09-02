<?php

namespace App\Http\Controllers\Backend\Taxes;

use App\Http\Controllers\Controller;
use App\Models\Taxes\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TaxRateController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Tax::query()->orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->input('search')}%");
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->input('status') === 'active');
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $taxes = $query->paginate(20)->withQueryString();

        return Inertia::render('Backend/09-Taxes/TaxRate', [
            'taxes' => $taxes,
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:taxes,name',
            'code' => 'nullable|string|max:20',
            'rate' => 'required|numeric|min:0|max:100',
            'type' => 'required|in:sales,purchase,both',
            'is_inclusive' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'description' => 'nullable|string',
            'account_id' => 'nullable|exists:accounts,id',
        ]);

        $validated['is_inclusive'] = $validated['is_inclusive'] ?? false;
        $validated['is_active'] = $validated['is_active'] ?? true;

        Tax::create($validated);

        return redirect()->back()->with('success', 'Tax rate created successfully.');
    }

    public function update(Request $request, Tax $tax)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:taxes,name,' . $tax->id,
            'code' => 'nullable|string|max:20',
            'rate' => 'required|numeric|min:0|max:100',
            'type' => 'required|in:sales,purchase,both',
            'is_inclusive' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'description' => 'nullable|string',
            'account_id' => 'nullable|exists:accounts,id',
        ]);

        $tax->update($validated);

        return redirect()->back()->with('success', 'Tax rate updated successfully.');
    }

    public function destroy(Tax $tax)
    {
        $tax->delete();
        return redirect()->back()->with('success', 'Tax rate deleted.');
    }

    public function toggleStatus(Tax $tax)
    {
        $tax->update(['is_active' => !$tax->is_active]);
        return redirect()->back()->with('success', 'Tax status toggled.');
    }
}
