<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\SupplierGroup;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierGroupController extends Controller
{
    public function index(Request $request)
    {
        $query = SupplierGroup::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name_en', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $groups = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('Backend/04-Purchases/Suppliers/Groups/Index', [
            'groups' => $groups,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Backend/04-Purchases/Suppliers/Groups/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:supplier_groups,code',
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|integer',
            'default_credit_limit' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();

        SupplierGroup::create($validated);

        return redirect()->route('admin.purchases.supplier-groups.index')
            ->with('success', 'Supplier Group created successfully.');
    }

    public function edit($id)
    {
        $group = SupplierGroup::findOrFail($id);
        return Inertia::render('Backend/04-Purchases/Suppliers/Groups/Edit', [
            'group' => $group
        ]);
    }

    public function update(Request $request, $id)
    {
        $group = SupplierGroup::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:supplier_groups,code,' . $group->id,
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|integer',
            'default_credit_limit' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $group->update($validated);

        return redirect()->route('admin.purchases.supplier-groups.index')
            ->with('success', 'Supplier Group updated successfully.');
    }

    public function destroy($id)
    {
        $group = SupplierGroup::findOrFail($id);
        $group->delete();

        return redirect()->back()->with('success', 'Supplier Group deleted successfully.');
    }
}
