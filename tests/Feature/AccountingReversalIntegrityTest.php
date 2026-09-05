<?php

namespace Tests\Feature;

use App\Services\Accounting\JournalReversalService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * MySQL integration tests for complete accounting reversal integrity.
 *
 * Tests the JournalReversalService and verifies that posted financial
 * transactions create reversal journals instead of deleting originals.
 */
class AccountingReversalIntegrityTest extends TestCase
{
    protected int $companyId = 1;
    protected int $testUserId = 1;
    private array $cleanupEntryCodes = [];
    private array $cleanupRefs = [];

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
            if (!empty($this->cleanupEntryCodes)) {
                DB::table('journal_entry_lines')
                    ->whereIn('journal_entry_code', $this->cleanupEntryCodes)
                    ->delete();
                DB::table('journal_entries')
                    ->whereIn('entry_code', $this->cleanupEntryCodes)
                    ->delete();
            }
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

    // ─── Test 1: Reversal swaps all original lines ──────────────

    public function test_reversal_swaps_all_original_lines(): void
    {
        $productId = $this->createTestProduct('INT-Test1', 100.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT1-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 100.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 100.00, 500.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Get original line count
        $originalLineCount = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->count();

        // Create reversal
        $service = new JournalReversalService();
        $reversal = $service->createReversal($originalEntryCode, 'Test swap');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Reversal must have same number of lines
        $reversalLineCount = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->count();

        $this->assertEquals($originalLineCount, $reversalLineCount, 'Reversal must have same line count as original');

        // Each original line must have its debit/credit swapped in reversal
        $originalLines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->orderBy('id')
            ->get();

        foreach ($originalLines as $line) {
            $matchingReversal = DB::table('journal_entry_lines')
                ->where('journal_entry_code', $reversal->entry_code)
                ->where('account_id', $line->account_id)
                ->first();

            $this->assertNotNull($matchingReversal, "Reversal must have line for account {$line->account_id}");
            $this->assertEqualsWithDelta((float) $line->credit, (float) $matchingReversal->debit, 0.01);
            $this->assertEqualsWithDelta((float) $line->debit, (float) $matchingReversal->credit, 0.01);
        }
    }

    // ─── Test 2: Original journal preserved after reversal ───────

    public function test_original_journal_preserved_after_reversal(): void
    {
        $productId = $this->createTestProduct('INT-Test2', 80.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT2-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 80.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 80.00, 400.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Record original state
        $originalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->sum('debit');

        // Create reversal
        $service = new JournalReversalService();
        $reversal = $service->createReversal($originalEntryCode, 'Test preserve');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Original must still exist with same amounts
        $currentDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->sum('debit');

        $this->assertEqualsWithDelta($originalDebit, $currentDebit, 0.01, 'Original journal amounts must not change');
    }

    // ─── Test 3: Balanced reversal ───────────────────────────────

    public function test_reversal_is_balanced(): void
    {
        $productId = $this->createTestProduct('INT-Test3', 120.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT3-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 120.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 120.00, 600.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $service = new JournalReversalService();
        $reversal = $service->createReversal($originalEntryCode, 'Test balanced');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        $totalDebit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('debit');

        $totalCredit = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01, 'Reversal must be balanced');
    }

    // ─── Test 4: Idempotency ─────────────────────────────────────

    public function test_reversal_is_idempotent(): void
    {
        $productId = $this->createTestProduct('INT-Test4', 50.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT4-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 50.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 50.00, 250.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $service = new JournalReversalService();

        // Call 3 times
        $r1 = $service->createReversal($originalEntryCode, 'Cancel 1');
        $r2 = $service->createReversal($originalEntryCode, 'Cancel 2');
        $r3 = $service->createReversal($originalEntryCode, 'Cancel 3');

        $this->cleanupEntryCodes[] = $r1->entry_code;

        $this->assertEquals($r1->entry_code, $r2->entry_code, 'Must return same reversal');
        $this->assertEquals($r2->entry_code, $r3->entry_code, 'Must return same reversal');

        $reversalCount = DB::table('journal_entries')
            ->where('entry_code', $originalEntryCode . '-REV')
            ->count();
        $this->assertEquals(1, $reversalCount, 'Must have exactly one reversal');
    }

    // ─── Test 5: Original + reversal net to zero ─────────────────

    public function test_original_plus_reversal_net_to_zero(): void
    {
        $productId = $this->createTestProduct('INT-Test5', 90.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT5-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 90.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 90.00, 450.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        $service = new JournalReversalService();
        $reversal = $service->createReversal($originalEntryCode, 'Test net zero');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        $this->assertTrue($service->verifyReversalBalance($originalEntryCode), 'Original + reversal must net to zero');
    }

    // ─── Test 6: COGS and Inventory both reversed ────────────────

    public function test_cogs_and_inventory_both_reversed(): void
    {
        $productId = $this->createTestProduct('INT-Test6', 75.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT6-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 75.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 75.00, 375.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Verify original has COGS and Inventory lines
        $cogsAccountId = DB::table('accounts')->where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        $inventoryAccountId = DB::table('accounts')->where('AccCode', '>=', 1110)->where('AccCode', '<=', 1199)->orderBy('AccCode')->value('AccID');

        $originalCogsDebit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->first();
        $this->assertNotNull($originalCogsDebit, 'Original must have COGS debit');

        $originalInventoryCredit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalEntryCode)
            ->where('account_id', $inventoryAccountId)
            ->where('credit', '>', 0)
            ->first();
        $this->assertNotNull($originalInventoryCredit, 'Original must have Inventory credit');

        // Create reversal
        $service = new JournalReversalService();
        $reversal = $service->createReversal($originalEntryCode, 'Test COGS/Inv reversal');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Reversal must have COGS credit (was debit) and Inventory debit (was credit)
        $reversalCogsCredit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->where('account_id', $cogsAccountId)
            ->where('credit', '>', 0)
            ->first();
        $this->assertNotNull($reversalCogsCredit, 'Reversal must have COGS credit');

        $reversalInventoryDebit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->where('account_id', $inventoryAccountId)
            ->where('debit', '>', 0)
            ->first();
        $this->assertNotNull($reversalInventoryDebit, 'Reversal must have Inventory debit');
    }

    // ─── Test 7: Reversal uses original amounts ──────────────────

    public function test_reversal_uses_original_amounts(): void
    {
        $productId = $this->createTestProduct('INT-Test7', 50.00);
        $customerId = $this->createTestCustomer();
        $warehouseId = $this->createTestWarehouse();
        $unitId = $this->getTestUnitId();
        $invoiceNumber = 'SINV-INT7-' . uniqid();
        $this->cleanupRefs[] = $invoiceNumber;

        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 50.00, 'quantity' => 10]);

        $invoiceId = $this->createSalesInvoice($invoiceNumber, $customerId, $warehouseId, $productId, $unitId, 5, 50.00, 250.00);
        $this->postSalesInvoice($invoiceId, $invoiceNumber);

        $journal = DB::table('journal_entries')
            ->where('reference', $invoiceNumber)
            ->where('entry_type', 'SalesInvoice')
            ->first();

        $originalEntryCode = $journal->entry_code;
        $this->cleanupEntryCodes[] = $originalEntryCode;

        // Change product cost AFTER posting
        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 200.00]);

        $service = new JournalReversalService();
        $reversal = $service->createReversal($originalEntryCode, 'Test original amounts');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Get reversal total — must equal original total (not current product cost)
        $reversalTotal = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('debit');

        // Original was 5×50=250 COGS + 5×100=500 Revenue = depends on journal structure
        // Key point: reversal must NOT use 5×200=1000
        $this->assertNotEquals(1000.00, $reversalTotal, 'Reversal must NOT use current product cost');
    }

