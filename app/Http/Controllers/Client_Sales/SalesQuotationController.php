<?php

namespace App\Http\Controllers\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\SalesQuotation;
use App\Models\Client_Sales\SalesQuotationDetail;
use App\Models\Client_Sales\Customer;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\SalesAgent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SalesQuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = SalesQuotation::query()
            ->with(['customer', 'currency', 'creator', 'items'])
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

        // Load shared data
        $customers = Customer::where('is_active', true)
            ->select('id', 'name_en', 'name_ar', 'currency_id', 'primary_phone as phone')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();
        $priceLists = PriceList::select('id', 'name_en', 'name_ar')->get();
        $salesAgents = SalesAgent::select('id', 'name_en', 'name_ar')->get();

        return Inertia::render('Backend/05-Client_Sales/Sales_Quotations', [
            'quotations' => $quotations,
            'customers' => $customers,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'priceLists' => $priceLists,
            'salesAgents' => $salesAgents,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quotation_date' => 'required|date',
            'expiry_date' => 'required|date|after_or_equal:quotation_date',
            'customer_id' => 'required|exists:customers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => 'required|in:draft,sent,accepted,rejected,expired,converted',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name_ar' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $number = 'SQ-' . date('Ymd') . '-' . rand(1000, 9999);

            $quotation = SalesQuotation::create([
                'quotation_number' => $number,
                'quotation_date' => $request->quotation_date,
                'expiry_date' => $request->expiry_date,
                'valid_days' => $request->valid_days,
                'customer_id' => $request->customer_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'price_list_id' => $request->price_list_id,
                'warehouse_id' => $request->warehouse_id,
                'sales_agent_id' => $request->sales_agent_id,
                'customer_notes' => $request->customer_notes,
                'internal_notes' => $request->internal_notes,
                'created_by' => Auth::id(),
                
                'subtotal' => $request->subtotal ?? 0,
                'discount_percentage' => $request->discount_percentage ?? 0,
                'discount_amount' => $request->discount_amount ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'shipping_cost' => $request->shipping_cost ?? 0,
                'total_amount' => $request->total_amount ?? 0,
                'base_total' => $request->base_total ?? 0,
            ]);

            foreach ($request->items as $index => $item) {
                $quotation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name_ar' => $item['item_name_ar'],
                    'item_name_en' => $item['item_name_en'] ?? '',
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'line_total' => $item['line_total'] ?? 0,
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
        ]);

        DB::beginTransaction();
        try {
            $quotation->update([
                'quotation_date' => $request->quotation_date,
                'expiry_date' => $request->expiry_date,
                'valid_days' => $request->valid_days,
                'customer_id' => $request->customer_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'price_list_id' => $request->price_list_id,
                'warehouse_id' => $request->warehouse_id,
                'sales_agent_id' => $request->sales_agent_id,
                'customer_notes' => $request->customer_notes,
                'internal_notes' => $request->internal_notes,
                
                'subtotal' => $request->subtotal,
                'discount_percentage' => $request->discount_percentage,
                'discount_amount' => $request->discount_amount,
                'tax_amount' => $request->tax_amount,
                'shipping_cost' => $request->shipping_cost,
                'total_amount' => $request->total_amount,
                'base_total' => $request->base_total,
            ]);

            $quotation->items()->delete();

            foreach ($request->items as $index => $item) {
                $quotation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name_ar' => $item['item_name_ar'],
                    'item_name_en' => $item['item_name_en'] ?? '',
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'line_total' => $item['line_total'] ?? 0,
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
            $quotation->delete();
            return redirect()->back()->with('success', 'Sales Quotation deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting quotation: ' . $e->getMessage());
        }
    }
}
