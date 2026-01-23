<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Vendor_Purchases\SupplierGroup;
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Supplier::with(['group', 'country']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name_en', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('supplier_code', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('primary_phone', 'like', "%{$search}%");
            });
        }

        if ($request->has('group') && $request->group) {
            $query->where('supplier_group_id', $request->group);
        }

        if ($request->has('status') && $request->status !== null && $request->status !== '') {
            $query->where('is_active', $request->status);
        }

        $suppliers = $query->latest()->paginate(10)->withQueryString();
        $groups = SupplierGroup::select('id', 'name_en')->get();

        $stats = [
            'total' => Supplier::count(),
            'active' => Supplier::where('is_active', true)->count(),
            'inactive' => Supplier::where('is_active', false)->count(),
            'total_balance' => Supplier::sum('current_balance'),
        ];

        return Inertia::render('Backend/04-Purchases/Suppliers/Index', [
            'suppliers' => $suppliers,
            'groups' => $groups,
            'filters' => $request->only(['search', 'group', 'status']),
            'stats' => $stats,
        ]);
    }

    public function create(): Response
    {
        $groups = SupplierGroup::where('is_active', true)->select('id', 'name_en')->get();
        $countries = Country::select('id', 'name')->get(); // Adjust fields if needed

        return Inertia::render('Backend/04-Purchases/Suppliers/Create', [
            'groups' => $groups,
            'countries' => $countries,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code',
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'supplier_group_id' => 'nullable|exists:supplier_groups,id',
            'email' => 'nullable|email|max:255',
            'primary_phone' => 'nullable|string|max:20',
            'tax_number' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric',
            'payment_terms' => 'nullable|integer',
            'country_id' => 'nullable|exists:countries,id',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        
        Supplier::create($validated);

        return redirect()->route('admin.purchases.suppliers.index')
            ->with('success', 'Supplier created successfully.');
    }

    public function edit($id): Response
    {
        $supplier = Supplier::findOrFail($id);
        $groups = SupplierGroup::where('is_active', true)->select('id', 'name_en')->get();
        $countries = Country::select('id', 'name')->get();

        return Inertia::render('Backend/04-Purchases/Suppliers/Edit', [
            'supplier' => $supplier,
            'groups' => $groups,
            'countries' => $countries,
        ]);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code,' . $supplier->id,
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'supplier_group_id' => 'nullable|exists:supplier_groups,id',
            'email' => 'nullable|email|max:255',
            'primary_phone' => 'nullable|string|max:20',
            'tax_number' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric',
            'payment_terms' => 'nullable|integer',
            'country_id' => 'nullable|exists:countries,id',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $supplier->update($validated);

        return redirect()->route('admin.purchases.suppliers.index')
            ->with('success', 'Supplier updated successfully.');
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        return redirect()->back()->with('success', 'Supplier deleted successfully.');
    }

    // Retained Auth methods just in case (renamed to avoid conflict if needed, or kept separate)
    // For now, standard resource methods take precedence.
}
