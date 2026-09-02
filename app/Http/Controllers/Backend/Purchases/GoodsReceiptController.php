<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\GoodsReceipt;
use App\Models\Vendor_Purchases\PurchaseOrder;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use App\Services\Vendor_Purchases\GoodsReceiptService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GoodsReceiptController extends Controller
{
    public function __construct(
        protected GoodsReceiptService $receiptService
    ) {}

    public function index(Request $request): Response
    {
        $query = GoodsReceipt::query()
            ->with(['order', 'warehouse', 'creator'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('receipt_number', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->input('order_id'));
        }

        $receipts = $query->paginate(15)->withQueryString();

        $purchaseOrders = PurchaseOrder::query()
            ->whereIn('status', ['approved', 'sent_to_vendor', 'partially_received', 'fully_received'])
            ->with(['items', 'vendor'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $warehouses = Warehouses::select('id', 'name as name_ar')->get();

        return Inertia::render('Backend/04-Purchases/GoodsReceipt', [
            'receipts' => $receipts,
            'purchaseOrders' => $purchaseOrders,
            'warehouses' => $warehouses,
            'filters' => $request->only(['search', 'status', 'order_id']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:purchase_orders,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'receipt_date' => 'required|date',
            'receipt_time' => 'nullable|string',
            'receipt_type' => 'nullable|in:full,partial,return_receipt',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_received' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.accepted_quantity' => 'nullable|numeric|min:0',
            'items.*.rejected_quantity' => 'nullable|numeric|min:0',
            'items.*.quality_status' => 'nullable|in:good,damaged,expired,defective',
            'items.*.batch_number' => 'nullable|string',
            'items.*.serial_number' => 'nullable|string',
            'items.*.expiry_date' => 'nullable|date',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            $receipt = $this->receiptService->createGoodsReceipt($validated);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} created successfully.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating goods receipt: ' . $e->getMessage())->withInput();
        }
    }

    public function show(GoodsReceipt $goodsReceipt): Response
    {
        $goodsReceipt->load(['details.product', 'details.unit', 'order', 'warehouse', 'creator', 'receiver', 'checker', 'approver']);

        return Inertia::render('Backend/04-Purchases/GoodsReceiptDetail', [
            'receipt' => $goodsReceipt,
        ]);
    }

    public function approve(GoodsReceipt $goodsReceipt)
    {
        try {
            $receipt = $this->receiptService->approveReceipt($goodsReceipt);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} approved. Inventory updated.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function receive(GoodsReceipt $goodsReceipt)
    {
        try {
            $receipt = $this->receiptService->receiveItems($goodsReceipt);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} marked as received.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function check(GoodsReceipt $goodsReceipt, Request $request)
    {
        $request->validate([
            'quality_status' => 'required|in:pending,passed,failed,partial',
            'inspection_notes' => 'nullable|string',
        ]);

        try {
            $receipt = $this->receiptService->checkItems(
                $goodsReceipt,
                $request->input('quality_status'),
                $request->input('inspection_notes')
            );
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} quality check completed.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function cancel(GoodsReceipt $goodsReceipt)
    {
        try {
            $receipt = $this->receiptService->cancelReceipt($goodsReceipt);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} cancelled.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy(GoodsReceipt $goodsReceipt)
    {
        if ($goodsReceipt->status === 'approved') {
            return redirect()->back()->with('error', 'Approved receipts cannot be deleted.');
        }

        $goodsReceipt->delete();
        return redirect()->back()->with('success', 'Goods Receipt deleted.');
    }
}
