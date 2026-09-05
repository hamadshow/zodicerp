<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * MySQL integration tests for Sales Invoice COGS accounting.
 *
 * Tests journal entry creation only (no inventory movement cleanup).
 * Verifies: COGS journal, balance, idempotency, sales return reversal.
 */
class SalesInvoiceCogsTest extends TestCase
{
    protected int $companyId = 1;
    protected int $testUserId = 1;

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
        // Clean up only journal and invoice/return test data
        try {
            $invoiceNums = $this->testInvoiceNumbers ?? [];
            $returnNums = $this->testReturnNumbers ?? [];
            $allRefs = array_merge($invoiceNums, $returnNums);

            if (!empty($allRefs)) {
                DB::table('journal_entry_lines')
                    ->whereIn('related_name_details', $allRefs)
                    ->delete();
                DB::table('journal_entries')
                    ->whereIn('reference', $allRefs)
                    ->delete();
            }

            if (!empty($invoiceNums)) {
                $invoiceIds = DB::table('sales_invoices')
                    ->whereIn('invoice_number', $invoiceNums)
                    ->pluck('id');
                if ($invoiceIds->isNotEmpty()) {
                    DB::table('sales_invoice_details')
                        ->whereIn('sales_invoice_id', $invoiceIds)
                        ->delete();
                    DB::table('sales_invoices')
                        ->whereIn('id', $invoiceIds)
                        ->delete();
                }
            }

            if (!empty($returnNums)) {
                $returnIds = DB::table('sales_returns')
                    ->whereIn('return_number', $returnNums)
                    ->pluck('id');
                if ($returnIds->isNotEmpty()) {
                    DB::table('sales_return_details')
                        ->whereIn('return_id', $returnIds)
                        ->delete();
                    DB::table('sales_returns')
                        ->whereIn('id', $returnIds)
                        ->delete();
                }
            }
        } catch (\Throwable $e) {
            // Best-effort cleanup
        }

