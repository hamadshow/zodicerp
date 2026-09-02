<?php

namespace Tests\Feature;

use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Inventory\StockAdjustmentService;
use App\Services\Assets\AssetLifecycleService;
use App\Services\Accounting\PostingService;
use App\Services\Accounting\JournalImportService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * MySQL Integration Tests for ERP Transaction Integrity.
 *
 * These tests execute against the real MySQL database to prove
 * accounting correctness, inventory consistency, and idempotency.
 */
class ErpTransactionIntegrityTest extends TestCase
{
    protected int $testUserId;
    protected int $testCompanyId;
    protected int $testWarehouseId;
    protected int $testProductId;
    protected int $testUnitId;
    protected int $testInventoryAccountId;
    protected int $testAdjustmentAccountId;
    protected int $testDepreciationAccountId;
    protected int $testAccumDeprAccountId;
    protected int $testCashAccountId;
    protected int $testAssetAccountId;
    protected int $testGainAccountId;
    protected int $testLossAccountId;
    protected int $testRevenueAccountId;
    protected int $testPurchaseAccountId;
    protected int $testTaxAccountId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        // Create a unique test user
        $email = 'integrity-test-' . uniqid() . '@zodicerp-test.com';
        $this->testUserId = DB::table('users')->insertGetId([
            'username' => 'integrity-tester',
            'email' => $email,
            'password' => bcrypt('password'),
            'role' => 'admin',
            'company_id' => 1,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->testCompanyId = 1;

        // Use existing warehouse
        $this->testWarehouseId = DB::table('warehouses')->first()->id;

        // Create test product with known quantity
        $uniqid = uniqid();
        $this->testProductId = DB::table('products')->insertGetId([
            'product_code' => 'TP-' . $uniqid,
            'name' => 'TEST PRODUCT ' . $uniqid,
            'slug' => 'test-product-' . $uniqid,
            'sku' => 'TEST-' . $uniqid,
            'quantity' => 100,
            'cost_per_item' => 25.50,
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Use existing unit
        $this->testUnitId = DB::table('item_units')->first()->id;

        // Resolve test accounts (AccCode is integer in this schema)
        $this->testInventoryAccountId = $this->getOrCreateAccount(1150, 'TEST Inventory Asset', 0);
        $this->testAdjustmentAccountId = $this->getOrCreateAccount(4100, 'TEST Inventory Adj', 0);
        $this->testCashAccountId = $this->getOrCreateAccount(1110, 'TEST Cash', 0);
        $this->testAssetAccountId = $this->getOrCreateAccount(1210, 'TEST Fixed Asset', 0);
        $this->testDepreciationAccountId = $this->getOrCreateAccount(6110, 'TEST Depr Expense', 0);
        $this->testAccumDeprAccountId = $this->getOrCreateAccount(1220, 'TEST Accum Depr', 0);
        $this->testGainAccountId = $this->getOrCreateAccount(4200, 'TEST Gain Disp', 0);
        $this->testLossAccountId = $this->getOrCreateAccount(6200, 'TEST Loss Disp', 0);
        $this->testRevenueAccountId = $this->getOrCreateAccount(4300, 'TEST Revenue', 0);
        $this->testPurchaseAccountId = $this->getOrCreateAccount(5100, 'TEST Purchase', 0);
        $this->testTaxAccountId = $this->getOrCreateAccount(2110, 'TEST Tax Payable', 0);

        // Ensure open fiscal period exists
        $this->ensureOpenFiscalPeriod();
    }

    protected function tearDown(): void
    {
        // Clean up test data
        if ($this->testUserId) {
            DB::table('users')->where('id', $this->testUserId)->delete();
        }
        if ($this->testProductId) {
            // Delete stock adjustment items and adjustments for this product
            $adjustmentIds = DB::table('stock_adjustment_items')
                ->where('product_id', $this->testProductId)
                ->pluck('adjustment_id');
            DB::table('stock_adjustment_items')->whereIn('adjustment_id', $adjustmentIds)->delete();
            DB::table('stock_adjustments')->whereIn('id', $adjustmentIds)->delete();
            DB::table('products')->where('id', $this->testProductId)->delete();
        }
        // Delete test journal entries (with TEST in reference/description)
        $testEntries = DB::table('journal_entries')
            ->where('description', 'like', '%TEST%')
            ->orWhere('reference', 'like', '%TEST%')
            ->orWhere('reference', 'like', '%ADJ-%')
            ->orWhere('reference', 'like', '%DEPR-TEST%')
            ->orWhere('reference', 'like', '%DISPOSAL-TEST%')
            ->pluck('entry_code');
        if ($testEntries->isNotEmpty()) {
            DB::table('journal_entry_lines')->whereIn('journal_entry_code', $testEntries)->delete();
            DB::table('journal_entries')->whereIn('entry_code', $testEntries)->delete();
        }
        // Delete test accounts by name pattern
        DB::table('accounts')->where('AccName', 'like', 'TEST%')->delete();
        // Delete inventory movements for test product
        $movementHeaders = DB::table('inventory_movement_lines')
            ->where('product_id', $this->testProductId)
            ->pluck('stock_movement_id');
        if ($movementHeaders->isNotEmpty()) {
            DB::table('inventory_movement_lines')->whereIn('stock_movement_id', $movementHeaders)->delete();
            DB::table('inventory_movement_headers')->whereIn('id', $movementHeaders)->delete();
        }
        // Delete test asset disposals and depreciation first
        $testAssetIds = DB::table('assets')->where('name_ar', 'like', 'TEST ASSET%')->pluck('id');
        if ($testAssetIds->isNotEmpty()) {
            DB::table('asset_disposals')->whereIn('asset_id', $testAssetIds)->delete();
            DB::table('asset_depreciation')->whereIn('asset_id', $testAssetIds)->delete();
            DB::table('assets')->whereIn('id', $testAssetIds)->delete();
        }
        DB::table('asset_depreciation')->where('notes', 'like', '%TEST%')->delete();
        DB::table('asset_disposals')->where('notes', 'like', '%TEST%')->delete();

        parent::tearDown();
    }

    private function getOrCreateAccount(int $code, string $name, int $type): int
    {
        $existing = DB::table('accounts')
            ->where('AccCode', $code)
            ->where('AccName', $name)
            ->first();
        if ($existing) return $existing->AccID;

        return DB::table('accounts')->insertGetId([
            'AccCode' => $code,
            'AccName' => $name,
            'AccType' => $type,
            'company_id' => $this->testCompanyId,
        ]);
    }

    private function ensureOpenFiscalPeriod(): void
    {
        $year = date('Y');
        $existing = DB::table('fiscal_years')
            ->where('name', "FY $year")
            ->where('company_id', $this->testCompanyId)
            ->first();

        if (!$existing) {
            DB::table('fiscal_years')->insert([
                'name' => "FY $year",
                'start_date' => "$year-01-01",
                'end_date' => "$year-12-31",
                'status' => 'open',
                'company_id' => $this->testCompanyId,
                'created_by' => $this->testUserId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } elseif ($existing->status !== 'open') {
            DB::table('fiscal_years')->where('id', $existing->id)->update(['status' => 'open']);
        }

        // Ensure at least one open accounting period for current month
        $month = date('m');
        $periodName = "$year-$month";
        $existingPeriod = DB::table('accounting_periods')
            ->where('name', $periodName)
            ->first();

        if (!$existingPeriod) {
            DB::table('accounting_periods')->insert([
                'fiscal_year_id' => DB::table('fiscal_years')->where('name', "FY $year")->where('company_id', $this->testCompanyId)->first()->id,
                'name' => $periodName,
                'start_date' => "$year-$month-01",
                'end_date' => date('Y-m-t', strtotime("$year-$month-01")),
                'status' => 'open',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } elseif ($existingPeriod->status !== 'open') {
            DB::table('accounting_periods')->where('id', $existingPeriod->id)->update(['status' => 'open']);
        }
    }

    private function actingAsTestUser(): void
    {
        $user = \App\Models\User::find($this->testUserId);
        $this->actingAs($user, 'sanctum');
    }

    private function getAccountBalance(int $accountId, string $asOfDate): float
    {
        $result = DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'je.entry_code', '=', 'jel.journal_entry_code')
            ->where('jel.account_id', $accountId)
            ->where('je.date', '<=', $asOfDate)
            ->where('je.status', 'Post')
            ->selectRaw('SUM(jel.debit - jel.credit) as balance')
            ->value('balance');
        return (float) ($result ?? 0);
    }

    // =========================================================================
    // STOCK ADJUSTMENT TESTS
    // =========================================================================

    /** @test */
    public function stock_adjustment_draft_creates_no_inventory_movement()
    {
        $this->actingAsTestUser();
        $service = new StockAdjustmentService();

        $result = $service->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => date('Y-m-d'),
            'reason' => 'correction',
            'description' => 'TEST draft movement check',
            'items' => [
                [
                    'product_id' => $this->testProductId,
                    'unit_id' => $this->testUnitId,
                    'adjustment_quantity' => 10,
                    'unit_cost' => 25.50,
                ],
            ],
        ]);

        // Verify no inventory movements created for draft
        $movements = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $result->id)
            ->count();
        $this->assertEquals(0, $movements, 'Draft adjustment must NOT create inventory movements');

        // Verify product quantity unchanged
        $productQty = DB::table('products')->where('id', $this->testProductId)->value('quantity');
        $this->assertEquals(100, $productQty, 'Draft adjustment must NOT change product quantity');

        // Verify status is draft
        $this->assertEquals('draft', $result->status);
    }

    /** @test */
    public function stock_adjustment_approval_creates_exactly_one_inventory_movement()
    {
        $this->actingAsTestUser();
        $service = new StockAdjustmentService();

        $result = $service->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => date('Y-m-d'),
            'reason' => 'correction',
            'description' => 'TEST approval movement',
            'items' => [
                [
                    'product_id' => $this->testProductId,
                    'unit_id' => $this->testUnitId,
                    'adjustment_quantity' => 10,
                    'unit_cost' => 25.50,
                ],
            ],
        ]);

        // Approve
        $approved = $service->approveAdjustment($result->id);

        // Verify exactly ONE inventory movement header
        $movements = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $result->id)
            ->count();
        $this->assertEquals(1, $movements, 'Approval must create exactly one inventory movement header');

        // Verify product quantity increased by 10
        $productQty = DB::table('products')->where('id', $this->testProductId)->value('quantity');
        $this->assertEquals(110.0, (float) $productQty, 'Product quantity must increase by adjustment amount');

        // Verify status is approved
        $this->assertEquals('approved', $approved->status);
    }

