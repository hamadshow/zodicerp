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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesInvoiceController extends Controller
{
    use EnsuresFiscalPeriod;
    protected string $journalCodePrefix = 'QID-';

    protected int $journalCodeStart = 10001;

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
            DB::transaction(function () use ($request, $validated) {
                $number = $request->invoice_number ?? 'SINV-'.date('Ymd').'-'.rand(1000, 9999);

                $defaultWarehouseId = Warehouses::query()->value('id') ?? 1;
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
                    'warehouse_id' => $warehouseId,

                    'subtotal' => $request->subtotal ?? 0,
                    'tax_amount' => $request->tax_amount ?? 0,
                    'discount_amount' => $request->discount_amount ?? 0,
                    'shipping_cost' => $request->shipping_cost ?? 0,
                    'other_charges' => $request->other_charges ?? 0,
                    'total_amount' => $request->total_amount ?? 0,
                    'paid_amount' => $request->paid_amount ?? 0,

                    'payment_terms' => $request->payment_terms,
                ]);

                foreach ($validated['items'] as $item) {
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

                $this->upsertJournalEntryForInvoice($invoice);
                $this->upsertBankReceiptForInvoice($invoice);

                // Stock deduction — only for posted invoices
                if ($invoice->is_posted) {
                    $this->createStockMovementsForInvoice($invoice);
                }
            });

            return redirect()->back()->with('success', 'Sales Invoice created successfully.');

        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Error creating invoice: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $invoice = SalesInvoice::findOrFail($id);

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
            DB::transaction(function () use ($request, $validated, $invoice) {
                $defaultWarehouseId = Warehouses::query()->value('id') ?? 1;
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

                    'updated_by' => Auth::id(),
                    'warehouse_id' => $warehouseId,
                    'subtotal' => $request->subtotal,
                    'tax_amount' => $request->tax_amount,
                    'discount_amount' => $request->discount_amount,
                    'shipping_cost' => $request->shipping_cost,
                    'other_charges' => $request->other_charges,
                    'total_amount' => $request->total_amount,
                    'paid_amount' => $request->paid_amount,
                    'payment_terms' => $request->payment_terms,
                ]);

                $invoice->details()->withTrashed()->forceDelete();

                foreach ($validated['items'] as $item) {
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

                $this->upsertJournalEntryForInvoice($freshInvoice);
                $this->upsertBankReceiptForInvoice($freshInvoice);

                // Stock deduction — create new movements for posted invoices
                if ($freshInvoice->is_posted) {
                    $this->createStockMovementsForInvoice($freshInvoice);
                }
            });

            return redirect()->back()->with('success', 'Sales Invoice updated successfully.');

        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Error updating invoice: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $invoice = SalesInvoice::findOrFail($id);

                if ($invoice->is_posted) {
                    // P0-06: Create reversal journal instead of deleting the original
                    $this->createReversalForInvoice($invoice);
                    // Reverse stock movements
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
        $header = JournalEntry::where('reference', $reference)
            ->where('entry_type', $entryType)
            ->lockForUpdate()
            ->first();

        if ($header) {
            $header->update([
                'date' => $invoice->invoice_date,
                'description' => $description,
                'total_amount' => $amount,
                'status' => $status,
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
            ]);
        }

        // Sync account_postings cache for Trial Balance consistency
        $companyId = $invoice->company_id ?? Auth::user()?->company_id;
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

        $header = JournalEntry::where('reference', $reference)
            ->where('entry_type', $entryType)
            ->first();

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

        $header = JournalEntry::where('reference', $reference)
            ->where('entry_type', $entryType)
            ->first();

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
        $totalCogs = 0.0;

        foreach ($invoice->details as $detail) {
            $qty = (float) $detail->quantity;
            if ($qty <= 0) {
                continue;
            }

            $product = DB::table('products')->where('id', $detail->product_id)->first();
            $costPrice = (float) ($product->cost_per_item ?? 0);

            $totalCogs += $qty * $costPrice;
        }

        return $totalCogs;
    }

    protected function generateNextEntryCode(): string
    {
        $nextNumber = $this->journalCodeStart;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, (int) $this->nextNumericPart($entryCode, $this->journalCodeStart));
        }

        return $this->journalCodePrefix.$nextNumber;
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

        $data = [
            'transaction_type' => 'deposit',
            'destination_account_type' => 'bank',
            'destination_account_id' => $bankAccount->id,
            'transaction_date' => $invoice->invoice_date,
            'counterparty_type' => 'customer',
            'counterparty_id' => $payerId,
            'amount' => $invoice->paid_amount > 0 ? $invoice->paid_amount : $invoice->total_amount,
            'reference' => $invoice->invoice_number,
            'notes' => 'Bank receipt generated from Sales Invoice #' . $invoice->invoice_number,
            'status' => 'posted',
            'company_id' => $invoice->company_id,
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
     * Create inventory movements (direction: out) for a posted Sales Invoice.
     * Idempotent: skips if movements already exist for this invoice.
     */
    protected function createStockMovementsForInvoice(SalesInvoice $invoice): void
    {
        // Check for existing movements (idempotency)
        $existingMovements = DB::table('inventory_movement_headers')
            ->where('reference_id', $invoice->id)
            ->where('reference_type', 'SalesInvoice')
            ->count();

        if ($existingMovements > 0) {
            return; // Already deducted
        }

        $invoice->load('details');
        $warehouseId = $invoice->warehouse_id;

        $movementHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $invoice->invoice_date,
            'type' => 'sale',
            'direction' => 'out',
            'reference_id' => $invoice->id,
            'reference_type' => 'SalesInvoice',
            'voucher_num' => $invoice->invoice_number,
            'warehouse_id' => $warehouseId,
            'company_id' => $invoice->company_id ?? Auth::user()?->company_id ?? 1,
            'created_by' => Auth::id(),
            'notes' => "Sales Invoice: {$invoice->invoice_number}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($invoice->details as $detail) {
            $qty = (float) $detail->quantity;
            if ($qty <= 0) {
                continue;
            }

            // Get cost from product
            $product = DB::table('products')->where('id', $detail->product_id)->first();
            $costPrice = (float) ($product->cost_per_item ?? 0);

            DB::table('inventory_movement_lines')->insert([
                'stock_movement_id' => $movementHeaderId,
                'product_id' => $detail->product_id,
                'unit_id' => $detail->unit_id,
                'quantity' => $qty,
                'cost_price' => $costPrice,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Deduct product quantity
            DB::table('products')
                ->where('id', $detail->product_id)
                ->decrement('quantity', $qty);
        }
    }

    /**
     * Reverse inventory movements for a Sales Invoice.
     * Restores product quantities and deletes movement records.
     */
    protected function reverseStockMovementsForInvoice(SalesInvoice $invoice): void
    {
        $headers = DB::table('inventory_movement_headers')
            ->where('reference_id', $invoice->id)
            ->where('reference_type', 'SalesInvoice')
            ->get();

        foreach ($headers as $header) {
            // Reverse product quantities
            $lines = DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $header->id)
                ->get();

            foreach ($lines as $line) {
                DB::table('products')
                    ->where('id', $line->product_id)
                    ->increment('quantity', (float) $line->quantity);
            }

            DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $header->id)
                ->delete();
        }

        DB::table('inventory_movement_headers')
            ->where('reference_id', $invoice->id)
            ->where('reference_type', 'SalesInvoice')
            ->delete();
    }
}