        parent::tearDown();
    }

    private array $testInvoiceNumbers = [];
    private array $testReturnNumbers = [];

    // ─── Test 1: Sales Invoice COGS Journal ─────────────────────

    public function test_sales_invoice_creates_cogs_journal(): void
    {
        $productId = $this->createTestProduct('COGS Test 1', 100.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-COGS-' . uniqid();
        $this->testInvoiceNumbers[] = $invoiceNumber;

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

        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $inventoryAccountId = DB::table('accounts')->where('AccCode', '>=', 1110)->where('AccCode', '<=', 1199)->orderBy('AccCode')->value('AccID');

        $this->assertNotNull($cogsAccountId, 'COGS account (501) must exist');
        $this->assertNotNull($inventoryAccountId, 'Inventory asset account must exist');

        $cogsDebit = DB::table('journal_entry_lines')
            ->where('account_id', $cogsAccountId)
            ->where('related_name_details', $invoiceNumber)
            ->where('debit', '>', 0)
            ->first();

        $this->assertNotNull($cogsDebit, 'COGS debit line must exist');
        $this->assertEquals(500.00, (float) $cogsDebit->debit, 'COGS = 5 units × $100 = $500');

        $inventoryCredit = DB::table('journal_entry_lines')
            ->where('account_id', $inventoryAccountId)
            ->where('related_name_details', $invoiceNumber)
            ->where('credit', '>', 0)
            ->first();

        $this->assertNotNull($inventoryCredit, 'Inventory credit line must exist');
        $this->assertEquals(500.00, (float) $inventoryCredit->credit, 'Inventory credit must match COGS debit');
    }

    // ─── Test 2: Journal Balance ────────────────────────────────

    public function test_sales_invoice_journal_is_balanced(): void
    {
        $productId = $this->createTestProduct('Balance Test', 75.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-BAL-' . uniqid();
        $this->testInvoiceNumbers[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 75.00, 'quantity' => 20]);

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
            'quantity' => 4,
            'unit_id' => $unitId,
            'unit_price' => 75.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journalEntry = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $this->assertNotNull($journalEntry);

        $totalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('debit');

        $totalCredit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01, 'Journal must be balanced');
        // Dr Treasury 300 + Dr COGS 300 = 600, Cr Revenue 300 + Cr Inventory 300 = 600
        $this->assertEqualsWithDelta(600.00, $totalDebit, 0.01);
        $this->assertEqualsWithDelta(600.00, $totalCredit, 0.01);
    }

    // ─── Test 3: Duplicate Posting Prevention ───────────────────

    public function test_sales_invoice_duplicate_posting_prevention(): void
    {
        $productId = $this->createTestProduct('Dup Test', 50.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-DUP-' . uniqid();
        $this->testInvoiceNumbers[] = $invoiceNumber;

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
            'total_amount' => 200.00,
            'subtotal' => 200.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            'sales_invoice_id' => $invoiceId,
            'product_id' => $productId,
            'quantity' => 4,
            'unit_id' => $unitId,
            'unit_price' => 50.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);

        // Post twice — idempotent
        $controller->upsertJournalEntryForInvoice($invoiceModel);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journalCount = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->count();

        $this->assertEquals(1, $journalCount, 'Must have exactly one journal entry after duplicate posting');

        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $cogsDebit = (float) DB::table('journal_entry_lines')
            ->where('related_name_details', $invoiceNumber)
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->sum('debit');

        $this->assertEqualsWithDelta(200.00, $cogsDebit, 0.01, 'COGS must not be doubled');
    }

    // ─── Test 4: Sales Return COGS Reversal ─────────────────────

    public function test_sales_return_creates_cogs_reversal(): void
    {
        $productId = $this->createTestProduct('Return Test', 120.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $returnNumber = 'SR-REV-' . uniqid();
        $this->testReturnNumbers[] = $returnNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 120.00, 'quantity' => 10]);

        $returnId = DB::table('sales_returns')->insertGetId([
            'return_number' => $returnNumber,
            'invoice_id' => null,
            'customer_id' => $customerId,
            'warehouse_id' => $warehouseId,
            'return_date' => now()->toDateString(),
            'return_reason' => 'damaged',
            'return_type' => 'partial_return',
            'subtotal' => 120.00,
            'tax_amount' => 0,
            'total_amount' => 120.00,
            'refund_amount' => 120.00,
            'refund_status' => 'pending',
            'status' => 'approved',
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_return_details')->insert([
            'return_id' => $returnId,
            'product_id' => $productId,
            'quantity' => 1,
            'unit_id' => $unitId,
            'unit_price' => 120.00,
        ]);

        $service = new \App\Services\Client_Sales\SalesReturnService();
        $returnModel = \App\Models\Client_Sales\SalesReturn::find($returnId);
        $totals = ['total_amount' => 120.00, 'tax_amount' => 0];

        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('createJournalEntryForReturn');
        $method->setAccessible(true);
        $method->invoke($service, $returnModel, $totals);

        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $inventoryAccountId = DB::table('accounts')->where('AccCode', '>=', 1110)->where('AccCode', '<=', 1199)->orderBy('AccCode')->value('AccID');

        $inventoryDebit = DB::table('journal_entry_lines')
            ->where('account_id', $inventoryAccountId)
            ->where('related_name_details', $returnNumber)
            ->where('debit', '>', 0)
            ->first();

        $this->assertNotNull($inventoryDebit, 'Inventory restoration debit must exist');
        $this->assertEqualsWithDelta(120.00, (float) $inventoryDebit->debit, 0.01);

        $cogsCredit = DB::table('journal_entry_lines')
            ->where('account_id', $cogsAccountId)
            ->where('related_name_details', $returnNumber)
            ->where('credit', '>', 0)
            ->first();

        $this->assertNotNull($cogsCredit, 'COGS reversal credit must exist');
        $this->assertEqualsWithDelta(120.00, (float) $cogsCredit->credit, 0.01);
    }

    // ─── Test 5: Sales Return Journal Balance ───────────────────

    public function test_sales_return_journal_is_balanced(): void
    {
        $productId = $this->createTestProduct('Return Bal', 80.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $returnNumber = 'SR-BAL-' . uniqid();
        $this->testReturnNumbers[] = $returnNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 80.00, 'quantity' => 10]);

        $returnId = DB::table('sales_returns')->insertGetId([
            'return_number' => $returnNumber,
            'invoice_id' => null,
            'customer_id' => $customerId,
            'warehouse_id' => $warehouseId,
            'return_date' => now()->toDateString(),
            'return_reason' => 'damaged',
            'return_type' => 'partial_return',
            'subtotal' => 160.00,
            'tax_amount' => 0,
            'total_amount' => 160.00,
            'refund_amount' => 160.00,
            'refund_status' => 'pending',
            'status' => 'approved',
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_return_details')->insert([
            'return_id' => $returnId,
            'product_id' => $productId,
            'quantity' => 2,
            'unit_id' => $unitId,
            'unit_price' => 80.00,
        ]);

        $service = new \App\Services\Client_Sales\SalesReturnService();
        $returnModel = \App\Models\Client_Sales\SalesReturn::find($returnId);
        $totals = ['total_amount' => 160.00, 'tax_amount' => 0];

        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('createJournalEntryForReturn');
        $method->setAccessible(true);
        $method->invoke($service, $returnModel, $totals);

        $journalEntry = DB::table('journal_entries')
            ->where('reference', $returnNumber)
            ->where('entry_type', 'SalesReturn')
            ->first();

        $this->assertNotNull($journalEntry);

        $totalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('debit');

        $totalCredit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01, 'Sales Return journal must be balanced');
        // Dr Revenue 160 + Dr Inventory 160 = 320, Cr AR 160 + Cr COGS 160 = 320
        $this->assertEqualsWithDelta(320.00, $totalDebit, 0.01);
        $this->assertEqualsWithDelta(320.00, $totalCredit, 0.01);
    }

    // ─── Test 6: Zero Cost Product ──────────────────────────────

    public function test_sales_invoice_with_zero_cost_product(): void
    {
        $productId = $this->createTestProduct('Zero Cost', 0.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-ZERO-' . uniqid();
        $this->testInvoiceNumbers[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 0, 'quantity' => 10]);

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
            'quantity' => 3,
            'unit_id' => $unitId,
            'unit_price' => 100.00,
            'warehouse_id' => $warehouseId,
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        $journalEntry = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $totalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('debit');

        $totalCredit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01, 'Journal must balance even with zero cost');
        // Only revenue lines: Dr Treasury 300, Cr Revenue 300
        $this->assertEqualsWithDelta(300.00, $totalDebit, 0.01);
    }

    // ─── Test 7: Multi-line Invoice COGS ────────────────────────

    public function test_multiline_invoice_cogs(): void
    {
        $productA = $this->createTestProduct('Multi A', 50.00);
        $productB = $this->createTestProduct('Multi B', 80.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-ML-' . uniqid();
        $this->testInvoiceNumbers[] = $invoiceNumber;

        DB::table('products')->where('id', $productA)->update(['cost_per_item' => 50.00, 'quantity' => 10]);
        DB::table('products')->where('id', $productB)->update(['cost_per_item' => 80.00, 'quantity' => 10]);

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
            'total_amount' => 700.00,
            'subtotal' => 700.00,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]);

        DB::table('sales_invoice_details')->insert([
            ['sales_invoice_id' => $invoiceId, 'product_id' => $productA, 'quantity' => 5, 'unit_id' => $unitId, 'unit_price' => 70.00, 'warehouse_id' => $warehouseId],
            ['sales_invoice_id' => $invoiceId, 'product_id' => $productB, 'quantity' => 5, 'unit_id' => $unitId, 'unit_price' => 70.00, 'warehouse_id' => $warehouseId],
        ]);

        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $invoiceModel = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($invoiceModel);

        // COGS = 5×50 + 5×80 = 250 + 400 = 650
        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $cogsDebit = (float) DB::table('journal_entry_lines')
            ->where('related_name_details', $invoiceNumber)
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->sum('debit');

        $this->assertEqualsWithDelta(650.00, $cogsDebit, 0.01, 'COGS = 5×50 + 5×80 = 650');

        // Verify full balance
        $journalEntry = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->first();

        $totalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('debit');

        $totalCredit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01, 'Journal must balance');
        // Dr Treasury 700 + Dr COGS 650 = 1350, Cr Revenue 700 + Cr Inventory 650 = 1350
        $this->assertEqualsWithDelta(1350.00, $totalDebit, 0.01);
    }

    // ─── Helper Methods ─────────────────────────────────────────

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
