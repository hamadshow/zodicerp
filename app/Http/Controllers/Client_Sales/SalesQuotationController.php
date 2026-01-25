<?php

namespace App\Http\Controllers\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\SalesQuotation;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerAddress;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\ItemUnit;
use App\Models\Products;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SalesQuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = SalesQuotation::query()
            ->with(['customer', 'currency', 'creator', 'items', 'warehouse'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($q) use ($search) {
                      $q->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_ar', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $quotations = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $customers = Customer::where('is_active', true)
            ->select('id', 'name_en', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();
        
        $customerAddresses = CustomerAddress::select('id', 'customer_id', 'address_name', 'city_id', 'is_default')
            ->with('city')
            ->get();

        return Inertia::render('Backend/05-Client_Sales/Sales_Quotations', [
            'quotations' => $quotations,
            'customers' => $customers,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'customerAddresses' => $customerAddresses,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quotation_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:quotation_date',
            'customer_id' => 'required|exists:customers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => 'required|in:draft,sent,accepted,declined,expired',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate number if not provided
            $number = 'SQ-' . date('Ymd') . '-' . rand(1000, 9999);

            $quotation = SalesQuotation::create([
                'quotation_number' => $number,
                'quotation_date' => $request->quotation_date,
                'expiry_date' => $request->expiry_date,
                'customer_id' => $request->customer_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'warehouse_id' => $request->warehouse_id,
                'customer_notes' => $request->customer_notes,
                'internal_notes' => $request->internal_notes,
                'created_by' => Auth::id(),
                
                // Financials
                'subtotal' => $request->subtotal ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'discount_amount' => $request->discount_amount ?? 0,
                'shipping_cost' => $request->shipping_cost ?? 0,
                'total_amount' => $request->total_amount ?? 0,
            ]);

            foreach ($request->items as $item) {
                $quotation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Sales Quotation created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating quotation: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $quotation = SalesQuotation::findOrFail($id);
        
        $validated = $request->validate([
            'quotation_date' => 'required|date',
            'customer_id' => 'required|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.unit_id' => 'required|exists:item_units,id',
        ]);

        DB::beginTransaction();
        try {
            $quotation->update([
                'quotation_date' => $request->quotation_date,
                'expiry_date' => $request->expiry_date,
                'customer_id' => $request->customer_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'warehouse_id' => $request->warehouse_id,
                'customer_notes' => $request->customer_notes,
                'internal_notes' => $request->internal_notes,
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'discount_amount' => $request->discount_amount,
                'shipping_cost' => $request->shipping_cost,
                'total_amount' => $request->total_amount,
            ]);

            // Sync items: Delete old and re-create
            $quotation->items()->delete();

            foreach ($request->items as $item) {
                $quotation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Sales Quotation updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating quotation: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $quotation = SalesQuotation::findOrFail($id);
            $quotation->delete(); // Soft delete
            return redirect()->back()->with('success', 'Sales Quotation deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting quotation: ' . $e->getMessage());
        }
    }
}
