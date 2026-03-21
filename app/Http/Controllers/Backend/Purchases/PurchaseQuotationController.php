<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PurchaseQuotation;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseQuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseQuotation::query()
            ->with(['vendor', 'currency', 'creator', 'items'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                    ->orWhereHas('vendor', function ($q) use ($search) {
                        $q->where('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $quotations = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $vendors = Supplier::where('is_active', true)
            ->select('id', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();

        // Mock data for terms (should be replaced with actual models later)
        $paymentTerms = [
            ['id' => 1, 'name' => 'Net 30'],
            ['id' => 2, 'name' => 'Net 60'],
            ['id' => 3, 'name' => 'Cash on Delivery'],
            ['id' => 4, 'name' => 'Advance Payment'],
        ];

        $deliveryTerms = [
            ['id' => 1, 'name' => 'EXW - Ex Works'],
            ['id' => 2, 'name' => 'FOB - Free on Board'],
            ['id' => 3, 'name' => 'CIF - Cost, Insurance and Freight'],
            ['id' => 4, 'name' => 'DDP - Delivered Duty Paid'],
        ];

        return Inertia::render('Backend/04-Purchases/Purchase_quotations', [
            'quotations' => $quotations,
            'vendors' => $vendors,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'paymentTerms' => $paymentTerms,
            'deliveryTerms' => $deliveryTerms,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quotation_date' => 'required|date',
            'expiry_date' => 'required|date|after_or_equal:quotation_date',
            'vendor_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'status' => 'required|in:draft,pending_approval,approved,sent_to_vendor,vendor_replied,converted_to_po,rejected,cancelled,expired',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name_ar' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate number if not provided
            $number = 'PQ-'.date('Ymd').'-'.rand(1000, 9999);

            $quotation = PurchaseQuotation::create([
                'quotation_number' => $number,
                'quotation_date' => $request->quotation_date,
                'expiry_date' => $request->expiry_date,
                'vendor_id' => $request->vendor_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'priority' => $request->priority ?? 'medium',
                'notes' => $request->notes,
                'company_id' => 1, // Default or from Auth
                'department_id' => 1, // Default
                'prepared_by' => Auth::id(),
                'created_by' => Auth::id(),

                // Financials (can be calculated)
                'subtotal' => $request->subtotal ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'grand_total' => $request->grand_total ?? 0,
            ]);

            foreach ($request->items as $index => $item) {
                $quotation->items()->create([
                    'line_number' => $index + 1,
                    'item_type' => $item['item_type'] ?? 'product',
                    'product_id' => $item['product_id'] ?? null,
                    'item_name_ar' => $item['item_name_ar'],
                    'item_name_en' => $item['item_name_en'] ?? '',
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    // Generated columns handled by DB
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Quotation created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error creating quotation: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $quotation = PurchaseQuotation::findOrFail($id);

        $validated = $request->validate([
            'quotation_date' => 'required|date',
            'vendor_id' => 'required|exists:suppliers,id',
            'items' => 'required|array|min:1',
            'items.*.unit_id' => 'required|exists:item_units,id',
        ]);

        DB::beginTransaction();
        try {
            $quotation->update([
                'quotation_date' => $request->quotation_date,
                'expiry_date' => $request->expiry_date,
                'vendor_id' => $request->vendor_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'status' => $request->status,
                'priority' => $request->priority,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'grand_total' => $request->grand_total,
            ]);

            // Sync items: Delete old and re-create (simplest strategy for now)
            // Or smarter sync. For now, let's delete all and recreate to ensure consistency
            $quotation->items()->delete();

            foreach ($request->items as $index => $item) {
                $quotation->items()->create([
                    'line_number' => $index + 1,
                    'item_type' => $item['item_type'] ?? 'product',
                    'product_id' => $item['product_id'] ?? null,
                    'item_name_ar' => $item['item_name_ar'],
                    'item_name_en' => $item['item_name_en'] ?? '',
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Quotation updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error updating quotation: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $quotation = PurchaseQuotation::findOrFail($id);
            $quotation->delete(); // Soft delete

            return redirect()->back()->with('success', 'Purchase Quotation deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting quotation: '.$e->getMessage());
        }
    }
}
