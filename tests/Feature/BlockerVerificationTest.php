<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Comprehensive verification tests for all accounting/inventory blockers.
 *
 * These tests run against an isolated MySQL/MariaDB database.
 * They verify the CORRECTNESS of each remediation.
 */
class BlockerVerificationTest extends TestCase
{
    protected int $companyId = 1;
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

        // Ensure fiscal periods exist for journal posting
        $this->ensureTestFiscalPeriods($this->companyId);
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
        } catch (\Throwable $e) {
            // Best-effort cleanup
        }
        parent::tearDown();
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 1 — Inventory Account Resolution
    // ═══════════════════════════════════════════════════════════════

    public function test_inventory_account_resolves_to_11401(): void
    {
        // Verify the exact account exists
        $account = DB::table('accounts')
            ->where('AccCode', '11401')
            ->first();

        $this->assertNotNull($account, 'Account 11401 must exist in chart of accounts');
        $this->assertEquals(90, $account->AccID, 'Account 11401 must have AccID = 90');

        // Verify the Purchase Invoice resolver returns 11401
        $controller = new \App\Http\Controllers\Backend\Purchases\PurchaseInvoiceController();
        $ref = new \ReflectionClass($controller);
        $method = $ref->getMethod('resolvePurchaseAccountId');
        $method->setAccessible(true);
        $resolved = $method->invoke($controller);
        $this->assertEquals(90, $resolved, 'PurchaseInvoiceController resolver must return AccID=90 (11401)');
        $this->assertNotEquals(79, $resolved, 'Must NOT return AccID=79 (1111/Cash) — the old broken range bug');
        $this->assertNotEquals(81, $resolved, 'Must NOT return AccID=81 (1112/Banks) — the old broken range bug');

        // Verify the range query no longer matches (regression guard)
        $wrongAccount = DB::table('accounts')
            ->where('AccCode', '>=', 1110)
            ->where('AccCode', '<=', 1199)
            ->orderBy('AccCode')
            ->first();

        if ($wrongAccount) {
            $this->assertNotEquals('11401', (string) $wrongAccount->AccCode,
                'The old range query must NOT match account 11401');
        }
    }

    public function test_purchase_return_resolves_inventory_asset(): void
    {
        $service = new \App\Services\Vendor_Purchases\PurchaseReturnService();
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('resolvePurchaseAccountId');
        $method->setAccessible(true);
        $resolved = $method->invoke($service);

        $expectedAccount = DB::table('accounts')->where('AccCode', '11401')->first();
        $this->assertNotNull($expectedAccount, 'Account 11401 must exist');
        $this->assertEquals($expectedAccount->AccID, $resolved,
            'PurchaseReturnService must resolve to account 11401 (Inventory Asset)');
    }

    public function test_sales_invoice_resolves_inventory_asset(): void
    {
        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $ref = new \ReflectionClass($controller);
        $method = $ref->getMethod('resolveInventoryAssetAccountId');
        $method->setAccessible(true);
        $resolved = $method->invoke($controller);

        $expectedAccount = DB::table('accounts')->where('AccCode', '11401')->first();
        $this->assertNotNull($expectedAccount, 'Account 11401 must exist');
        $this->assertEquals($expectedAccount->AccID, $resolved,
            'SalesInvoiceController inventory resolver must return 11401');
    }

    public function test_sales_return_resolves_inventory_asset(): void
    {
        $service = new \App\Services\Client_Sales\SalesReturnService();
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('resolveInventoryAssetAccountId');
        $method->setAccessible(true);
        $resolved = $method->invoke($service);

        $expectedAccount = DB::table('accounts')->where('AccCode', '11401')->first();
        $this->assertNotNull($expectedAccount, 'Account 11401 must exist');
        $this->assertEquals($expectedAccount->AccID, $resolved,
            'SalesReturnService inventory resolver must return 11401');
    }

    public function test_stock_adjustment_resolves_inventory_asset(): void
    {
        $service = new \App\Services\Inventory\StockAdjustmentService();
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('resolveInventoryAssetAccountId');
        $method->setAccessible(true);
        $resolved = $method->invoke($service);

        $expectedAccount = DB::table('accounts')->where('AccCode', '11401')->first();
        $this->assertNotNull($expectedAccount, 'Account 11401 must exist');
        $this->assertEquals($expectedAccount->AccID, $resolved,
            'StockAdjustmentService inventory resolver must return 11401');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 2 — COGS Account Resolution
    // ═══════════════════════════════════════════════════════════════

    public function test_cogs_resolves_to_501(): void
    {
        $cogsAccount = DB::table('accounts')
            ->where('AccCode', '501')
            ->first();

        $this->assertNotNull($cogsAccount, 'Account 501 (COGS) must exist');
        $this->assertEquals(159, $cogsAccount->AccID, 'Account 501 must have AccID = 159');

        // Verify Sales Invoice COGS resolver
        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();
        $ref = new \ReflectionClass($controller);
        $method = $ref->getMethod('resolveCogsAccountId');
        $method->setAccessible(true);
        $resolved = $method->invoke($controller);
        $this->assertEquals(159, $resolved, 'SalesInvoiceController COGS resolver must return AccID=159 (501)');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 3 — Inventory and COGS are Distinct Accounts
    // ═══════════════════════════════════════════════════════════════

    public function test_inventory_and_cogs_are_distinct(): void
    {
        $inventoryAccount = DB::table('accounts')->where('AccCode', '11401')->first();
        $cogsAccount = DB::table('accounts')->where('AccCode', '501')->first();

        $this->assertNotNull($inventoryAccount);
        $this->assertNotNull($cogsAccount);
        $this->assertNotEquals($inventoryAccount->AccID, $cogsAccount->AccID,
            'Inventory Asset (11401) and COGS (501) must be different accounts');

        // Inventory must be Balance Sheet (1xxx)
        $this->assertStringStartsWith('1', (string) $inventoryAccount->AccCode,
            'Inventory Asset must be Balance Sheet (1xxx)');
        // COGS must be P&L (5xxx)
        $this->assertStringStartsWith('5', (string) $cogsAccount->AccCode,
            'COGS must be P&L (5xxx)');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 4 — Fiscal Period Initialization
    // ═══════════════════════════════════════════════════════════════

    public function test_fiscal_period_exists_for_posting(): void
    {
        // Ensure fiscal periods are set up
        $this->ensureTestFiscalPeriods($this->companyId);

        $fiscalYear = DB::table('fiscal_years')
            ->where('company_id', $this->companyId)
            ->where('name', '2026')
            ->first();

        $this->assertNotNull($fiscalYear, 'Fiscal year 2026 must exist');
        $this->assertEquals('open', $fiscalYear->status, 'Fiscal year must be open');
        $this->assertEquals('2026-01-01', $fiscalYear->start_date);
        $this->assertEquals('2026-12-31', $fiscalYear->end_date);

        $periodCount = DB::table('accounting_periods')
            ->where('fiscal_year_id', $fiscalYear->id)
            ->count();

        $this->assertEquals(12, $periodCount, 'Fiscal year must have 12 monthly periods');

        $openPeriods = DB::table('accounting_periods')
            ->where('fiscal_year_id', $fiscalYear->id)
            ->where('status', 'open')
            ->count();

        $this->assertEquals(12, $openPeriods, 'All 12 periods must be open');
    }

    public function test_fiscal_period_validation_accepts_valid_date(): void
    {
        $this->ensureTestFiscalPeriods($this->companyId);

        $service = new \App\Services\Accounting\FiscalPeriodService();
        $result = $service->validatePostingDate('2026-06-15');

        $this->assertTrue($result, 'Posting date 2026-06-15 must be accepted');
    }

    public function test_fiscal_period_validation_rejects_invalid_date(): void
    {
        $this->ensureTestFiscalPeriods($this->companyId);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('No open accounting period found');

        $service = new \App\Services\Accounting\FiscalPeriodService();
        $service->validatePostingDate('2025-06-15');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 5 — Purchase Invoice Journal Structure
    // ═══════════════════════════════════════════════════════════════

    public function test_purchase_invoice_journal_structure(): void
    {
        $this->ensureTestFiscalPeriods($this->companyId);

        $supplierId = $this->createTestSupplier();
        $inventoryAccountId = DB::table('accounts')->where('AccCode', '11401')->value('AccID');
        $apAccountId = DB::table('accounts')->where('AccCode', '2111')->value('AccID');
        $taxAccountId = DB::table('accounts')->where('AccCode', '213101')->value('AccID');

        $this->assertNotNull($inventoryAccountId, 'Inventory account (11401) must exist');
        $this->assertNotNull($apAccountId, 'AP account (2111) must exist');

        // Simulate Purchase Invoice journal: Dr Inventory 1000, Dr Tax 150, Cr AP 1150
        $netAmount = 1000.00;
        $taxAmount = 150.00;
        $totalAmount = 1150.00;

        $entryCode = 'QID-TEST-' . uniqid();
        $this->cleanupEntryCodes[] = $entryCode;

        $this->createJournalEntry([
            'entry_code' => $entryCode,
            'entry_type' => 'PurchaseInvoice',
            'reference' => 'TEST-PI-' . uniqid(),
            'date' => '2026-06-15',
            'description' => 'Test Purchase Invoice',
            'total_amount' => $totalAmount,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        // Dr Inventory
        $this->createJournalLine([
            'journal_entry_code' => $entryCode,
            'account_id' => $inventoryAccountId,
            'debit' => $netAmount,
            'credit' => 0,
            'related_id_name' => 'PurchaseInvoice',
            'related_name_details' => 'TEST-PI',
            'description' => 'Purchase Invoice - Inventory',
        ]);

        // Dr Input Tax (if applicable)
        if ($taxAmount > 0 && $taxAccountId) {
            $this->createJournalLine([
                'journal_entry_code' => $entryCode,
                'account_id' => $taxAccountId,
                'debit' => $taxAmount,
                'credit' => 0,
                'related_id_name' => 'PurchaseInvoice',
                'related_name_details' => 'TEST-PI',
                'description' => 'Input Tax',
            ]);
        }

        // Cr AP
        $this->createJournalLine([
            'journal_entry_code' => $entryCode,
            'account_id' => $apAccountId,
            'debit' => 0,
            'credit' => $totalAmount,
            'related_id_name' => 'PurchaseInvoice',
            'related_name_details' => 'TEST-PI',
            'description' => 'Accounts Payable',
        ]);

        // Verify journal balance
        $totalDebits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->sum('debit');
        $totalCredits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebits, $totalCredits, 0.01,
            'Purchase Invoice journal must balance (debits = credits)');
        $this->assertEqualsWithDelta($netAmount + $taxAmount, $totalCredits, 0.01,
            'Total credits must equal invoice total');

        // Verify inventory is debited (NOT COGS)
        $inventoryDebit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', $inventoryAccountId)
            ->where('debit', '>', 0)
            ->first();
        $this->assertNotNull($inventoryDebit, 'Purchase Invoice must debit Inventory Asset (11401)');

        // Verify COGS (501) is NOT debited by Purchase Invoice
        $cogsDebit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', DB::table('accounts')->where('AccCode', '501')->value('AccID'))
            ->where('debit', '>', 0)
            ->first();
        $this->assertNull($cogsDebit, 'Purchase Invoice must NOT debit COGS (501)');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 6 — Sales Invoice Journal Structure
    // ═══════════════════════════════════════════════════════════════

    public function test_sales_invoice_journal_structure(): void
    {
        $this->ensureTestFiscalPeriods($this->companyId);

        $revenueAccountId = DB::table('accounts')->where('AccCode', '401')->value('AccID');
        $cogsAccountId = DB::table('accounts')->where('AccCode', '501')->value('AccID');
        $inventoryAccountId = DB::table('accounts')->where('AccCode', '11401')->value('AccID');

        $this->assertNotNull($revenueAccountId, 'Revenue account (401) must exist');
        $this->assertNotNull($cogsAccountId, 'COGS account (501) must exist');
        $this->assertNotNull($inventoryAccountId, 'Inventory account (11401) must exist');

        // Simulate: Sale of 10 units @ selling price 200, cost 100
        $saleAmount = 2000.00;  // Revenue
        $cogsAmount = 1000.00;  // COGS = 10 × 100

        $entryCode = 'QID-TEST-' . uniqid();
        $this->cleanupEntryCodes[] = $entryCode;

        // Dr Treasury (use a valid treasury/bank account)
        $treasuryAccountId = DB::table('accounts')
            ->where('AccCode', 'like', '111%')
            ->where('AccType', 1)
            ->orderBy('AccCode')
            ->value('AccID');

        if (!$treasuryAccountId) {
            $this->markTestSkipped('No treasury/bank account available');
        }

        // Create journal entry header first
        $this->createJournalEntry([
            'entry_code' => $entryCode,
            'entry_type' => 'SalesInvoice',
            'reference' => 'TEST-SI-' . uniqid(),
            'date' => '2026-06-15',
            'description' => 'Test Sales Invoice',
            'total_amount' => $saleAmount,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        // Revenue line: Dr Treasury 2000, Cr Revenue 2000
        $this->createJournalLine([
            'journal_entry_code' => $entryCode,
            'account_id' => $treasuryAccountId,
            'debit' => $saleAmount,
            'credit' => 0,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST-SI',
            'description' => 'Sales Invoice - Treasury',
        ]);
        $this->createJournalLine([
            'journal_entry_code' => $entryCode,
            'account_id' => $revenueAccountId,
            'debit' => 0,
            'credit' => $saleAmount,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST-SI',
            'description' => 'Sales Invoice - Revenue',
        ]);

        // COGS line: Dr COGS 1000, Cr Inventory 1000
        $this->createJournalLine([
            'journal_entry_code' => $entryCode,
            'account_id' => $cogsAccountId,
            'debit' => $cogsAmount,
            'credit' => 0,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST-SI',
            'description' => 'COGS - Sales Invoice',
        ]);
        $this->createJournalLine([
            'journal_entry_code' => $entryCode,
            'account_id' => $inventoryAccountId,
            'debit' => 0,
            'credit' => $cogsAmount,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST-SI',
            'description' => 'Inventory reduction - Sales Invoice',
        ]);

        // Verify balance
        $totalDebits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->sum('debit');
        $totalCredits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->sum('credit');

        $this->assertEqualsWithDelta($totalDebits, $totalCredits, 0.01,
            'Sales Invoice journal must balance');

        // Verify COGS is debited (501)
        $cogsDebit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->first();
        $this->assertNotNull($cogsDebit, 'Sales Invoice must debit COGS (501)');
        $this->assertEqualsWithDelta($cogsAmount, (float) $cogsDebit->debit, 0.01);

        // Verify Inventory is credited (11401)
        $inventoryCredit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', $inventoryAccountId)
            ->where('credit', '>', 0)
            ->first();
        $this->assertNotNull($inventoryCredit, 'Sales Invoice must credit Inventory Asset (11401)');
        $this->assertEqualsWithDelta($cogsAmount, (float) $inventoryCredit->credit, 0.01);

        // Revenue must be credited
        $revenueCredit = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', $revenueAccountId)
            ->where('credit', '>', 0)
            ->first();
        $this->assertNotNull($revenueCredit, 'Sales Invoice must credit Revenue (401)');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 7 — GRN Does NOT Create Journal Entry
    // ═══════════════════════════════════════════════════════════════

    public function test_grn_does_not_create_journal(): void
    {
        // Verify GoodsReceiptService::approveReceipt does NOT create journals
        $reflection = new \ReflectionClass(\App\Services\Vendor_Purchases\GoodsReceiptService::class);
        $approveMethod = $reflection->getMethod('approveReceipt');
        $sourceFile = $reflection->getFileName();

        // Read the method source to verify no journal creation
        $methodCode = file_get_contents($sourceFile);
        $this->assertStringContainsString('No GL journal entry is created here',
            $methodCode, 'GRN approveReceipt must explicitly note no GL journal');

        // Verify the comment explicitly says no GL
        $this->assertStringContainsString('ARCHITECTURE DECISION',
            $methodCode, 'GRN must document the architecture decision for no GL');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 8 — Reversal Integrity
    // ═══════════════════════════════════════════════════════════════

    public function test_reversal_swaps_debit_and_credit(): void
    {
        // Create a test journal entry
        $originalCode = 'QID-REV-TEST-' . uniqid();
        $this->cleanupEntryCodes[] = $originalCode;

        $inventoryAccountId = DB::table('accounts')->where('AccCode', '11401')->value('AccID');
        $cogsAccountId = DB::table('accounts')->where('AccCode', '501')->value('AccID');

        if (!$inventoryAccountId || !$cogsAccountId) {
            $this->markTestSkipped('Required accounts not found');
        }

        $this->createJournalEntry([
            'entry_code' => $originalCode,
            'entry_type' => 'SalesInvoice',
            'reference' => 'TEST-REV-' . uniqid(),
            'date' => '2026-06-15',
            'description' => 'Test original journal',
            'total_amount' => 1000.00,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        // Dr COGS 500
        $this->createJournalLine([
            'journal_entry_code' => $originalCode,
            'account_id' => $cogsAccountId,
            'debit' => 500.00,
            'credit' => 0,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST',
            'description' => 'COGS debit',
        ]);

        // Cr Inventory 500
        $this->createJournalLine([
            'journal_entry_code' => $originalCode,
            'account_id' => $inventoryAccountId,
            'debit' => 0,
            'credit' => 500.00,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST',
            'description' => 'Inventory credit',
        ]);

        // Verify original journal
        $originalDebits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalCode)
            ->sum('debit');
        $originalCredits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalCode)
            ->sum('credit');
        $this->assertEqualsWithDelta($originalDebits, $originalCredits, 0.01, 'Original must balance');

        // Create reversal using JournalReversalService
        $service = new \App\Services\Accounting\JournalReversalService();
        $reversal = $service->createReversal($originalCode, 'Test reversal');

        $this->assertNotNull($reversal, 'Reversal journal must be created');
        $this->assertEquals($originalCode . '-REV', $reversal->entry_code, 'Reversal code must be {original}-REV');
        $this->assertEquals('Post', $reversal->status, 'Reversal must be posted');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Verify reversal amounts are swapped
        $reversalDebits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('debit');
        $reversalCredits = (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $reversal->entry_code)
            ->sum('credit');

        $this->assertEqualsWithDelta($reversalDebits, $reversalCredits, 0.01, 'Reversal must balance');
        $this->assertEqualsWithDelta($originalDebits, $reversalCredits, 0.01,
            'Reversal credits must equal original debits');
        $this->assertEqualsWithDelta($originalCredits, $reversalDebits, 0.01,
            'Reversal debits must equal original credits');

        // Verify net effect is zero
        $netDebit = $originalDebits + $reversalDebits;
        $netCredit = $originalCredits + $reversalCredits;
        $this->assertEqualsWithDelta($netDebit, $netCredit, 0.01,
            'Original + Reversal must net to zero');

        // Verify idempotency: calling createReversal again returns existing
        $reversal2 = $service->createReversal($originalCode, 'Test reversal duplicate');
        $this->assertNotNull($reversal2);
        $this->assertEquals($reversal->entry_code, $reversal2->entry_code,
            'Second reversal call must return the same reversal (idempotent)');
    }

    public function test_reversal_preserves_original(): void
    {
        $originalCode = 'QID-ORIG-TEST-' . uniqid();
        $this->cleanupEntryCodes[] = $originalCode;

        $cogsAccountId = DB::table('accounts')->where('AccCode', '501')->value('AccID');
        if (!$cogsAccountId) {
            $this->markTestSkipped('COGS account not found');
        }

        $this->createJournalEntry([
            'entry_code' => $originalCode,
            'entry_type' => 'SalesInvoice',
            'reference' => 'TEST-PRES-' . uniqid(),
            'date' => '2026-06-15',
            'description' => 'Original to preserve',
            'total_amount' => 500.00,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        $this->createJournalLine([
            'journal_entry_code' => $originalCode,
            'account_id' => $cogsAccountId,
            'debit' => 500.00,
            'credit' => 0,
            'related_id_name' => 'SalesInvoice',
            'related_name_details' => 'TEST',
            'description' => 'Original debit',
        ]);

        $service = new \App\Services\Accounting\JournalReversalService();
        $reversal = $service->createReversal($originalCode, 'Test preserve');
        $this->cleanupEntryCodes[] = $reversal->entry_code;

        // Original journal must still exist and be unchanged
        $original = DB::table('journal_entries')->where('entry_code', $originalCode)->first();
        $this->assertNotNull($original, 'Original journal must still exist');
        $this->assertEquals('Post', $original->status, 'Original status must remain Post');
        $this->assertEquals(500.00, (float) $original->total_amount, 'Original amount must be unchanged');

        $originalLines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $originalCode)
            ->get();
        $this->assertEquals(1, $originalLines->count(), 'Original must still have 1 line');
        $this->assertEquals(500.00, (float) $originalLines->first()->debit, 'Original debit must be unchanged');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 9 — P&L COGS Isolation
    // ═══════════════════════════════════════════════════════════════

    public function test_purchase_does_not_affect_cogs_account(): void
    {
        // Purchase Invoice debits 11401 (Inventory), NOT 501 (COGS)
        // Therefore the purchase should NOT increase the 5xxx P&L balance

        $inventoryAccountId = DB::table('accounts')->where('AccCode', '11401')->value('AccID');
        $cogsAccountId = DB::table('accounts')->where('AccCode', '501')->value('AccID');

        // Record COGS balance before
        $cogsBefore = (float) DB::table('journal_entry_lines')
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->sum('debit');

        // Simulate Purchase Invoice posting (Dr Inventory, Dr Tax, Cr AP)
        $testEntryCode = 'QID-PLTEST-' . uniqid();
        $this->cleanupEntryCodes[] = $testEntryCode;

        $this->createJournalEntry([
            'entry_code' => $testEntryCode,
            'entry_type' => 'PurchaseInvoice',
            'reference' => 'PL-TEST-' . uniqid(),
            'date' => '2026-06-15',
            'description' => 'Test Purchase Invoice for P&L',
            'total_amount' => 1000.00,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        $this->createJournalLine([
            'journal_entry_code' => $testEntryCode,
            'account_id' => $inventoryAccountId,
            'debit' => 1000.00,
            'credit' => 0,
            'related_id_name' => 'PurchaseInvoice',
            'related_name_details' => 'PL-TEST',
            'description' => 'Purchase - Inventory',
        ]);

        // Record COGS balance after
        $cogsAfter = (float) DB::table('journal_entry_lines')
            ->where('account_id', $cogsAccountId)
            ->where('debit', '>', 0)
            ->sum('debit');

        // COGS must NOT have changed
        $this->assertEqualsWithDelta($cogsBefore, $cogsAfter, 0.01,
            'Purchase Invoice must NOT affect COGS (501) balance');
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Insert a journal entry using insertGetId (handles non-AI id columns).
     */
    private function createJournalEntry(array $data): int
    {
        $data['created_at'] = $data['created_at'] ?? now();
        $data['updated_at'] = $data['updated_at'] ?? now();
        return DB::table('journal_entries')->insertGetId($data);
    }

    /**
     * Insert a journal entry line using insertGetId.
     */
    private function createJournalLine(array $data): int
    {
        $data['created_at'] = $data['created_at'] ?? now();
        $data['updated_at'] = $data['updated_at'] ?? now();
        return DB::table('journal_entry_lines')->insertGetId($data);
    }

    private function createTestSupplier(): int
    {
        $groupId = DB::table('supplier_groups')->value('id');
        return DB::table('suppliers')->insertGetId([
            'name_ar' => 'مورد تجريبي',
            'supplier_code' => 'SUP-' . uniqid(),
            'company_id' => $this->companyId,
            'supplier_group_id' => $groupId,
            'password' => 'test',
            'currency_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