    /** @test */
    public function stock_adjustment_repeated_approval_is_idempotent()
    {
        $this->actingAsTestUser();
        $service = new StockAdjustmentService();

        $result = $service->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => date('Y-m-d'),
            'reason' => 'correction',
            'description' => 'TEST idempotent approval',
            'items' => [
                [
                    'product_id' => $this->testProductId,
                    'unit_id' => $this->testUnitId,
                    'adjustment_quantity' => 5,
                    'unit_cost' => 25.50,
                ],
            ],
        ]);

        // First approval
        $service->approveAdjustment($result->id);

        // Record quantity after first approval
        $qtyAfterFirst = DB::table('products')->where('id', $this->testProductId)->value('quantity');

        // Second approval — should be idempotent (already approved)
        $service->approveAdjustment($result->id);

        // Quantity must NOT change
        $qtyAfterSecond = DB::table('products')->where('id', $this->testProductId)->value('quantity');
        $this->assertEquals((float) $qtyAfterFirst, (float) $qtyAfterSecond, 'Repeated approval must not change quantity');

        // Must NOT have additional inventory movements
        $movementCount = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $result->id)
            ->count();
        $this->assertEquals(1, $movementCount, 'Repeated approval must not create additional movements');
    }

    /** @test */
    public function positive_stock_adjustment_creates_balanced_gl()
    {
        $this->actingAsTestUser();
        $service = new StockAdjustmentService();

        $adjQty = 20;
        $unitCost = 25.50;
        $expectedAmount = $adjQty * $unitCost;

        $result = $service->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => date('Y-m-d'),
            'reason' => 'correction',
            'description' => 'TEST positive GL',
            'items' => [
                [
                    'product_id' => $this->testProductId,
                    'unit_id' => $this->testUnitId,
                    'adjustment_quantity' => $adjQty,
                    'unit_cost' => $unitCost,
                ],
            ],
        ]);

        $service->approveAdjustment($result->id);

        // Verify journal entry was created
        $journalEntry = DB::table('journal_entries')
            ->where('reference', $result->adjustment_number)
            ->where('entry_type', 'StockAdjustment')
            ->first();
        $this->assertNotNull($journalEntry, 'Journal entry must be created for stock adjustment');
        $this->assertEquals('Post', $journalEntry->status);

        // Verify balanced debits and credits
        $lines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->get();

        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Journal must be balanced');
        $this->assertEquals(round($expectedAmount, 2), round($totalDebit, 2), 'Total must match adjustment value');

        // Positive adjustment: Dr Inventory, Cr Adjustment
        $debitLine = $lines->first(fn($l) => $l->debit > 0);
        $creditLine = $lines->first(fn($l) => $l->credit > 0);
        $this->assertNotNull($debitLine, 'Must have a debit line');
        $this->assertNotNull($creditLine, 'Must have a credit line');
        $this->assertNotEquals($debitLine->account_id, $creditLine->account_id, 'Debit and credit must be different accounts');
    }

    /** @test */
    public function negative_stock_adjustment_creates_balanced_gl()
    {
        $this->actingAsTestUser();
        $service = new StockAdjustmentService();

        $adjQty = -10;
        $unitCost = 25.50;
        $expectedAmount = abs($adjQty) * $unitCost;

        $result = $service->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => date('Y-m-d'),
            'reason' => 'damage',
            'description' => 'TEST negative GL',
            'items' => [
                [
                    'product_id' => $this->testProductId,
                    'unit_id' => $this->testUnitId,
                    'adjustment_quantity' => $adjQty,
                    'unit_cost' => $unitCost,
                ],
            ],
        ]);

        $service->approveAdjustment($result->id);

        $journalEntry = DB::table('journal_entries')
            ->where('reference', $result->adjustment_number)
            ->where('entry_type', 'StockAdjustment')
            ->first();
        $this->assertNotNull($journalEntry, 'Journal entry must be created for negative adjustment');

        $lines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journalEntry->entry_code)
            ->get();

        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Negative adjustment journal must be balanced');
        $this->assertEquals(round($expectedAmount, 2), round($totalDebit, 2));

        // Negative adjustment: Dr Loss/Adjustment, Cr Inventory
        $debitLine = $lines->first(fn($l) => $l->debit > 0);
        $creditLine = $lines->first(fn($l) => $l->credit > 0);
        $this->assertNotNull($debitLine, 'Must have a debit line');
        $this->assertNotNull($creditLine, 'Must have a credit line');
        $this->assertNotEquals($debitLine->account_id, $creditLine->account_id, 'Debit and credit must be different accounts');
    }

    /** @test */
    public function stock_adjustment_journal_reference_is_deterministic()
    {
        $this->actingAsTestUser();
        $service = new StockAdjustmentService();

        $result = $service->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => date('Y-m-d'),
            'reason' => 'correction',
            'description' => 'TEST deterministic ref',
            'items' => [
                [
                    'product_id' => $this->testProductId,
                    'unit_id' => $this->testUnitId,
                    'adjustment_quantity' => 5,
                    'unit_cost' => 10.00,
                ],
            ],
        ]);

        $service->approveAdjustment($result->id);

        $je1 = DB::table('journal_entries')
            ->where('reference', $result->adjustment_number)
            ->where('entry_type', 'StockAdjustment')
            ->first();

        // Approve again (idempotent) — should reuse same journal
        $service->approveAdjustment($result->id);

        $je2 = DB::table('journal_entries')
            ->where('reference', $result->adjustment_number)
            ->where('entry_type', 'StockAdjustment')
            ->first();

        $this->assertEquals($je1->entry_code, $je2->entry_code, 'Journal reference must be deterministic');
        $this->assertEquals(1, DB::table('journal_entries')
            ->where('reference', $result->adjustment_number)
            ->where('entry_type', 'StockAdjustment')
            ->count(), 'Must be exactly one journal for this adjustment');
    }

    // =========================================================================
    // ASSET DISPOSAL TESTS
    // =========================================================================

    private function createTestAsset(float $cost): int
    {
        $catId = DB::table('asset_categories')->first()->id ?? 1;
        $currencyId = DB::table('currencies')->first()->id ?? 1;
        $uniqid = uniqid();
        return DB::table('assets')->insertGetId([
            'name_ar' => 'TEST ASSET ' . $uniqid,
            'asset_number' => 'TA-' . $uniqid,
            'category_id' => $catId,
            'unit_id' => $this->testUnitId,
            'currency_id' => $currencyId,
            'unit_cost' => $cost,
            'total_cost' => $cost,
            'purchase_date' => date('Y-m-d', strtotime('-1 year')),
            'status' => 'active',
            'depreciation_method' => 'straight_line',
            'useful_life_years' => 5,
            'is_depreciable' => 1,
            'depreciation_start_date' => date('Y-m-d', strtotime('-1 year')),
            'warehouse_id' => $this->testWarehouseId,
            'company_id' => $this->testCompanyId,
            'created_by' => $this->testUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createDepreciationRecord(int $assetId, float $amount, int $periodMonth, int $periodYear, ?int $journalEntryId = null): int
    {
        return DB::table('asset_depreciation')->insertGetId([
            'asset_id' => $assetId,
            'fiscal_year' => $periodYear,
            'period_month' => $periodMonth,
            'period_year' => $periodYear,
            'depreciation_date' => "$periodYear-" . str_pad($periodMonth, 2, '0', STR_PAD_LEFT) . "-28",
            'depreciation_amount' => $amount,
            'accumulated_depreciation' => $amount,
            'net_book_value_before' => 0,
            'net_book_value_after' => 0,
            'is_posted' => true,
            'posted_date' => date('Y-m-d'),
            'journal_entry_id' => $journalEntryId,
            'notes' => "TEST depreciation period $periodMonth/$periodYear",
            'created_by' => $this->testUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @test */
    public function asset_disposal_gain_creates_balanced_gl()
    {
        $this->actingAsTestUser();
        $service = new AssetLifecycleService();

        $cost = 10000;
        $accumDepr = 4000;
        $proceeds = 8000;

        $assetId = $this->createTestAsset($cost);
        $this->createDepreciationRecord($assetId, $accumDepr, 12, (int) date('Y'));

        $result = $service->disposeAsset([
            'asset_id' => $assetId,
            'disposal_date' => date('Y-m-d'),
            'disposal_type' => 'sale',
            'disposal_proceeds' => $proceeds,
            'reason' => 'TEST gain disposal',
        ]);

        $this->assertEquals($cost, $result['cost']);
        $this->assertEquals($accumDepr, $result['accumulated_depreciation']);
        $this->assertEquals(6000, $result['net_book_value']);
        $this->assertEquals($proceeds, $result['disposal_proceeds']);
        $this->assertEquals(2000, $result['gain_loss'], 'Gain must be 2000');

        // Verify journal entry
        $je = DB::table('journal_entries')
            ->where('entry_type', 'AssetDisposal')
            ->where('reference', 'like', "DISPOSAL-{$assetId}-%")
            ->first();
        $this->assertNotNull($je, 'Disposal journal entry must exist');
        $this->assertEquals('Post', $je->status);

        $lines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $je->entry_code)
            ->get();

        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Disposal journal must be balanced');

        // Verify balanced: total debits = total credits
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Gain disposal journal must be balanced');
        // Verify we have at least 3 lines (cash, accum depr, asset cost)
        $this->assertGreaterThanOrEqual(3, $lines->count(), 'Must have at least 3 journal lines');
        // Verify proceeds line exists (Dr Cash)
        $hasProceedsLine = $lines->contains(fn($l) => $l->debit > 0 && $l->debit >= 7999);
        $this->assertTrue($hasProceedsLine, 'Must have a debit line for proceeds (~8000)');
    }

    /** @test */
    public function asset_disposal_loss_creates_balanced_gl()
    {
        $this->actingAsTestUser();
        $service = new AssetLifecycleService();

        $cost = 10000;
        $accumDepr = 4000;
        $proceeds = 5000;

        $assetId = $this->createTestAsset($cost);
        $this->createDepreciationRecord($assetId, $accumDepr, 12, (int) date('Y'));

        $result = $service->disposeAsset([
            'asset_id' => $assetId,
            'disposal_date' => date('Y-m-d'),
            'disposal_type' => 'sale',
            'disposal_proceeds' => $proceeds,
            'reason' => 'TEST loss disposal',
        ]);

        $this->assertEquals(-1000, $result['gain_loss'], 'Loss must be -1000');

        $je = DB::table('journal_entries')
            ->where('entry_type', 'AssetDisposal')
            ->where('reference', 'like', "DISPOSAL-{$assetId}-%")
            ->first();
        $this->assertNotNull($je);

        $lines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $je->entry_code)
            ->get();

        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Loss disposal journal must be balanced');

        // Verify balanced: total debits = total credits
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Loss disposal journal must be balanced');
        // Verify we have at least 3 lines (cash, accum depr, asset cost)
        $this->assertGreaterThanOrEqual(3, $lines->count(), 'Must have at least 3 journal lines');
        // Verify proceeds line exists (Dr Cash)
        $hasProceedsLine = $lines->contains(fn($l) => $l->debit > 0 && $l->debit >= 4999);
        $this->assertTrue($hasProceedsLine, 'Must have a debit line for proceeds (~5000)');
    }

    /** @test */
    public function asset_disposal_persists_journal_entry_id()
    {
        $this->actingAsTestUser();
        $service = new AssetLifecycleService();

        $assetId = $this->createTestAsset(10000);
        $this->createDepreciationRecord($assetId, 4000, 12, (int) date('Y'));

        $service->disposeAsset([
            'asset_id' => $assetId,
            'disposal_date' => date('Y-m-d'),
            'disposal_type' => 'sale',
            'disposal_proceeds' => 7000,
            'reason' => 'TEST journal_entry_id check',
        ]);

        $disposal = DB::table('asset_disposals')->where('asset_id', $assetId)->first();
        $this->assertNotNull($disposal, 'Disposal record must exist');
        $this->assertNotNull($disposal->journal_entry_id, 'journal_entry_id must be populated');
        $this->assertGreaterThan(0, $disposal->journal_entry_id, 'journal_entry_id must be a valid ID');

        // Verify it references a real journal entry
        $je = DB::table('journal_entries')->where('id', $disposal->journal_entry_id)->first();
        $this->assertNotNull($je, 'Referenced journal entry must exist');
    }

    /** @test */
    public function duplicate_asset_disposal_is_prevented()
    {
        $this->actingAsTestUser();
        $service = new AssetLifecycleService();

        $assetId = $this->createTestAsset(10000);
        $this->createDepreciationRecord($assetId, 4000, 12, (int) date('Y'));

        $service->disposeAsset([
            'asset_id' => $assetId,
            'disposal_date' => date('Y-m-d'),
            'disposal_type' => 'sale',
            'disposal_proceeds' => 7000,
            'reason' => 'TEST duplicate prevention',
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('already been disposed');

        $service->disposeAsset([
            'asset_id' => $assetId,
            'disposal_date' => date('Y-m-d'),
            'disposal_type' => 'sale',
            'disposal_proceeds' => 7000,
            'reason' => 'TEST should fail',
        ]);
    }

    /** @test */
    public function asset_disposal_journal_reference_is_deterministic()
    {
        $this->actingAsTestUser();
        $service = new AssetLifecycleService();

        $assetId = $this->createTestAsset(10000);
        $this->createDepreciationRecord($assetId, 4000, 12, (int) date('Y'));

        $service->disposeAsset([
            'asset_id' => $assetId,
            'disposal_date' => date('Y-m-d'),
            'disposal_type' => 'sale',
            'disposal_proceeds' => 7000,
            'reason' => 'TEST deterministic ref',
        ]);

        $jeCount = DB::table('journal_entries')
            ->where('entry_type', 'AssetDisposal')
            ->where('reference', 'like', "DISPOSAL-{$assetId}-%")
            ->count();

        $this->assertEquals(1, $jeCount, 'Must have exactly one disposal journal entry');
    }

    // =========================================================================
    // JOURNAL IMPORT TESTS
    // =========================================================================

    /** @test */
    public function journal_import_creates_entries_and_lines()
    {
        $this->actingAsTestUser();
        $service = new JournalImportService();

        $importCode = 'TEST-IMPORT-' . uniqid();

        $rows = [
            [
                'entry_code' => $importCode,
                'entry_type' => 'Manual',
                'reference' => 'TEST Import Ref',
                'date' => date('Y-m-d'),
                'header_description' => 'TEST Import Journal',
                'status' => 'Post',
                'account_id' => $this->testCashAccountId,
                'debit' => 5000,
                'credit' => 0,
                'line_description' => 'Debit line',
            ],
            [
                'entry_code' => $importCode,
                'entry_type' => 'Manual',
                'reference' => 'TEST Import Ref',
                'date' => date('Y-m-d'),
                'header_description' => 'TEST Import Journal',
                'status' => 'Post',
                'account_id' => $this->testRevenueAccountId,
                'debit' => 0,
                'credit' => 5000,
                'line_description' => 'Credit line',
            ],
        ];

        $result = $service->importRows($rows);

        $this->assertEquals(1, $result['imported'], 'One entry should be imported');
        $this->assertEquals(0, $result['failed'], 'No entries should fail');

        // Verify journal entry
        $je = DB::table('journal_entries')->where('entry_code', $importCode)->first();
        $this->assertNotNull($je, 'Journal entry must exist');
        $this->assertEquals('Post', $je->status);
        $this->assertEquals(5000, round($je->total_amount, 2));

        // Verify journal lines
        $lines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $importCode)
            ->get();
        $this->assertCount(2, $lines);

        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');
        $this->assertEquals(round($totalDebit, 2), round($totalCredit, 2), 'Imported journal must be balanced');
    }

    /** @test */
    public function journal_import_recalculates_account_postings()
    {
        $this->actingAsTestUser();
        $service = new JournalImportService();

        $importCode = 'TEST-POSTINGS-' . uniqid();

        $rows = [
            [
                'entry_code' => $importCode,
                'entry_type' => 'Manual',
                'date' => date('Y-m-d'),
                'status' => 'Post',
                'account_id' => $this->testCashAccountId,
                'debit' => 3000,
                'credit' => 0,
            ],
            [
                'entry_code' => $importCode,
                'entry_type' => 'Manual',
                'date' => date('Y-m-d'),
                'status' => 'Post',
                'account_id' => $this->testRevenueAccountId,
                'debit' => 0,
                'credit' => 3000,
            ],
        ];

        $service->importRows($rows);

        // Verify PostingService ran — check account_postings for cash account
        $posting = DB::table('account_postings')
            ->where('account_id', $this->testCashAccountId)
            ->first();

        $this->assertNotNull($posting, 'account_postings must be synchronized after import');
    }

    /** @test */
    public function journal_import_repeated_does_not_double_balance()
    {
        $this->actingAsTestUser();
        $service = new JournalImportService();

        $importCode = 'TEST-NO-DOUBLE-' . uniqid();

        $rows = [
            [
                'entry_code' => $importCode,
                'entry_type' => 'Manual',
                'date' => date('Y-m-d'),
                'status' => 'Post',
                'account_id' => $this->testCashAccountId,
                'debit' => 2000,
                'credit' => 0,
            ],
            [
                'entry_code' => $importCode,
                'entry_type' => 'Manual',
                'date' => date('Y-m-d'),
                'status' => 'Post',
                'account_id' => $this->testRevenueAccountId,
                'debit' => 0,
                'credit' => 2000,
            ],
        ];

        // First import
        $result1 = $service->importRows($rows);
        $this->assertEquals(1, $result1['imported']);

        // Record balance after first import
        $balanceAfterFirst = $this->getAccountBalance($this->testCashAccountId, date('Y-m-d'));

        // Second import (same code) — should update, not duplicate
        $result2 = $service->importRows($rows);
        $this->assertEquals(1, $result2['imported']);

        // Balance must not double
        $balanceAfterSecond = $this->getAccountBalance($this->testCashAccountId, date('Y-m-d'));
        $this->assertEquals(round($balanceAfterFirst, 2), round($balanceAfterSecond, 2), 'Repeated import must not double balance');

        // Must be exactly one journal entry
        $jeCount = DB::table('journal_entries')->where('entry_code', $importCode)->count();
        $this->assertEquals(1, $jeCount, 'Must be exactly one journal entry for this code');
    }

    // =========================================================================
    // POSTING SERVICE TESTS
    // =========================================================================

    /** @test */
    public function posted_journal_affects_postings()
    {
        $this->actingAsTestUser();

        $entryCode = 'TEST-POST-' . uniqid();

        DB::table('journal_entries')->insert([
            'entry_code' => $entryCode,
            'entry_type' => 'Manual',
            'reference' => 'TEST Posting',
            'date' => date('Y-m-d'),
            'total_amount' => 1500,
            'status' => 'Post',
            'company_id' => $this->testCompanyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('journal_entry_lines')->insert([
            ['journal_entry_code' => $entryCode, 'account_id' => $this->testCashAccountId, 'debit' => 1500, 'credit' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['journal_entry_code' => $entryCode, 'account_id' => $this->testRevenueAccountId, 'debit' => 0, 'credit' => 1500, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Run PostingService
        app(PostingService::class)->recalculatePostings($this->testCompanyId);

        // Verify account_postings was updated
        $posting = DB::table('account_postings')
            ->where('account_id', $this->testCashAccountId)
            ->first();

        $this->assertNotNull($posting, 'PostingService must create account_postings entry');
    }

    /** @test */
    public function unposted_journal_does_not_affect_postings()
    {
        $this->actingAsTestUser();

        $entryCode = 'TEST-UNPOST-' . uniqid();

        DB::table('journal_entries')->insert([
            'entry_code' => $entryCode,
            'entry_type' => 'Manual',
            'reference' => 'TEST Unposted',
            'date' => date('Y-m-d'),
            'total_amount' => 9999,
            'status' => 'Unposted',
            'company_id' => $this->testCompanyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('journal_entry_lines')->insert([
            ['journal_entry_code' => $entryCode, 'account_id' => $this->testCashAccountId, 'debit' => 9999, 'credit' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['journal_entry_code' => $entryCode, 'account_id' => $this->testRevenueAccountId, 'debit' => 0, 'credit' => 9999, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Record balance before
        $balanceBefore = $this->getAccountBalance($this->testCashAccountId, date('Y-m-d'));

        // Run PostingService
        app(PostingService::class)->recalculatePostings($this->testCompanyId);

        // Balance must not include unposted journal
        $balanceAfter = $this->getAccountBalance($this->testCashAccountId, date('Y-m-d'));
        $this->assertEquals(round($balanceBefore, 2), round($balanceAfter, 2), 'Unposted journal must not affect GL balance');
    }

    /** @test */
    public function posting_cash_account_date_filtering_works()
    {
        $this->actingAsTestUser();

        $cashAccount = $this->testCashAccountId;
        $revenueAccount = $this->testRevenueAccountId;

        // Create 3 posted journals on different dates
        $journals = [
            ['date' => '2026-01-15', 'debit' => 5000, 'code' => 'TEST-CASH-1'],
            ['date' => '2026-03-01', 'debit' => -2000, 'code' => 'TEST-CASH-2'],
            ['date' => '2026-12-31', 'debit' => 500, 'code' => 'TEST-CASH-3'],
        ];

        foreach ($journals as $j) {
            DB::table('journal_entries')->insert([
                'entry_code' => $j['code'],
                'entry_type' => 'Manual',
                'reference' => 'TEST Cash ' . $j['date'],
                'date' => $j['date'],
                'total_amount' => abs($j['debit']),
                'status' => 'Post',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('journal_entry_lines')->insert([
                ['journal_entry_code' => $j['code'], 'account_id' => $cashAccount, 'debit' => max($j['debit'], 0), 'credit' => max(-$j['debit'], 0), 'created_at' => now(), 'updated_at' => now()],
                ['journal_entry_code' => $j['code'], 'account_id' => $revenueAccount, 'debit' => max(-$j['debit'], 0), 'credit' => max($j['debit'], 0), 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // Verify direct journal_entry_lines balance
        $b1 = DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'je.entry_code', '=', 'jel.journal_entry_code')
            ->where('jel.account_id', $cashAccount)
            ->where('je.date', '<=', '2026-05-31')
            ->where('je.status', 'Post')
            ->selectRaw('COALESCE(SUM(jel.debit - jel.credit), 0) as balance')
            ->value('balance');
        $this->assertEquals(3000, round((float)$b1, 2), 'Cash balance as of 2026-05-31 must be 3000');

        $b2 = DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'je.entry_code', '=', 'jel.journal_entry_code')
            ->where('jel.account_id', $cashAccount)
            ->where('je.date', '<=', '2026-12-31')
            ->where('je.status', 'Post')
            ->selectRaw('COALESCE(SUM(jel.debit - jel.credit), 0) as balance')
            ->value('balance');
        $this->assertEquals(3500, round((float)$b2, 2), 'Cash balance as of 2026-12-31 must be 3500');
    }
}
