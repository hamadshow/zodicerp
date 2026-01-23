<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\Vendor_Purchases\PurchaseQuotation;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class PurchaseQuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseQuotation::query()
            ->with(['supplier', 'currency'])
            ->orderByDesc('quotation_date');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($supplierQuery) use ($search) {
                      $supplierQuery->where('name_ar', 'like', "%{$search}%")
                          ->orWhere('name_en', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->input('supplier_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('quotation_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('quotation_date', '<=', $request->input('date_to'));
        }

        $quotations = $query->paginate(10)->withQueryString();

        $stats = [
            'total' => PurchaseQuotation::count(),
            'draft' => PurchaseQuotation::where('status', 'draft')->count(),
            'approved' => PurchaseQuotation::where('status', 'approved')->count(),
            'total_amount' => PurchaseQuotation::sum('total_amount'),
        ];

        return Inertia::render('Backend/04-Purchases/Quotations/Index', [
            'quotations' => $quotations,
            'filters' => $request->only(['search', 'status', 'supplier_id', 'date_from', 'date_to']),
            'stats' => $stats,
        ]);
    }

    public function create()
    {
        return Inertia::render('Backend/04-Purchases/Quotations/Create', [
            'suppliers' => Supplier::select('id', 'supplier_code', 'name_ar', 'name_en')->orderBy('name_ar')->get(),
            'currencies' => Currency::select('id', 'code', 'name', 'symbol')->orderBy('code')->get(),
            'warehouses' => Warehouses::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quotation_number' => 'required|string|max:50|unique:purchase_quotations,quotation_number',
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0.000001',
            'quotation_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:quotation_date',
            'valid_days' => 'nullable|integer|min:1',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'subtotal' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'status' => 'required|in:draft,sent,under_review,approved,rejected,expired,converted',
            'approval_notes' => 'nullable|string',
            'sent_date' => 'nullable|date',
            'sent_method' => 'nullable|in:email,fax,hand,other',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();

        PurchaseQuotation::create($validated);

        return redirect()->route('admin.purchases.quotations.index')
            ->with('success', 'Purchase quotation created successfully.');
    }

    public function show(PurchaseQuotation $quotation)
    {
        $quotation->load(['supplier', 'currency', 'warehouse']);

        return Inertia::render('Backend/04-Purchases/Quotations/Show', [
            'quotation' => $quotation,
        ]);
    }

    public function edit(PurchaseQuotation $quotation)
    {
        $quotation->load(['supplier', 'currency', 'warehouse']);

        return Inertia::render('Backend/04-Purchases/Quotations/Edit', [
            'quotation' => $quotation,
            'suppliers' => Supplier::select('id', 'supplier_code', 'name_ar', 'name_en')->orderBy('name_ar')->get(),
            'currencies' => Currency::select('id', 'code', 'name', 'symbol')->orderBy('code')->get(),
            'warehouses' => Warehouses::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, PurchaseQuotation $quotation)
    {
        $validated = $request->validate([
            'quotation_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('purchase_quotations', 'quotation_number')->ignore($quotation->id),
            ],
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0.000001',
            'quotation_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:quotation_date',
            'valid_days' => 'nullable|integer|min:1',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'subtotal' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'status' => 'required|in:draft,sent,under_review,approved,rejected,expired,converted',
            'approval_notes' => 'nullable|string',
            'sent_date' => 'nullable|date',
            'sent_method' => 'nullable|in:email,fax,hand,other',
            'notes' => 'nullable|string',
        ]);

        $quotation->update($validated);

        return redirect()->route('admin.purchases.quotations.index')
            ->with('success', 'Purchase quotation updated successfully.');
    }

    public function destroy(PurchaseQuotation $quotation)
    {
        $quotation->delete();

        return redirect()->back()->with('success', 'Purchase quotation deleted successfully.');
    }

    public function approval()
    {
        return Inertia::render('Backend/04-Purchases/Quotations/Approval');
    }
}
