<?php

namespace App\Http\Controllers\Backend\Taxes;

use App\Http\Controllers\Controller;
use App\Models\Taxes\Tax;
use App\Models\Taxes\TaxType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaxRateController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Tax::query()->with('taxType')->orderBy('name_en');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($query) use ($search) {
                $query->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('tax_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->input('status') === 'active');
        }

        if ($request->filled('type')) {
            $query->whereHas('taxType', function ($query) use ($request) {
                $query->where('tax_category', $request->input('type'));
            });
        }

        $taxes = $query->paginate(20)->withQueryString();

        return Inertia::render('Backend/09-Taxes/TaxRate', [
            'taxes' => $taxes,
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function store(Request $request)
    {
        Tax::create($this->validatedTaxData($request));

        return redirect()->back()->with('success', 'Tax rate created successfully.');
    }

    public function update(Request $request, Tax $tax)
    {
        $tax->update($this->validatedTaxData($request));

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

    private function validatedTaxData(Request $request): array
    {
        $validated = $request->validate([
            'name_ar' => 'nullable|string|max:200',
            'name_en' => 'nullable|string|max:200',
            'name' => 'required|string|max:200',
            'tax_code' => 'nullable|string|max:50',
            'code' => 'nullable|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'rate' => 'required|numeric|min:0|max:100',
            'tax_type_id' => 'nullable|exists:tax_types,id',
            'type' => 'required|in:sales,purchase,both',
            'country_id' => 'nullable|exists:locations,id',
            'is_active' => 'nullable|boolean',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'description' => 'nullable|string',
            'tax_account_id' => 'nullable|exists:accounts,AccID',
            'account_id' => 'nullable|exists:accounts,AccID',
            'is_inclusive' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
        ]);

        $name = $validated['name'] ?? null;
        $taxTypeId = $validated['tax_type_id'] ?? null;
        if (! $taxTypeId && ! empty($validated['type'])) {
            $taxTypeId = TaxType::query()
                ->where('tax_category', $validated['type'])
                ->where('is_active', true)
                ->value('id');
        }

        $countryId = $validated['country_id'] ?? null;
        $taxCode = $validated['tax_code'] ?? ($validated['code'] ?? null);
        $taxRate = $validated['tax_rate'] ?? ($validated['rate'] ?? null);
        $nameAr = $validated['name_ar'] ?? $name;
        $nameEn = $validated['name_en'] ?? $name;

        if (! $nameAr || ! $nameEn || ! $taxCode || $taxRate === null || ! $taxTypeId || ! $countryId) {
            abort(422, 'Tax requires name_ar/name_en, tax_code, tax_rate, tax_type_id, and country_id.');
        }

        return [
            'tax_type_id' => $taxTypeId,
            'tax_code' => $taxCode,
            'name_ar' => $nameAr,
            'name_en' => $nameEn,
            'description_ar' => $validated['description_ar'] ?? ($validated['description'] ?? null),
            'description_en' => $validated['description_en'] ?? ($validated['description'] ?? null),
            'country_id' => $countryId,
            'tax_rate' => $taxRate,
            'calculation_method' => 'percentage',
            'calculation_basis' => ($validated['is_inclusive'] ?? false) ? 'inclusive' : 'exclusive',
            'tax_account_id' => $validated['tax_account_id'] ?? ($validated['account_id'] ?? null),
            'is_active' => $validated['is_active'] ?? true,
            'effective_from' => $validated['effective_from'] ?? now()->toDateString(),
        ];
    }
}
