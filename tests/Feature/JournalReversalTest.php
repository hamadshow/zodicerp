<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * MySQL integration tests for journal reversal and audit integrity.
 *
 * Tests that posted financial transactions create reversal journals
 * instead of deleting the original when cancelled/deleted.
 *
 * Does NOT use RefreshDatabase (remote MySQL too slow).
 * Uses the existing database and cleans up after each test.
 */
class JournalReversalTest extends TestCase
{
    protected int $companyId = 1;
    protected int $testUserId = 1;
    private array $cleanupRefs = [];
    private array $cleanupEntryCodes = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        $accountCount = DB::table('accounts')->count();
        if ($accountCount < 10) {
            $this->markTestSkipped('Requires seeded accounts table');
        }

        $this->testUserId = DB::table('users')->first()->id ?? 1;
    }

    protected function tearDown(): void
    {
        try {
            // Clean up journal entry lines for all tracked entries
            if (!empty($this->cleanupEntryCodes)) {
                DB::table('journal_entry_lines')
                    ->whereIn('journal_entry_code', $this->cleanupEntryCodes)
                    ->delete();
                DB::table('journal_entries')
                    ->whereIn('entry_code', $this->cleanupEntryCodes)
                    ->delete();
            }

            // Clean up test invoices
            if (!empty($this->cleanupRefs)) {
                $invoiceIds = DB::table('sales_invoices')
                    ->whereIn('invoice_number', $this->cleanupRefs)
                    ->pluck('id');
                if ($invoiceIds->isNotEmpty()) {
                    DB::table('sales_invoice_details')->whereIn('sales_invoice_id', $invoiceIds)->delete();
                    DB::table('sales_invoices')->whereIn('id', $invoiceIds)->delete();
                }
            }
        } catch (\Throwable $e) {
            // Best-effort cleanup
        }
        parent::tearDown();
    }

    // ─── Test 1: Posted Sales Invoice creates original journal ───

    public function test_posted_sales_invoice_creates_journal(): void
    {
        $productId = $this->createTestProduct('Rev Test 1', 100.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV1-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 100.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 500.00,
            'subtotal' => 500.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 100.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        // Verify original journal exists
        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $this->assertNotNull($journal, 'Original journal must exist');
        $this->cleanupEntryCodes[] = $journal->entry_code;
    }

    // ─── Test 2: Cancellation preserves original journal ─────────

    public function test_cancellation_preserves_original_journal(): void
    {
        $productId = $this->createTestProduct('Rev Test 2', 80.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV2-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 80.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 400.00,
            'subtotal' => 400.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 80.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        // Get the journal entry code before deletion
        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Create reversal via the service
        $reversalService = new \App\Services\Accounting\JournalReversalService();
        $reversal = $reversalService->createReversal(
            $originalEntryCode,
            'Test cancellation'
        );

        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Verify original journal still exists
        $originalStillExists = DB::table('journal_entries')
            ->where('entry_code', $originalEntryCode)
            ->exists();
        $this->assertTrue($originalStillExists, 'Original journal must be preserved');

        // Verify reversal was created
        $this->assertNotNull($reversal, 'Reversal journal must be created');
    }

    // ─── Test 3: Cancellation creates exactly one reversal ───────

    public function test_cancellation_creates_exactly_one_reversal(): void
    {
        $productId = $this->createTestProduct('Rev Test 3', 60.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV3-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 60.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 300.00,
            'subtotal' => 300.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 60.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $reversalService = new \App\Services\Accounting\JournalReversalService();

        // Call reversal twice (idempotency)
        $reversal1 = $reversalService->createReversal($originalEntryCode, 'Test cancel 1');
        $reversal2 = $reversalService->createReversal($originalEntryCode, 'Test cancel 2');

        $this->cleanupEntryCodes[] = $reversal1->entry_code;

        // Should be the same journal (idempotent)
        $this->assertEquals($reversal1->entry_code, $reversal2->entry_code, 'Second reversal must return same journal');

        // Only one reversal journal should exist
        $reversalCount = DB::table('journal_entries')
            ->where('entry_code', $originalEntryCode . '-REV')
            ->count();
        $this->assertEquals(1, $reversalCount, 'Must have exactly one reversal');
    }

    // ─── Test 4: Original + reversal net to zero ────────────────

    public function test_original_and_reversal_net_to_zero(): void
    {
        $productId = $this->createTestProduct('Rev Test 4', 90.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV4-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 90.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 450.00,
            'subtotal' => 450.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 90.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $reversalService = new \App\Services\Accounting\JournalReversalService();
        $reversal = $reversalService->createReversal($originalEntryCode, 'Test reversal');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Verify net is zero
        $isBalanced = $reversalService->verifyReversalBalance($originalEntryCode);
        $this->assertTrue($isBalanced, 'Original + reversal must net to zero');
    }

    // ─── Test 5: COGS and Inventory are both reversed ───────────

    public function test_cogs_and_inventory_both_reversed(): void
    {
        $productId = $this->createTestProduct('Rev Test 5', 75.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV5-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 75.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 375.00,
            'subtotal' => 375.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 75.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Verify original has COGS line
        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $cogsLine = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->first();
        $this->assertNotNull($cogsLine, 'Original must have COGS debit line');

        // Create reversal
        $reversalService = new \App\Services\Accounting\JournalReversalService();
        $reversal = $reversalService->createReversal($originalEntryCode, 'Test COGS reversal');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Verify reversal has COGS credit (was debit in original)
        $reversalCogsCredit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->where('account_id', $cogsAccountId)
            ->where('credit', '>', 0)
            ->first();
        $this->assertNotNull($reversalCogsCredit, 'Reversal must have COGS credit line');

        // Verify reversal has Inventory debit (was credit in original)
        $inventoryAccountId = DB::table('accounts')->where('AccCode', '11401')->value('AccID');
        $reversalInventoryDebit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->where('account_id', $inventoryAccountId)
            ->where('debit', '>', 0)
            ->first();
        $this->assertNotNull($reversalInventoryDebit, 'Reversal must have Inventory debit line');
    }

    // ─── Test 6: Reversal uses original amounts ──────────────────

    public function test_reversal_uses_original_amounts(): void
    {
        $productId = $this->createTestProduct('Rev Test 6', 50.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV6-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 50.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 250.00,
            'subtotal' => 250.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 50.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Change product cost AFTER original posting
        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 200.00]);

        // Create reversal — should use original amounts, not current product cost
        $reversalService = new \App\Services\Accounting\JournalReversalService();
        $reversal = $reversalService->createReversal($originalEntryCode, 'Test original amounts');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Get original COGS amount
        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $originalCogs = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->value('debit');

        // Get reversal COGS amount
        $reversalCogs = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->where('account_id', $cogsAccountId)
            ->where('credit', '>', 0)
            ->value('credit');

        // Must use original amounts (250 for COGS = 5×50), NOT current product cost (5×200)
        $this->assertEqualsWithDelta($originalCogs, $reversalCogs, 0.01, 'Reversal must use original journal amounts');
        $this->assertEqualsWithDelta(250.00, $reversalCogs, 0.01, 'Reversal COGS = 5×50 = 250 (original cost)');
    }

    // ─── Test 7: Reversal is balanced ────────────────────────────

    public function test_reversal_is_balanced(): void
    {
        $productId = $this->createTestProduct('Rev Test 7', 120.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV7-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 120.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 600.00,
            'subtotal' => 600.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 120.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $reversalService = new \App\Services\Accounting\JournalReversalService();
        $reversal = $reversalService->createReversal($originalEntryCode, 'Test balanced reversal');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Verify reversal is balanced
        $totalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('debit');

        $totalCredit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01, 'Reversal must be balanced');
    }

    // ─── Test 8: No duplicate reversal journals ──────────────────

    public function test_no_duplicate_reversal_journals(): void
    {
        $productId = $this->createTestProduct('Rev Test 8', 40.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-REV8-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 40.00, 'quantity' => 10]);

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => 200.00,
            'subtotal' => 200.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 5,
            'unit_id' => $unitId,
            'unit_price' => 40.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $reversalService = new \App\Services\Accounting\JournalReversalService();

        // Call reversal 3 times
        $r1 = $reversalService->createReversal($originalEntryCode, 'Cancel 1');
        $r2 = $reversalService->createReversal($originalEntryCode, 'Cancel 2');
        $r3 = $reversalService->createReversal($originalEntryCode, 'Cancel 3');

        $this->cleanupEntryCodes[] = $r1->entry_code;

        // All three calls return the same journal
        $this->assertEquals($r1->entry_code, $r2->entry_code);
        $this->assertEquals($r2->entry_code, $r3->entry_code);

        // Only one reversal exists
        $reversalCount = DB::table('journal_entries')
            ->where('entry_code', $originalEntryCode . '-REV')
            ->count();
        $this->assertEquals(1, $reversalCount, 'Must have exactly one reversal');
    }

    // ─── Helper Methods ──────────────────────────────────────────

    private function createTestProduct(string $name, float $cost): int
    {
        $slug = str()->slug($name) . '-' . uniqid();
        return DB::table('products')->insertGetId([
            'product_code' => 'PRD-' . strtoupper(substr($slug, 0, 10)),
            'name' => $name,
            'slug' => $slug,
            'sku' => 'SKU-' . strtoupper(substr($slug, 0, 8)),
            'status' => 'active',
            'quantity' => 0,
            'cost_per_item' => $cost,
            'price' => $cost * 2,
            'product_type' => 'simple',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createTestCustomer(): int
    {
        return DB::table('customers')->insertGetId([
            'name_ar' => 'عميل تجريبي',
            'name_en' => 'Test Customer',
            'customer_code' => 'CUST-' . uniqid(),
            'is_active' => true,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createTestWarehouse(): int
    {
        return DB::table('warehouses')->insertGetId([
            'name' => 'Test Warehouse',
            'name_ar' => 'مستودع تجريبي',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function getTestUnitId(): int
    {
        $unit = DB::table('item_units')->where('unit_type', 1)->first();
        return $unit?->id ?? DB::table('item_units')->insertGetId([
            'name' => 'Unit',
            'unit_type' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function getTreasuryAccountId(): int
    {
        $account = DB::table('accounts')
            ->where('Nature', 'bank')
            ->where('AccType', 1)
            ->first();

        if (!$account) {
            $account = DB::table('accounts')
                ->where('AccCode', 'like', '1112%')
                ->where('AccType', 1)
                ->first();
        }

        return $account?->AccID ?? 1;
    }
}