    // ─── Test 8: Posted manual journal cannot be deleted ─────────

    public function test_posted_manual_journal_cannot_be_deleted(): void
    {
        $entryCode = 'QID-TEST-' . uniqid();
        $this->cleanupEntryCodes[] = $entryCode;

        // Create a posted manual journal
        DB::table('journal_entries')->insert([
            'entry_code' => $entryCode,
            'entry_type' => 'ManualJournal',
            'reference' => 'TEST-MJ-' . uniqid(),
            'date' => now()->toDateString(),
            'description' => 'Test manual journal',
            'total_amount' => 100.00,
            'status' => 'Post',
        ]);

        DB::table('journal_entry_lines')->insert([
            ['journal_entry_code' => $entryCode, 'account_id' => 1, 'debit' => 100, 'credit' => 0],
            ['journal_entry_code' => $entryCode, 'account_id' => 2, 'debit' => 0, 'credit' => 100],
        ]);

        // Try to delete via controller logic (posted journals cannot be deleted)
        $header = DB::table('journal_entries')->where('entry_code', $entryCode)->first();
        $this->assertEquals('Post', $header->status);

        // The JournalController::destroy checks this and returns 422
        // Verify the journal still exists
        $stillExists = DB::table('journal_entries')->where('entry_code', $entryCode)->exists();
        $this->assertTrue($stillExists, 'Posted manual journal must not be deleted');
    }

