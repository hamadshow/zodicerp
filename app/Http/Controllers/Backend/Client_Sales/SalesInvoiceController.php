<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Client_Sales\SalesOrder;
use App\Models\Vendor_Purchases\SalesAgent;
use App\Http\Controllers\Controller;
use App\Traits\EnsuresFiscalPeriod;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use App\Models\BankAccount;
use App\Models\TreasuryTransaction;
use App\Services\TreasuryService;
use App\Services\Accounting\PostingService;
use App\Services\Accounting\JournalReversalService;
use App\Services\CompanyContext;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\ProductPriceResolver;
use App\Services\ProductSellingGuard;
use App\Services\UnitConversionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesInvoiceController extends Controller
{
    use EnsuresFiscalPeriod;

    /**
     * Phase 15: per-posting memory of the outbound ICTs applied by the
     * journal step (sales_invoice_detail id → InventoryCostTransaction),
     * so the movement step can link each ICT to its own movement line.
     * Valid within one posting transaction only (idempotency guards make
     * re-entry a no-op before any second application).
     */
    protected array $invoiceOutboundTxs = [];

    protected string $journalCodePrefix = 'QID-';

    protected int $journalCodeStart = 10001;

    protected function weightedAverageCost(): WeightedAverageCostService
    {
        return app(WeightedAverageCostService::class);
    }

    public function index(Request $request)
    {
        $query = SalesInvoice::query()
            ->with(['customer', 'currency', 'creator', 'details.product'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($q) use ($search) {
                        $q->where('name_en', 'like', "%{$search}%")
                            ->orWhere('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('payment_status', $request->input('status'));
        }

        $sortBy = $request->input('sort_by');
        $sortDir = strtolower($request->input('sort_dir')) === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'balance_amount', 'payment_status', 'invoice_type'];

        if ($sortBy && in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $invoices = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $customers = Customer::where('is_active', true) // Assuming status column exists, or check model
            ->select('id', 'name_en', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        // Use sale_price for sales invoices
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->where('unit_type', 1)->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();

        $orders = SalesOrder::select('id', 'order_number')
            ->orderBy('created_at', 'desc')
            ->get();

        $salesAgents = SalesAgent::select('id', 'name_en', 'name_ar')
            ->where('is_active', true)
            ->get();

        $treasuries = Account::query()
            ->whereIn('Nature', ['bank', 'cash'])
            ->where('AccType', 1)
            ->orderBy('AccName')
            ->get(['AccID', 'AccName']);

        // Mock data for terms
        $paymentTerms = [
            ['id' => 1, 'name' => 'Net 30'],
            ['id' => 2, 'name' => 'Net 60'],
            ['id' => 3, 'name' => 'Cash on Delivery'],
            ['id' => 4, 'name' => 'Advance Payment'],
        ];

        return Inertia::render('Backend/05-Client_Sales/SalesInvoice', [
            'invoices' => $invoices,
            'customers' => $customers,
            'orders' => $orders,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'salesAgents' => $salesAgents,
            'treasuries' => $treasuries,
            'paymentTerms' => $paymentTerms,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'customer_id' => 'required|exists:customers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'invoice_type' => 'required|in:standard,proforma,credit_note,debit_note',
            'payment_status' => 'required|in:unpaid,partial,paid,overdue',
            'treasury_id' => 'required|integer|exists:accounts,AccID',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.warehouse_id' => 'nullable|exists:warehouses,id',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'other_charges' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
        ]);

        $currentCompanyId = app(CompanyContext::class)->id();

        try {
            $priceResolver = app(ProductPriceResolver::class);
            $customer = Customer::findOrFail($validated['customer_id']);
            $transactionDate = Carbon::parse($validated['invoice_date']);

            $processedItems = [];
            $headerSubtotal = '0.000000';
            $headerDiscount = '0.000000';
            $headerTax = '0.000000';

            foreach ($validated['items'] as $index => $item) {
                $productId = (int) $item['product_id'];

                ProductSellingGuard::assertSellable($productId);

                $product = Products::findOrFail($productId);

                $resolved = $priceResolver->resolve([
                    'product' => $product,
                    'customer' => $customer,
                    'unit_id' => (int) $item['unit_id'],
                    'quantity' => (string) $item['quantity'],
                    'transaction_date' => $transactionDate,
                ]);

                if ($resolved['final_price'] === null) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.unit_price" => [
                            "No selling price could be resolved for {$product->name} (SKU: {$product->sku}). No price list, customer group discount, or product sale price override gate was found in audit."
                        ],
                    ], 422);
                }

                $unitPrice = $resolved['final_price'];
                $quantity = bcadd((string) $item['quantity'], '0', 6);
                $lineDiscount = bcadd((string) ($item['discount_amount'] ?? '0'), '0', 6);
                $lineTax = bcadd((string) ($item['tax_amount'] ?? '0'), '0', 6);

                $lineGross = bcmul($quantity, $unitPrice, 6);
                $lineNet = bcsub($lineGross, $lineDiscount, 6);
                if (bccomp($lineNet, '0', 6) < 0) {
                    $lineNet = '0.000000';
                }
                $lineTotal = bcadd($lineNet, $lineTax, 6);

                $headerSubtotal = bcadd($headerSubtotal, $lineGross, 6);
                $headerDiscount = bcadd($headerDiscount, $lineDiscount, 6);
                $headerTax = bcadd($headerTax, $lineTax, 6);

                $processedItems[] = [
                    'product_id' => $productId,
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                    'quantity' => $quantity,
                    'unit_id' => (int) $item['unit_id'],
                    'unit_price' => $unitPrice,
                    'discount_amount' => $lineDiscount,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                    'price_source' => $resolved['source'],
                    'price_list_id' => $resolved['price_list_id'],
                    'price_list_item_id' => $resolved['price_list_item_id'],
                ];
            }

            $shippingCost = bcadd((string) ($validated['shipping_cost'] ?? '0'), '0', 6);
            $otherCharges = bcadd((string) ($validated['other_charges'] ?? '0'), '0', 6);
            $paidAmount = bcadd((string) ($validated['paid_amount'] ?? '0'), '0', 6);

            $netAfterDiscount = bcsub($headerSubtotal, $headerDiscount, 6);
            if (bccomp($netAfterDiscount, '0', 6) < 0) {
                $netAfterDiscount = '0.000000';
            }
            $headerTotal = bcadd($netAfterDiscount, $headerTax, 6);
            $headerTotal = bcadd($headerTotal, $shippingCost, 6);
            $headerTotal = bcadd($headerTotal, $otherCharges, 6);

            DB::transaction(function () use ($request, $validated, $processedItems, $headerSubtotal, $headerDiscount, $headerTax, $shippingCost, $otherCharges, $headerTotal, $paidAmount, $currentCompanyId) {
                $number = $request->invoice_number ?? 'SINV-'.date('Ymd').'-'.rand(1000, 9999);
                // invoice_number is unique (including soft-deleted rows) — retry
                // generated numbers instead of failing the whole sale.
                if (! $request->invoice_number) {
                    while (SalesInvoice::withTrashed()->where('invoice_number', $number)->exists()) {
                        $number = 'SINV-'.date('Ymd').'-'.rand(1000, 9999);
                    }
                }

                // Default warehouse must come from the invoice's own company.
                $defaultWarehouseId = Warehouses::query()->where('company_id', $currentCompanyId)->value('id') ?? 1;
                $warehouseId = $request->warehouse_id ?? $defaultWarehouseId;

                $invoice = SalesInvoice::create([
                    'invoice_number' => $number,
                    'invoice_date' => $validated['invoice_date'],
                    'due_date' => $validated['due_date'] ?? null,
                    'customer_id' => $validated['customer_id'],
                    'currency_id' => $validated['currency_id'],
                    'exchange_rate' => $validated['exchange_rate'],
                    'invoice_type' => $validated['invoice_type'],
                    'payment_status' => $validated['payment_status'],
                    'treasury_id' => $validated['treasury_id'],

                    'sales_agent_id' => $request->sales_agent_id,
                    'shipping_address_id' => $request->shipping_address_id,
                    'customer_notes' => $request->customer_notes,
                    'internal_notes' => $request->internal_notes,

                    'created_by' => Auth::id(),
                    'company_id' => $currentCompanyId,
                    'warehouse_id' => $warehouseId,

                    'subtotal' => $headerSubtotal,
                    'tax_amount' => $headerTax,
                    'discount_amount' => $headerDiscount,
                    'shipping_cost' => $shippingCost,
                    'other_charges' => $otherCharges,
                    'total_amount' => $headerTotal,
                    'paid_amount' => $paidAmount,

                    'payment_terms' => $request->payment_terms,
                ]);

                foreach ($processedItems as $pItem) {
                    $invoice->details()->create([
                        'product_id' => $pItem['product_id'],
                        'warehouse_id' => $pItem['warehouse_id'] ?? $warehouseId,
                        'quantity' => $pItem['quantity'],
                        'unit_id' => $pItem['unit_id'],
                        'unit_price' => $pItem['unit_price'],
                        'discount_amount' => $pItem['discount_amount'],
                        'tax_amount' => $pItem['tax_amount'],
                    ]);
                }

                if ($invoice->is_posted) {
                    // Phase 16 pipeline (documents before journal; see post()).
                    $this->applyInvoiceOutbounds($invoice);
                    $this->createStockMovementsForInvoice($invoice);
                    $this->postJournalEntryForInvoice($invoice);
                    $this->upsertBankReceiptForInvoice($invoice);
                }
            });

            return redirect()->back()->with('success', 'Sales Invoice created successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Error creating invoice: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $invoice = SalesInvoice::findOrFail($id);

        // Multi-company boundary: cross-company invoices are invisible (404).
        abort_unless((int) $invoice->company_id === app(CompanyContext::class)->id(), 404);

        if ($invoice->is_posted) {
            return redirect()->back()->withErrors([
                'invoice' => 'Posted sales invoices cannot be edited. Reverse and recreate the invoice instead.',
            ]);
        }

        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'customer_id' => 'required|exists:customers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'invoice_type' => 'required|in:standard,proforma,credit_note,debit_note',
            'payment_status' => 'required|in:unpaid,partial,paid,overdue',
            'treasury_id' => 'required|integer|exists:accounts,AccID',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.warehouse_id' => 'nullable|exists:warehouses,id',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'subtotal' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'other_charges' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
        ]);

        try {
            $priceResolver = app(ProductPriceResolver::class);
            $customer = Customer::findOrFail($validated['customer_id']);
            $transactionDate = Carbon::parse($validated['invoice_date']);
            $processedItems = [];
            foreach ($validated['items'] as $item) {
                ProductSellingGuard::assertSellable((int) $item['product_id']);
                $product = Products::findOrFail((int) $item['product_id']);
                $resolved = $priceResolver->resolve([
                    'product' => $product,
                    'customer' => $customer,
                    'unit_id' => (int) $item['unit_id'],
                    'quantity' => (string) $item['quantity'],
                    'transaction_date' => $transactionDate,
                ]);
                if ($resolved['final_price'] === null) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ["No selling price could be resolved for {$product->name}."],
                    ]);
                }
                $processedItems[] = [
                    ...$item,
                    'unit_price' => $resolved['final_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                ];
            }

            $subtotal = '0.000000';
            $lineDiscount = '0.000000';
            $lineTax = '0.000000';
            foreach ($processedItems as $item) {
                $subtotal = bcadd($subtotal, bcmul((string) $item['quantity'], (string) $item['unit_price'], 6), 6);
                $lineDiscount = bcadd($lineDiscount, (string) ($item['discount_amount'] ?? '0'), 6);
                $lineTax = bcadd($lineTax, (string) ($item['tax_amount'] ?? '0'), 6);
            }
            $shippingCost = bcadd((string) ($request->shipping_cost ?? '0'), '0', 6);
            $otherCharges = bcadd((string) ($request->other_charges ?? '0'), '0', 6);
            $totalAmount = bcadd(bcsub(bcadd($subtotal, $lineTax, 6), $lineDiscount, 6), $shippingCost, 6);
            $totalAmount = bcadd($totalAmount, $otherCharges, 6);

            DB::transaction(function () use ($request, $validated, $invoice, $processedItems, $subtotal, $lineDiscount, $lineTax, $shippingCost, $otherCharges, $totalAmount) {
                $defaultWarehouseId = Warehouses::query()->where('company_id', $invoice->company_id)->value('id') ?? 1;
                $warehouseId = $request->warehouse_id ?? $invoice->warehouse_id ?? $defaultWarehouseId;

                $invoice->update([
                    'invoice_number' => $request->invoice_number ?: $invoice->invoice_number,
                    'invoice_date' => $validated['invoice_date'],
                    'due_date' => $validated['due_date'] ?? null,
                    'customer_id' => $validated['customer_id'],
                    'currency_id' => $validated['currency_id'],
                    'exchange_rate' => $validated['exchange_rate'],
                    'invoice_type' => $validated['invoice_type'],
                    'payment_status' => $validated['payment_status'],
                    'treasury_id' => $validated['treasury_id'],

                    'sales_agent_id' => $request->sales_agent_id,
                    'shipping_address_id' => $request->shipping_address_id,
                    'customer_notes' => $request->customer_notes,
                    'internal_notes' => $request->internal_notes,

                    'warehouse_id' => $warehouseId,
                    'subtotal' => $subtotal,
                    'tax_amount' => $lineTax,
                    'discount_amount' => $lineDiscount,
                    'shipping_cost' => $shippingCost,
                    'other_charges' => $otherCharges,
                    'total_amount' => $totalAmount,
                    'paid_amount' => $request->paid_amount,
                    'payment_terms' => $request->payment_terms,
                ]);

                $invoice->details()->withTrashed()->forceDelete();

                foreach ($processedItems as $item) {
                    $invoice->details()->create([
                        'product_id' => $item['product_id'],
                        'warehouse_id' => $item['warehouse_id'] ?? $warehouseId,
                        'quantity' => $item['quantity'],
                        'unit_id' => $item['unit_id'],
                        'unit_price' => $item['unit_price'],
                        'discount_amount' => $item['discount_amount'] ?? 0,
                        'tax_amount' => $item['tax_amount'] ?? 0,
                    ]);
                }

                $freshInvoice = $invoice->fresh();

                // P0-06: When updating a posted invoice, create reversal of old journal first
                if ($freshInvoice->is_posted) {
                    $this->createReversalForInvoice($freshInvoice);
                    $this->reverseStockMovementsForInvoice($freshInvoice);
                }

                if ($freshInvoice->is_posted) {
                    $this->upsertJournalEntryForInvoice($freshInvoice);
                    $this->upsertBankReceiptForInvoice($freshInvoice);
                    $this->createStockMovementsForInvoice($freshInvoice);
                }
            });

            return redirect()->back()->with('success', 'Sales Invoice updated successfully.');

        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Error updating invoice: '.$e->getMessage());
        }
    }

    public function post(SalesInvoice $invoice)
    {
        // Multi-company boundary: cross-company invoices are invisible (404).
        abort_unless((int) $invoice->company_id === app(CompanyContext::class)->id(), 404);

        try {
            DB::transaction(function () use ($invoice) {
                // Lock the row so a concurrent double POST cannot post twice.
                $invoice = SalesInvoice::whereKey($invoice->getKey())->lockForUpdate()->firstOrFail();
                $invoice->load('details');

                if ($invoice->is_posted) {
                    return; // Already posted — idempotent no-op.
                }

                $invoice->forceFill([
                    'is_posted' => true,
                    'posted_at' => now(),
                    'posted_by' => Auth::id(),
                ])->save();

                $postedInvoice = $invoice->fresh(['details']);
                // Phase 16 pipeline — STRUCTURAL posting order:
                //   1. apply the WAC outbounds (a refused outbound aborts
                //      before any document or ledger row is written);
                //   2. create the movement documents + link the ICTs;
                //   3. post the journal (valued from the APPLIED ICTs)
                //      and sync the treasury receipt.
                $this->applyInvoiceOutbounds($postedInvoice);
                $this->createStockMovementsForInvoice($postedInvoice);
                $this->postJournalEntryForInvoice($postedInvoice);
                $this->upsertBankReceiptForInvoice($postedInvoice);
            });

            return redirect()->back()->with('success', 'Sales Invoice posted successfully.');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Error posting invoice: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        $invoice = SalesInvoice::findOrFail($id);

        // Multi-company boundary: cross-company invoices are invisible (404).
        // Checked outside the try/catch so the 404 is never swallowed into a
        // session error.
        abort_unless((int) $invoice->company_id === app(CompanyContext::class)->id(), 404);

        try {
            DB::transaction(function () use ($invoice) {
                if ($invoice->is_posted) {
                    // P0-06: Create reversal journal instead of deleting the original
                    $this->createReversalForInvoice($invoice);
                    // Phase 8: reverse cost transactions through the WAC engine
                    // (mirrors GoodsReceiptService::reverseReceipt) instead of
                    // destroying the ledger rows. Originals keep full audit
                    // provenance; products.quantity is rolled back explicitly.
                    $this->reverseStockMovementsForInvoice($invoice);
                    // Reverse bank receipt
                    $this->reverseBankReceiptForInvoice($invoice);
                } else {
                    // Draft invoices can be deleted (no posted journal)
                    $this->deleteJournalEntryForInvoice($invoice);
                    $this->deleteBankReceiptForInvoice($invoice);
                }

                $invoice->details()->delete();
                $invoice->delete();
            });

            return redirect()->back()->with('success', 'Sales Invoice deleted successfully.');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Error deleting invoice: '.$e->getMessage());
        }
    }

    protected function upsertJournalEntryForInvoice(SalesInvoice $invoice): void
    {
        $treasuryId = (int) ($invoice->treasury_id ?? 0);
        if ($treasuryId <= 0) {
            throw new \RuntimeException('Treasury is required.');
        }

        // Phase 9 (treasury/GL coupling): the journal debits the treasury, so
        // the account must belong to the invoice's company (NULL-company
        // accounts are shared master data).
        $companyId = (int) ($invoice->company_id ?? Auth::user()?->company_id ?? 0);
        $treasuryCompanyId = (int) (Account::query()->where('AccID', $treasuryId)->value('company_id') ?? 0);
        if ($treasuryCompanyId !== 0 && $treasuryCompanyId !== $companyId) {
            throw new \RuntimeException('Treasury account does not belong to this company.');
        }

        $revenueAccountId = $this->resolveSalesRevenueAccountId();
        if (! $revenueAccountId) {
            throw new \RuntimeException('Sales revenue account is not configured.');
        }

        $amount = (float) ($invoice->total_amount ?? 0);
        $entryType = 'SalesInvoice';
        $reference = (string) $invoice->invoice_number;
        $status = $invoice->is_posted ? 'Post' : 'UnPost';
        $description = 'Sales Invoice '.$reference;

        $this->ensureOpenFiscalPeriod($invoice->invoice_date);
        // Phase 18: resolve the live, unreversed entry via the
        // journal_reversals link table. If history is fully reversed
        // (deleted-and-reposted invoice numbers) this is null and a FRESH
        // entry is created below — a reversed slot is never resurrected.
        $header = app(JournalReversalService::class)
            ->unreversedEntryFor($reference, $entryType, null, lock: true);

        if ($header) {
            $header->update([
                'date' => $invoice->invoice_date,
                'description' => $description,
                'total_amount' => $amount,
                'status' => $status,
                'company_id' => $companyId, // heal legacy unstamped rows
            ]);

            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $entryCode = $header->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => $entryType,
                'reference' => $reference,
                'date' => $invoice->invoice_date,
                'description' => $description,
                'total_amount' => $amount,
                'status' => $status,
                'company_id' => $companyId,
            ]);
        }

        $lines = [
            [
                'account_id' => $treasuryId,
                'debit' => $amount,
                'credit' => 0,
                'desc' => $description,
            ],
            [
                'account_id' => $revenueAccountId,
                'debit' => 0,
                'credit' => $amount,
                'desc' => $description,
            ],
        ];

        // Add COGS/Inventory lines for posted invoices
        if ($invoice->is_posted) {
            $cogsAmount = $this->calculateCogsAmount($invoice);
            if ($cogsAmount > 0) {
                $cogsAccountId = $this->resolveCogsAccountId();
                $inventoryAccountId = $this->resolveInventoryAssetAccountId();

                if ($cogsAccountId && $inventoryAccountId) {
                    $lines[] = [
                        'account_id' => $cogsAccountId,
                        'debit' => round($cogsAmount, 2),
                        'credit' => 0,
                        'desc' => 'COGS - ' . $description,
                    ];
                    $lines[] = [
                        'account_id' => $inventoryAccountId,
                        'debit' => 0,
                        'credit' => round($cogsAmount, 2),
                        'desc' => 'Inventory reduction - ' . $description,
                    ];
                }
            }
        }

        foreach ($lines as $line) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $line['account_id'],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'related_id_name' => $entryType,
                'related_name_details' => $reference,
                'description' => $line['desc'],
                'cost_center_code' => null,
                'company_id' => $companyId,
            ]);
        }

        // Sync account_postings cache for Trial Balance consistency
        if ($companyId) {
            app(PostingService::class)->recalculatePostings($companyId);
        }
    }

    /**
     * P0-06: Create a reversal journal for a posted Sales Invoice.
     * Preserves original journal for audit trail.
     */
    protected function createReversalForInvoice(SalesInvoice $invoice): void
    {
        $entryType = 'SalesInvoice';
        $reference = (string) $invoice->invoice_number;

        // Phase 18: the unreversed live entry via the link table — never a
        // '-REV' history row and never an already-reversed slot.
        $header = app(JournalReversalService::class)
            ->unreversedEntryFor($reference, $entryType);

        if ($header) {
            app(JournalReversalService::class)->createReversal(
                $header->entry_code,
                'Sales Invoice deletion - ' . $reference
            );
        }
    }

    /**
     * P0-06: Reverse bank receipt for a deleted posted invoice.
     */
    protected function reverseBankReceiptForInvoice(SalesInvoice $invoice): void
    {
        $receipt = TreasuryTransaction::where('related_invoice_id', $invoice->id)
            ->where('related_invoice_type', 'SalesInvoice')
            ->first();

        if ($receipt) {
            app(TreasuryService::class)->deleteTransaction($receipt);
        }
    }

    protected function deleteJournalEntryForInvoice(SalesInvoice $invoice): void
    {
        $entryType = 'SalesInvoice';
        $reference = (string) $invoice->invoice_number;

        // Phase 18: the unreversed live entry via the link table — reversed
        // history (posted-deletion audit trail) is never adopted for a
        // draft delete.
        $header = app(JournalReversalService::class)
            ->unreversedEntryFor($reference, $entryType);

        if (! $header) {
            return;
        }

        // P0-06: Only allow deletion of unposted journals
        if (in_array($header->status, ['Post', 'posted'])) {
            return; // Should not reach here — destroy() handles posted invoices via reversal
        }

        JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
        JournalEntry::where('entry_code', $header->entry_code)->delete();
    }

    protected function resolveSalesRevenueAccountId(): ?int
    {
        $row = Account::query()
            ->where('AccType', 1)
            ->where('AccStopped', false)
            ->where('AccFinal', 1)
            ->where('AccCode', 'like', '4%')
            ->orderBy('AccCode')
            ->value('AccID');

        return $row ? (int) $row : null;
    }

    /**
     * Resolve the COGS account (Account 501 - Cost of Sales).
     */
    protected function resolveCogsAccountId(): ?int
    {
        $row = Account::query()
            ->where('AccCode', 'like', '5%')
            ->where('AccType', 1)
            ->orderBy('AccCode')
            ->value('AccID');

        return $row ? (int) $row : null;
    }

    /**
     * Resolve the Inventory Asset account (11401 - Main Warehouse).
     */
    protected function resolveInventoryAssetAccountId(): ?int
    {
        // P0-FIX: Use exact match for Inventory Asset account (11401).
        return Account::where('AccCode', '11401')
            ->value('AccID');
    }

    /**
     * Calculate COGS amount for a posted Sales Invoice.
     * COGS = sum(quantity × cost_per_item) for each invoice detail.
     *
     * Uses products.cost_per_item as the authoritative inventory cost basis.
     * This is the SAME cost used by createStockMovementsForInvoice.
     */
    protected function calculateCogsAmount(SalesInvoice $invoice): float
    {
        $invoice->load('details');
        $totalCogs = '0.000000';
        $unitConversion = app(UnitConversionService::class);

        foreach ($invoice->details as $detail) {
            $conversion = $unitConversion->toBase(
                (int) $detail->product_id,
                (int) $detail->unit_id,
                (string) $detail->quantity
            );
            $quantity = $conversion['base_quantity'];
            if (bccomp($quantity, '0', 6) <= 0) {
                continue;
            }

            $costTransaction = $this->invoiceOutboundTxs[(int) $detail->id]
                ?? null;

            if ($costTransaction === null) {
                // Legacy chain (posted pre-Phase-15): outbounds not applied
                // yet — apply them now (idempotent) so the COGS valuation
                // always reflects the real, applied ledger effects.
                $costTransaction = $this->weightedAverageCost()->applyOutbound(
                    (int) $detail->product_id,
                    (int) ($detail->warehouse_id ?: $invoice->warehouse_id),
                    $quantity,
                    'sales_invoice_detail',
                    (int) $detail->id,
                    (string) $invoice->invoice_date,
                );
            }

            $totalCogs = bcadd($totalCogs, bcsub('0', (string) $costTransaction->value_delta, 6), 6);

            // Phase 15: remember the ICT so the movement step can link it to
            // its own line (movement_header_id/movement_line_id) — sales ICTs
            // used to post with NULL links, which forced the reversal step to
            // guess provenance by product + quantity.
            $this->invoiceOutboundTxs[(int) $detail->id] = $costTransaction;
        }

        return (float) $totalCogs;
    }

    protected function generateNextEntryCode(): string
    {
        $nextNumber = $this->journalCodeStart;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, (int) $this->nextNumericPart($entryCode, $this->journalCodeStart));
        }

        do {
            $entryCode = $this->journalCodePrefix.$nextNumber;
            $nextNumber++;
        } while (JournalEntry::where('entry_code', $entryCode)->exists());

        return $entryCode;
    }

    protected function upsertBankReceiptForInvoice(SalesInvoice $invoice): void
    {
        $bankAccount = BankAccount::where('gl_account_id', $invoice->treasury_id)->first();

        if (!$bankAccount) {
            $this->deleteBankReceiptForInvoice($invoice);
            return;
        }

        $receipt = TreasuryTransaction::where('related_invoice_id', $invoice->id)
            ->where('related_invoice_type', 'SalesInvoice')
            ->first();
        
        $customer = $invoice->customer;
        if (!$customer) {
            $customer = \App\Models\Client_Sales\Customer::find($invoice->customer_id);
        }
        
        $payerId = $customer ? $customer->account_id : null;
        if (!$payerId) {
            $payerId = Account::where('AccCode', 'like', '12%')->where('AccType', 1)->value('AccID');
        }

        $amount = (float) $invoice->paid_amount;
        if ($amount <= 0) {
            $this->deleteBankReceiptForInvoice($invoice);
            return;
        }

        $data = [
            'transaction_type' => 'deposit',
            'destination_account_type' => 'bank',
            'destination_account_id' => $bankAccount->id,
            'transaction_date' => $invoice->invoice_date,
            'counterparty_type' => 'customer',
            'counterparty_id' => $payerId,
            'amount' => $amount,
            'reference' => $invoice->invoice_number,
            'notes' => 'Bank receipt generated from Sales Invoice #' . $invoice->invoice_number,
            'status' => 'posted',
            'company_id' => app(CompanyContext::class)->id(),
            'related_invoice_id' => $invoice->id,
            'related_invoice_type' => 'SalesInvoice',
        ];

        if ($receipt) {
            app(TreasuryService::class)->updateTransaction($receipt, $data);
        } else {
            app(TreasuryService::class)->createTransaction($data);
        }
    }

    protected function deleteBankReceiptForInvoice(SalesInvoice $invoice): void
    {
        $receipt = TreasuryTransaction::where('related_invoice_id', $invoice->id)
            ->where('related_invoice_type', 'SalesInvoice')
            ->first();
            
        if ($receipt) {
            app(TreasuryService::class)->deleteTransaction($receipt);
        }
    }

    protected function nextNumericPart(?string $code, int $fallbackStart): int
    {
        if (! $code) {
            return $fallbackStart;
        }

        if (preg_match('/(\d+)\s*$/', $code, $matches)) {
            return (int) $matches[1] + 1;
        }

        return $fallbackStart;
    }

    /**
     * PHASE 3 of the posting pipeline — post the journal (valued from the
     * APPLIED ICTs, which phase 1 has already written or phase 2 has
     * linked). The documents exist by the time this runs — the posting
     * order is STRUCTURAL now, not conventional. Kept as a thin wrapper
     * over the historical upsert so legacy one-step chains (journal →
     * movements via calculateCogsAmount's idempotent fallback) keep
     * working for external callers.
     */
    protected function postJournalEntryForInvoice(SalesInvoice $invoice): void
    {
        $this->upsertJournalEntryForInvoice($invoice);
    }

    /**
     * PHASE 1 of the posting pipeline — apply the WAC outbounds.
     *
     * Applies one outbound ICT per detail (ledger effects only: no movement
     * rows, no derived quantity) and remembers the applied ICTs so later
     * phases can link and value from them without re-deriving provenance.
     *
     * Phase 16 restructure: this used to be hidden inside
     * `calculateCogsAmount` during the JOURNAL step, making the
     * documents-before-journal order a convention nobody could see or
     * enforce. Now the pipeline reads top-down:
     *   applyInvoiceOutbounds → createStockMovementsForInvoice →
     *   postJournalEntryForInvoice (+ receipt), and a refused outbound
     *   (`Insufficient weighted-average inventory`) aborts BEFORE any
     *   document or ledger row is written.
     *
     * Each detail's application is idempotent at the ENGINE level: the ICT
     * is keyed by (company, product, warehouse, source_type, source_id), so
     * re-running phase 1 after a crash returns the existing rows instead of
     * double-applying.
     *
     * @return array<int, InventoryCostTransaction> detail id → applied ICT
     */
    protected function applyInvoiceOutbounds(SalesInvoice $invoice): array
    {
        $applied = [];
        $invoice->loadMissing('details');
        $unitConversion = app(UnitConversionService::class);

        foreach ($invoice->details as $detail) {
            $conversion = $unitConversion->toBase(
                (int) $detail->product_id,
                (int) $detail->unit_id,
                (string) $detail->quantity
            );
            $quantity = $conversion['base_quantity'];
            if (bccomp($quantity, '0', 6) <= 0) {
                continue;
            }

            $applied[(int) $detail->id] = $this->weightedAverageCost()->applyOutbound(
                (int) $detail->product_id,
                (int) ($detail->warehouse_id ?: $invoice->warehouse_id),
                $quantity,
                'sales_invoice_detail',
                (int) $detail->id,
                (string) $invoice->invoice_date,
            );
        }

        $this->invoiceOutboundTxs = $applied;

        return $applied;
    }

    /**
     * PHASE 2 of the posting pipeline — create the movement DOCUMENTS and
     * link the applied ICTs to their own immutable lines.
     * Idempotent: skips if movements already exist for this invoice.
     *
     * Phase 15: each movement line is created BEFORE its detail's outbound
     * ICT is linked to it (movement_header_id/movement_line_id), so the
     * reversal step can pair every ICT with its own immutable line instead
     * of guessing provenance by product + quantity.
     */
    protected function createStockMovementsForInvoice(SalesInvoice $invoice): void
    {
        // Check for existing movements (idempotency)
        $existingMovements = DB::table('inventory_movement_headers')
            ->where('reference_id', $invoice->id)
            ->where('reference_type', 'sales_invoice')
            ->count();

        if ($existingMovements > 0) {
            return; // Already deducted
        }

        $invoice->load('details');
        $warehouseId = $invoice->warehouse_id;
        $unitConversion = app(UnitConversionService::class);

        $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $invoice->invoice_date,
            'type' => 'sale',
            'direction' => 'out',
            'reference_id' => $invoice->id,
            'reference_type' => 'sales_invoice',
            'voucher_num' => $invoice->invoice_number,
            'warehouse_id' => $warehouseId,
            'company_id' => app(CompanyContext::class)->id(),
            'created_by' => Auth::id(),
            'notes' => "Sales Invoice: {$invoice->invoice_number}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($invoice->details as $detail) {
            $conversion = $unitConversion->toBase(
                (int) $detail->product_id,
                (int) $detail->unit_id,
                (string) $detail->quantity
            );
            $baseQuantity = $conversion['base_quantity'];
            if (bccomp($baseQuantity, '0', 6) <= 0) {
                continue;
            }

            // Phase 15: the journal step has already applied the outbound ICT
            // for this detail (memory first, idempotent re-read as fallback).
            // The line is created FIRST, then the ICT is linked to it — every
            // sales ICT now carries its immutable movement-line provenance,
            // like every other lifecycle.
            $costTransaction = $this->invoiceOutboundTxs[(int) $detail->id]
                ?? \App\Models\InventoryCostTransaction::query()
                    ->where('company_id', app(CompanyContext::class)->id())
                    ->where('source_type', 'sales_invoice_detail')
                    ->where('source_id', $detail->id)
                    ->latest('id')
                    ->firstOrFail();
            $costPrice = (string) $costTransaction->unit_cost;

            $movementLineId = DB::table('inventory_movement_lines')->insertGetId([
                'stock_movement_id' => $movementHeaderId,
                'product_id' => $detail->product_id,
                'unit_id' => $detail->unit_id,
                'quantity' => $baseQuantity,
                'original_quantity' => $detail->quantity,
                'conversion_factor_snapshot' => $conversion['conversion_factor'],
                'cost_price' => $costPrice,
                'purchase_invoice_detail_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ((int) $costTransaction->movement_line_id !== $movementLineId) {
                \App\Models\InventoryCostTransaction::query()
                    ->where('id', $costTransaction->id)
                    ->whereNull('movement_line_id') // never rewrite an already-linked ICT
                    ->update([
                        'movement_header_id' => $movementHeaderId,
                        'movement_line_id' => $movementLineId,
                    ]);
            }

            // Deduct product quantity
            DB::table('products')
                ->where('id', $detail->product_id)
                ->decrement('quantity', $baseQuantity);
        }
    }

    protected function resolveHistoricalCostPrice(int $productId): float
    {
        $movement = DB::table('inventory_movement_lines as lines')
            ->join('inventory_movement_headers as headers', 'headers.id', '=', 'lines.stock_movement_id')
            ->where('lines.product_id', $productId)
            ->where('headers.direction', 'in')
            ->whereIn('headers.type', ['opening', 'purchase'])
            ->orderByDesc('headers.movement_date')
            ->orderByDesc('headers.id')
            ->select('lines.cost_price')
            ->first();

        if (! $movement) {
            throw new \RuntimeException('No historical inventory cost exists for product '.$productId.'.');
        }

        return (float) $movement->cost_price;
    }

    /**
     * Reverse inventory movements for a Sales Invoice.
     *
     * Phase 8 (aligned with GoodsReceiptService::reverseReceipt): the WAC
     * engine keeps its audit trail — outbounds are reversed via
     * WeightedAverageCostService::reverse (refuses if the stock was consumed)
     * and movement rows are stamped [REVERSED date] instead of deleted.
     *
     * Phase 15: ICTs are paired to their reversal by the movement_line_id
     * link (written by the Phase 15 posting step); legacy unlinked rows fall
     * back to a grouped per-detail lookup that consumes one un-reversed ICT
     * per line, so same-shape lines can never drain the same ICT twice.
     *
     * Idempotency backstop FIRST: movements already stamped [REVERSED] were
     * reversed before — return unchanged.
     */
    protected function reverseStockMovementsForInvoice(SalesInvoice $invoice): void
    {
        $companyId = (int) ($invoice->company_id ?: app(CompanyContext::class)->id());
        $today = now()->toDateString();

        $alreadyReversed = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoice->id)
            ->where('notes', 'like', '%[REVERSED%')
            ->exists();

        if ($alreadyReversed) {
            return;
        }

        $headers = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoice->id)
            ->orderBy('id')
            ->get();

        foreach ($headers as $header) {
            $lines = DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $header->id)
                ->orderBy('id')
                ->get();

            // Legacy fallback occurrence counters: lines AND details are both
            // created per-detail in order, so the n-th same-shape line (same
            // product + original quantity) pairs with the n-th same-shape
            // detail — first() alone would map EVERY line to the first detail
            // and never reach its twin.
            $shapeCounters = [];

            // Phase 15: pair every applied outbound ICT with its OWN immutable
            // movement line. Since Phase 15 the ICT carries movement_line_id
            // (linked by the posting step); legacy rows (posted before the
            // link existed) are paired per line by the grouped fallback below.
            $lineIds = $lines->pluck('id');

            $linkedTxs = \App\Models\InventoryCostTransaction::query()
                ->where('company_id', $companyId)
                ->where('source_type', 'sales_invoice_detail')
                ->whereIn('movement_line_id', $lineIds)
                ->whereNull('reversal_of_id')
                ->whereNotExists(function ($q) {
                    $q->selectRaw(1)
                        ->from('inventory_cost_transactions as rev')
                        ->whereColumn('rev.reversal_of_id', 'inventory_cost_transactions.id')
                        ->where('rev.source_type', 'sales_invoice_reversal');
                })
                ->orderBy('id')
                ->get()
                ->groupBy('movement_line_id');

            foreach ($lines as $line) {
                $group = $linkedTxs->get((int) $line->id);

                if ($group === null) {
                    // Legacy fallback: this line predates ICT links. Lines and
                    // details share creation order, so the n-th same-shape
                    // line takes the n-th same-shape detail, and ONE still-
                    // un-reversed ICT per call — two same-shape lines can
                    // never drain the same detail's ICTs twice (the
                    // pre-Phase-15 fuzzy first() could reverse one ICT twice
                    // and leave its twin live forever).
                    $shapeKey = $line->product_id.':'.(string) $line->original_quantity;
                    $occurrence = $shapeCounters[$shapeKey] ?? 0;
                    $shapeCounters[$shapeKey] = $occurrence + 1;

                    $detail = DB::table('sales_invoice_details')
                        ->where('invoice_id', $invoice->id)
                        ->where('product_id', $line->product_id)
                        ->where('quantity', $line->original_quantity)
                        ->orderBy('id')
                        ->skip($occurrence)
                        ->first();

                    $tx = null;
                    if ($detail) {
                        $tx = \App\Models\InventoryCostTransaction::query()
                            ->where('company_id', $companyId)
                            ->where('source_type', 'sales_invoice_detail')
                            ->where('source_id', $detail->id)
                            ->whereNull('reversal_of_id')
                            ->whereNotExists(function ($q) {
                                $q->selectRaw(1)
                                    ->from('inventory_cost_transactions as rev')
                                    ->whereColumn('rev.reversal_of_id', 'inventory_cost_transactions.id')
                                    ->where('rev.source_type', 'sales_invoice_reversal');
                            })
                            ->orderBy('id')
                            ->first();
                    }
                    $group = $tx ? collect([$tx]) : null;
                }

                foreach ($group ?? [] as $outboundTx) {
                    app(WeightedAverageCostService::class)->reverse(
                        (int) $outboundTx->id,
                        max((string) $header->movement_date, $today),
                        'sales_invoice_reversal',
                        (int) $outboundTx->id,
                    );
                }

                // Derived quantity rollback: posting decremented the product by
                // the base quantity — undo exactly that.
                DB::table('products')
                    ->where('id', $line->product_id)
                    ->increment('quantity', (float) $line->quantity);
            }

            // Audit stamp (stock card remains visible with the reversal note).
            DB::table('inventory_movement_headers')
                ->where('id', $header->id)
                ->update([
                    'notes' => DB::raw("CONCAT(COALESCE(notes, ''), ' [REVERSED {$today}]')"),
                ]);
        }
    }
}
