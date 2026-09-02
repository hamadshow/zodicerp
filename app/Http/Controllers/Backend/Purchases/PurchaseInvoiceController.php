<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Traits\EnsuresFiscalPeriod;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use App\Models\Currency;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseInvoiceController extends Controller
{
    use EnsuresFiscalPeriod;
    protected string $journalCodePrefix = 'QID-';
    protected int $journalCodeStart = 10001;

    /**
     * Create journal entry for purchase invoice:
     *   Dr Purchase/Inventory Expense (total - tax)
     *   Dr Input Tax (tax_amount)
     *   Cr Accounts Payable (total_amount)
     */
    protected function createJournalEntryForInvoice(PurchaseInvoice $invoice, array $validated): void
    {
        $totalAmount = (float) ($validated['total_amount'] ?? 0);
        $taxAmount = (float) ($validated['tax_amount'] ?? 0);
        $netAmount = $totalAmount - $taxAmount;

        $purchaseAccountId = $this->resolvePurchaseAccountId();
        $apAccountId = $this->resolveAccountsPayableAccountId($invoice->supplier_id);
        $taxAccountId = $this->resolveInputTaxAccountId();

        if (!$purchaseAccountId || !$apAccountId) {
            throw new \RuntimeException('Required accounts not configured for purchase journal entry.');
        }

        $reference = $invoice->invoice_number;
        $status = 'Post';
        $invoiceDate = $validated['invoice_date'] ?? $invoice->invoice_date;

        // Upsert pattern: update existing journal or create new (idempotent)
        $this->ensureOpenFiscalPeriod($invoiceDate);
        $existingHeader = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'PurchaseInvoice')
            ->first();

        if ($existingHeader) {
            $existingHeader->update([
                'date' => $invoiceDate,
                'total_amount' => $totalAmount,
                'status' => $status,
            ]);
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $entryCode = $existingHeader->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'PurchaseInvoice',
                'reference' => $reference,
                'date' => $invoiceDate,
                'description' => 'Purchase Invoice ' . $reference,
                'total_amount' => $totalAmount,
                'status' => $status,
            ]);
        }

        // Dr Purchase/Inventory Expense
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $purchaseAccountId,
            'debit' => $netAmount,
            'credit' => 0,
            'related_id_name' => 'PurchaseInvoice',
            'related_name_details' => $reference,
            'description' => 'Purchase Invoice ' . $reference,
        ]);

        // Dr Input Tax (if applicable)
        if ($taxAmount > 0 && $taxAccountId) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $taxAccountId,
                'debit' => $taxAmount,
                'credit' => 0,
                'related_id_name' => 'PurchaseInvoice',
                'related_name_details' => $reference,
                'description' => 'Input Tax on ' . $reference,
            ]);
        }

        // Cr Accounts Payable
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $apAccountId,
            'debit' => 0,
            'credit' => $totalAmount,
            'related_id_name' => 'PurchaseInvoice',
            'related_name_details' => $reference,
            'description' => 'Accounts Payable - ' . $reference,
        ]);

        // Sync account_postings cache for Trial Balance consistency
        $companyId = Auth::user()?->company_id;
        if ($companyId) {
            app(PostingService::class)->recalculatePostings($companyId);
        }
    }

    protected function deleteJournalEntryForInvoice(PurchaseInvoice $invoice): void
    {
        $header = JournalEntry::where('reference', $invoice->invoice_number)
            ->where('entry_type', 'PurchaseInvoice')
            ->first();

        if ($header) {
            JournalEntryLine::where('journal_entry_code', $header->entry_code)->delete();
            $header->delete();
        }
    }

    protected function resolvePurchaseAccountId(): ?int
    {
        return Account::query()
            ->where('AccType', 1)
            ->where('AccStopped', false)
            ->where('AccCode', 'like', '5%')
            ->orderBy('AccCode')
            ->value('AccID');
    }

    protected function resolveAccountsPayableAccountId(?int $supplierId = null): ?int
    {
        // Try supplier-specific account first
        if ($supplierId) {
            $supplier = Supplier::find($supplierId);
            if ($supplier && $supplier->account_id) {
                return $supplier->account_id;
            }
        }
        // Fall back to default AP account (2xxx)
        return Account::query()
            ->where('AccType', 1)
            ->where('AccCode', 'like', '2%')
            ->orderBy('AccCode')
            ->value('AccID');
    }

    protected function resolveInputTaxAccountId(): ?int
    {
        return Account::query()
            ->where('AccType', 1)
            ->where(function ($q) {
                $q->where('AccCode', 'like', '2.1.3%')
                  ->orWhere('AccCode', 'like', '213%');
            })
            ->value('AccID');
    }

    protected function generateNextEntryCode(): string
    {
        $nextNumber = $this->journalCodeStart;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            if (preg_match('/(\d+)$/', $entryCode, $matches)) {
                $nextNumber = max($nextNumber, (int) $matches[1] + 1);
            }
        }

        return $this->journalCodePrefix . $nextNumber;
    }

    public function index(Request $request)
    {
        $query = PurchaseInvoice::query()
            ->with(['supplier', 'currency', 'creator', 'items'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name_ar', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('payment_status', $request->input('status'));
        }

        $invoices = $query->paginate(10)->withQueryString();

        // Load shared data for filters/modals
        $suppliers = Supplier::where('is_active', true)
            ->select('id', 'name_ar', 'currency_id')
            ->get();
        $currencies = Currency::where('status', 'active')
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $products = Products::select('id', 'name as name_en', 'name as name_ar', 'sku', 'sale_price', 'cost_per_item as purchase_price')
            ->get();
        $units = ItemUnit::select('id', 'name as name_en', 'name as name_ar')->where('unit_type', 1)->get();
        $warehouses = Warehouses::select('id', 'name as name_en', 'name as name_ar')->get();

        // Mock data for terms (should be replaced with actual models later)
        $paymentTerms = [
            ['id' => 1, 'name' => 'Net 30'],
            ['id' => 2, 'name' => 'Net 60'],
            ['id' => 3, 'name' => 'Cash on Delivery'],
            ['id' => 4, 'name' => 'Advance Payment'],
        ];

        return Inertia::render('Backend/04-Purchases/PurchaseInvoice', [
            'invoices' => $invoices,
            'suppliers' => $suppliers,
            'currencies' => $currencies,
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'paymentTerms' => $paymentTerms,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'invoice_type' => 'required|in:standard,proforma,credit_note,debit_note',
            'payment_status' => 'required|in:unpaid,partial,paid,overdue',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate number if not provided
            $number = $request->invoice_number ?? 'INV-'.date('Ymd').'-'.rand(1000, 9999);

            // Default warehouse if not provided (should be provided in real app)
            $defaultWarehouseId = Warehouses::first()->id ?? 1;
            $warehouseId = $request->warehouse_id ?? $defaultWarehouseId;

            $invoice = PurchaseInvoice::create([
                'invoice_number' => $number,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'supplier_id' => $request->supplier_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'invoice_type' => $request->invoice_type,
                'payment_status' => $request->payment_status,
                'notes' => $request->notes,
                'created_by' => Auth::id(),
                'warehouse_id' => $warehouseId,

                // Financials
                'subtotal' => $request->subtotal ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'discount_amount' => $request->discount_amount ?? 0,
                'shipping_cost' => $request->shipping_cost ?? 0,
                'other_costs' => $request->other_costs ?? 0,
                'total_amount' => $request->total_amount ?? 0,
                'paid_amount' => $request->paid_amount ?? 0,
                // balance_amount is generated

                'payment_terms' => $request->payment_terms_id, // Note: column is payment_terms (string) or use ID if schema changed. Schema says string(255).
            ]);

            foreach ($validated['items'] as $index => $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $item['warehouse_id'] ?? $warehouseId,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'tax_percentage' => $item['tax_percent'] ?? $item['tax_percentage'] ?? 0,
                ]);
            }

            // Create journal entry only for standard invoices (not proforma)
            if (($validated['invoice_type'] ?? 'standard') === 'standard') {
                $this->createJournalEntryForInvoice($invoice, $validated);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Invoice created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error creating invoice: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $invoice = PurchaseInvoice::findOrFail($id);

        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'supplier_id' => 'required|exists:suppliers,id',
            'currency_id' => 'required|exists:currencies,id',
            'exchange_rate' => 'required|numeric|min:0',
            'invoice_type' => 'required|in:standard,proforma,credit_note,debit_note',
            'payment_status' => 'required|in:unpaid,partial,paid,overdue',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_id' => 'required|exists:item_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $defaultWarehouseId = Warehouses::first()->id ?? 1;
            $warehouseId = $request->warehouse_id ?? $invoice->warehouse_id ?? $defaultWarehouseId;

            $invoice->update([
                'invoice_number' => $request->invoice_number,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'supplier_id' => $request->supplier_id,
                'currency_id' => $request->currency_id,
                'exchange_rate' => $request->exchange_rate,
                'invoice_type' => $request->invoice_type,
                'payment_status' => $request->payment_status,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
                'warehouse_id' => $warehouseId,
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'discount_amount' => $request->discount_amount,
                'shipping_cost' => $request->shipping_cost,
                'other_costs' => $request->other_costs,
                'total_amount' => $request->total_amount,
                'paid_amount' => $request->paid_amount,
                'payment_terms' => $request->payment_terms_id,
            ]);

            // Sync items: Delete old and re-create
            $invoice->items()->delete();

            foreach ($validated['items'] as $index => $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $item['warehouse_id'] ?? $warehouseId,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'tax_percentage' => $item['tax_percent'] ?? $item['tax_percentage'] ?? 0,
                ]);
            }

            // Sync journal entry on update (only for standard invoices)
            if (($validated['invoice_type'] ?? 'standard') === 'standard') {
                $this->createJournalEntryForInvoice($invoice->fresh(), $validated);
            } else {
                // If changed to proforma, remove existing journal entry
                $this->deleteJournalEntryForInvoice($invoice->fresh());
            }

            DB::commit();

            return redirect()->back()->with('success', 'Purchase Invoice updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error updating invoice: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $invoice = PurchaseInvoice::findOrFail($id);
            $this->deleteJournalEntryForInvoice($invoice);
            $invoice->delete(); // Soft delete

            return redirect()->back()->with('success', 'Purchase Invoice deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting invoice: '.$e->getMessage());
        }
    }
}