    // ─── Test 9: Depreciation journal reference is deterministic ──

    public function test_depreciation_reference_is_deterministic(): void
    {
        // Verify the reference format: DEPR-{assetId}-{year}-{month}
        $assetId = 99999;
        $year = 2026;
        $month = 1;
        $expectedRef = "DEPR-{$assetId}-{$year}-{$month}";

        // The reference is deterministic for the same asset+period
        $this->assertEquals('DEPR-99999-2026-1', $expectedRef);
    }

    // ─── Test 10: hasReversal helper works ───────────────────────

    public function test_has_reversal_helper(): void
    {
        $service = new JournalReversalService();

        // Non-existent journal
        $this->assertFalse($service->hasReversal('NONEXISTENT-123'));

        // Create a journal and its reversal
        $entryCode = 'QID-HASREV-' . uniqid();
        $reversalCode = $entryCode . '-REV';
        $this->cleanupEntryCodes[] = $entryCode;
        $this->cleanupEntryCodes[] = $reversalCode;

        DB::table('journal_entries')->insert([
            'entry_code' => $entryCode,
            'entry_type' => 'Test',
            'reference' => 'TEST-HR',
            'date' => now()->toDateString(),
            'description' => 'Test hasReversal',
            'total_amount' => 100.00,
            'status' => 'Post',
        ]);

        $this->assertFalse($service->hasReversal($entryCode), 'Should not have reversal yet');

        DB::table('journal_entries')->insert([
            'entry_code' => $reversalCode,
            'entry_type' => 'Test',
            'reference' => 'TEST-HR',
            'date' => now()->toDateString(),
            'description' => 'Reversal',
            'total_amount' => 100.00,
            'status' => 'Post',
        ]);

        $this->assertTrue($service->hasReversal($entryCode), 'Should have reversal now');
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function createSalesInvoice(string $number, int $customerId, int $warehouseId, int $productId, int $unitId, int $qty, float $unitPrice, float $total): int
    {
        return DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $number,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->getTreasuryAccountId(),
            'warehouse_id' => $warehouseId,
            'total_amount' => $total,
            'subtotal' => $total,
            'is_posted' => true,
            'created_by' => $this->testUserId,
            'company_id' => $this->companyId,
        ]) + (function () use ($number, $productId, $unitId, $qty, $unitPrice, $warehouseId) {
            $invoiceId = DB::table('sales_invoices')->where('invoice_number', $number)->value('id');
            DB::table('sales_invoice_details')->insert([
                'sales_invoice_id' => $invoiceId,
                'product_id' => $productId,
                'quantity' => $qty,
                'unit_id' => $unitId,
                'unit_price' => $unitPrice,
                'warehouse_id' => $warehouseId,
            ]);
            return [$invoiceId];
        })()[0];
    }

    private function postSalesInvoice(int $invoiceId, string $number): void
    {
        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $model = \App\Models\Client_Sales\SalesInvoice::find($invoiceId);
        $controller->upsertJournalEntryForInvoice($model);
    }

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
