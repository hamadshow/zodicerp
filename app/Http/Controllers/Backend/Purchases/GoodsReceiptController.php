<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\GoodsReceipt;
use App\Models\Vendor_Purchases\PurchaseOrder;
use App\Models\ItemUnit;
use App\Models\Warehouses;
use App\Services\CompanyContext;
use App\Services\UnitConversionService;
use App\Services\Vendor_Purchases\GoodsReceiptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GoodsReceiptController extends Controller
{
    public function __construct(
        protected GoodsReceiptService $receiptService,
        protected CompanyContext $companyContext,
        protected UnitConversionService $unitConversionService,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = $this->companyContext->id();
        $perPage = (int) $request->input('per_page', 25);
        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $query = GoodsReceipt::query()
            ->with(['order.vendor', 'warehouse', 'creator'])
            ->where('company_id', $companyId)
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($receiptQuery) use ($search) {
                $receiptQuery
                    ->where('receipt_number', 'like', "%{$search}%")
                    ->orWhereHas('order', fn ($orderQuery) => $orderQuery->where('po_number', 'like', "%{$search}%"))
                    ->orWhereHas('order.vendor', function ($vendorQuery) use ($search) {
                        $vendorQuery
                            ->where('name_ar', 'like', "%{$search}%")
                            ->orWhere('name_en', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->input('order_id'));
        }

        $receipts = $query->paginate($perPage)->withQueryString();
        $options = $this->formOptions($companyId);

        return Inertia::render('Backend/04-Purchases/GoodsReceipt', [
            'receipts' => $receipts,
            ...$options,
            'filters' => $request->only(['search', 'status', 'order_id', 'per_page']),
            'initialMode' => 'list',
            'selectedReceipt' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->receiptRules($request));

        try {
            $receipt = $this->receiptService->createGoodsReceipt($validated);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} created successfully.");
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e; // ownership aborts keep their HTTP status (404)
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating goods receipt: ' . $e->getMessage())->withInput();
        }
    }

    public function show(GoodsReceipt $goodsReceipt): Response
    {
        $this->assertOwnedReceipt($goodsReceipt);

        $goodsReceipt->load(['details.product', 'details.unit', 'order.vendor', 'warehouse', 'creator', 'receiver', 'checker', 'approver']);
        $companyId = $this->companyContext->id();

        return Inertia::render('Backend/04-Purchases/GoodsReceipt', [
            'receipts' => [
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 25,
                'total' => 0,
                'from' => null,
                'to' => null,
            ],
            ...$this->formOptions($companyId),
            'filters' => [],
            'initialMode' => 'view',
            'selectedReceipt' => $goodsReceipt,
        ]);
    }

    public function update(Request $request, GoodsReceipt $goodsReceipt)
    {
        $this->assertOwnedReceipt($goodsReceipt);

        if ($goodsReceipt->status !== 'draft') {
            return redirect()->back()->with('error', 'Only draft receipts can be edited.');
        }

        $validated = $request->validate($this->receiptRules($request));

        try {
            $receipt = $this->receiptService->updateGoodsReceipt($goodsReceipt, $validated);

            return redirect()->back()
                ->with('success', "Goods Receipt {$receipt->receipt_number} updated successfully.");
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error updating goods receipt: ' . $e->getMessage())->withInput();
        }
    }

    public function approve(GoodsReceipt $goodsReceipt)
    {
        try {
            $this->assertOwnedReceipt($goodsReceipt);

            $receipt = $this->receiptService->approveReceipt($goodsReceipt);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} approved. Inventory updated.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function receive(GoodsReceipt $goodsReceipt)
    {
        try {
            $this->assertOwnedReceipt($goodsReceipt);

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
            $this->assertOwnedReceipt($goodsReceipt);

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
            $this->assertOwnedReceipt($goodsReceipt);

            $receipt = $this->receiptService->cancelReceipt($goodsReceipt);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} cancelled.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Phase 6 — reverse an approved receipt exactly (stock + derived quantity
     * + PO accumulation), for audit-visible corrections.
     */
    public function reverse(GoodsReceipt $goodsReceipt)
    {
        try {
            $this->assertOwnedReceipt($goodsReceipt);

            $receipt = $this->receiptService->reverseReceipt($goodsReceipt);
            return redirect()->back()->with('success', "Goods Receipt {$receipt->receipt_number} reversed. Inventory and PO quantities restored.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy(GoodsReceipt $goodsReceipt)
    {
        $this->assertOwnedReceipt($goodsReceipt);

        if ($goodsReceipt->status === 'approved') {
            return redirect()->back()->with('error', 'Approved receipts cannot be deleted. Reverse the receipt instead.');
        }

        DB::transaction(function () use ($goodsReceipt) {
            $goodsReceipt->details()->delete();
            $goodsReceipt->delete();
        });
        return redirect()->back()->with('success', 'Goods Receipt deleted.');
    }

    private function receiptRules(Request $request): array
    {
        return [
            'order_id' => 'required|exists:purchase_orders,id',
            'invoice_id' => 'nullable|exists:purchase_invoices,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'receipt_date' => 'required|date',
            'receipt_time' => 'nullable|date_format:H:i',
            'receipt_type' => 'nullable|in:full,partial,return_receipt',
            'notes' => 'nullable|string',
            'inspection_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.invoice_detail_id' => 'nullable|exists:purchase_invoice_details,id',
            'items.*.quantity_received' => [
                'required',
                'numeric',
                'min:0.001',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    if (! preg_match('/items\.(\d+)\.quantity_received/', $attribute, $matches)) {
                        return;
                    }

                    $item = $request->input('items.' . $matches[1], []);
                    $accepted = (float) ($item['accepted_quantity'] ?? 0);
                    $rejected = (float) ($item['rejected_quantity'] ?? 0);
                    if (abs((float) $value - $accepted - $rejected) > 0.0001) {
                        $fail('Accepted and rejected quantities must add up to the received quantity.');
                    }
                },
            ],
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.rejected_quantity' => 'required|numeric|min:0',
            'items.*.quality_status' => 'required|in:good,damaged,expired,defective',
            'items.*.batch_number' => 'nullable|string|max:100',
            'items.*.serial_number' => 'nullable|string|max:100',
            'items.*.expiry_date' => 'nullable|date',
            'items.*.production_date' => 'nullable|date',
            'items.*.shelf_location' => 'nullable|string|max:50',
            'items.*.quality_notes' => 'nullable|string',
            'items.*.rejection_reason' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ];
    }

    private function formOptions(int $companyId): array
    {
        $purchaseOrders = PurchaseOrder::query()
            ->where('company_id', $companyId)
            ->whereIn('status', ['approved', 'sent_to_vendor', 'partially_received', 'fully_received'])
            ->with(['vendor', 'items.product.unit', 'items.unit'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $products = $purchaseOrders->flatMap(fn (PurchaseOrder $order) => $order->items
            ->pluck('product')
            ->filter())
            ->unique('id')
            ->values();
        $selectableUnits = $this->unitConversionService->selectableUnitsByProduct($products);
        $baseUnitIds = $this->unitConversionService->baseUnitIdsByProduct($products);
        $baseUnits = ItemUnit::query()
            ->active()
            ->where(function ($query) use ($companyId) {
                $query->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->whereIn('id', array_values(array_unique($baseUnitIds)))
            ->get(['id', 'name'])
            ->keyBy('id');

        $purchaseOrders->each(function (PurchaseOrder $order) use ($selectableUnits, $baseUnitIds, $baseUnits) {
            $order->items->each(function ($item) use ($selectableUnits, $baseUnitIds, $baseUnits) {
                $product = $item->product;
                if (! $product) {
                    $item->setAttribute('unit_options', []);
                    return;
                }

                $baseId = $baseUnitIds[(int) $product->id] ?? null;
                $options = collect($baseId && $baseUnits->has($baseId) ? [[
                    'id' => (int) $baseId,
                    'name' => (string) $baseUnits->get($baseId)->name,
                    'conversion_factor' => '1.000000',
                ]] : [])
                    ->merge($selectableUnits[(int) $product->id] ?? [])
                    ->keyBy('id');

                if ($item->unit && ! $options->has((int) $item->unit_id)) {
                    $options->put((int) $item->unit_id, [
                        'id' => (int) $item->unit_id,
                        'name' => (string) $item->unit->name,
                        'conversion_factor' => (string) ($item->unit->conversion_factor ?: '1.000000'),
                    ]);
                }

                $item->setAttribute('unit_options', $options->values()->all());
                $item->setAttribute('display_name', $item->item_name_en
                    ?: $item->item_name_ar
                    ?: $product->name
                    ?: ('Product ' . $product->id));
            });
        });

        return [
            'purchaseOrders' => $purchaseOrders,
            'warehouses' => Warehouses::query()
                ->where('company_id', $companyId)
                ->orderBy('id')
                ->get(['id', 'name']),
        ];
    }

    /**
     * Cross-company guard (Phase 1 convention): a receipt owned by another
     * company is indistinguishable from a missing one.
     */
    private function assertOwnedReceipt(GoodsReceipt $goodsReceipt): void
    {
        $companyId = $this->companyContext->id();

        abort_unless(
            (int) ($goodsReceipt->company_id ?: $companyId) === $companyId,
            404
        );

        // Legacy rows with NULL company are additionally anchored by their
        // warehouse: if the warehouse belongs to the active company the row is
        // treated as owned, otherwise 404.
        if (! $goodsReceipt->company_id) {
            $warehouseOwner = \Illuminate\Support\Facades\DB::table('warehouses')
                ->where('id', $goodsReceipt->warehouse_id)
                ->value('company_id');
            abort_unless((int) $warehouseOwner === $companyId, 404);
        }
    }
}
