<?php

namespace Tests\Feature;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\Vendor_Purchases\LandedCostService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 9 — Landed Cost lifecycle audit.
 *
 * Pins the value-only capitalization contract end to end:
 *
 *   draft → allocate (proportional to accepted received value, last line
 *   takes the remainder) → post (WAC applyValueAdjustment per allocation +
 *   LandedCost journal Dr 11401 / Cr credit account, company-stamped) →
 *   reverse (only what is still capitalized in the REMAINING units is
 *   reversed from WAC; the consumed part is corrected through
 *   Dr Inventory / Cr COGS so the ledger nets out).
 *
 * Multi-company boundary: allocate/post/cancel/reverse/preview of another
 * company's landed cost is a 404; storing against a foreign invoice is 404.
 */
class LandedCostLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $otherCompanyId = 2;

    protected int $userId;

    protected int $otherUserId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $productId;

    protected int $unitId;

    protected int $currencyId;

    protected int $supplierId;

    protected int $inventoryAccountId;

    protected int $creditAccountId;

    protected int $cogsAccountId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        foreach ([$this->companyId, $this->otherCompanyId] as $cid) {
            DB::table('company')->insertOrIgnore([
                'id' => $cid,
                'company_name' => 'Landed Cost Co '.$cid,
                'company_code' => 'LC'.$cid,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'lcl_'.$suffix,
            'fullname' => 'Landed Cost Tester',
            'email' => 'lcl_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId)); // default guard → CompanyContext

        $this->otherUserId = DB::table('users')->insertGetId([
            'username' => 'lclx_'.$suffix,
            'fullname' => 'Landed Cost Tester Other Co',
            'email' => 'lclx_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->otherCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'LCL-BR-'.$suffix,
            'branch_name' => 'LCL Branch '.$suffix,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'LCL-WH-'.$suffix,
            'name' => 'LCL Warehouse '.$suffix,
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'LCL Base Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'LCL-PRD-'.$suffix,
            'name' => 'LCL Product '.$suffix,
            'slug' => 'lcl-product-'.$suffix,
            'sku' => 'LCL-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 100,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->currencyId = DB::table('currencies')->insertGetId([
            'code' => 'LCL',
            'name' => 'Landed Cost Currency',
            'symbol' => 'L',
            'status' => 'active',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $groupId = DB::table('supplier_groups')->insertGetId([
            // code column is narrow — keep the unique part short.
            'code' => 'LCLG-'.substr(uniqid(), -8),
            'name_ar' => 'موردو LCL',
            'name_en' => 'LCL Supplier Group',
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->supplierId = DB::table('suppliers')->insertGetId([
            'supplier_code' => 'LCL-SUP-'.$suffix,
            'name_ar' => 'مورد LCL',
            'name_en' => 'LCL Supplier',
            'supplier_group_id' => $groupId,
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([['11401', 'Inventory Asset', 1], ['501', 'Cost of Sales', 1], ['2111', 'Accounts Payable', 2]] as [$code, $name, $type]) {
            DB::table('accounts')->insertOrIgnore([
                'AccCode' => $code,
                'AccName' => $name,
                'AccType' => $type,
                'AccFinal' => 1,
                'AccStopped' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $this->inventoryAccountId = (int) DB::table('accounts')->where('AccCode', '11401')->value('AccID');
        $this->creditAccountId = (int) DB::table('accounts')->where('AccCode', '2111')->value('AccID');
        $this->cogsAccountId = (int) DB::table('accounts')->where('AccCode', '501')->value('AccID');
    }

    // =====================================================================
    // happy path: allocate → post
    // =====================================================================

    public function test_allocate_and_post_capitalize_value_and_book_journal(): void
    {
        $this->seedStock('10', '100'); // WAC: qty 10, value 1000
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);

        $this->post(route('admin.purchases.landed-costs.allocate', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $landedCost->refresh();
        $this->assertSame('allocated', $landedCost->status);
        $this->assertSame(100.0, (float) $landedCost->allocated_amount);

        // One eligible line: allocation = 100 × (1000/1000) = 100, per unit 10.
        $allocation = DB::table('landed_cost_allocations')->where('landed_cost_id', $landedCost->id)->first();
        $this->assertNotNull($allocation);
        $this->assertSame(100.0, (float) $allocation->allocated_amount);
        $this->assertSame(10.0, (float) $allocation->allocated_per_unit);
        $this->assertSame($this->companyId, (int) $allocation->company_id);

        $this->post(route('admin.purchases.landed-costs.post', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $landedCost->refresh();
        $this->assertSame('posted', $landedCost->status);
        $this->assertNotNull($landedCost->posted_journal_entry_code);

        // WAC value-only capitalization: qty unchanged, value +100.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(10.0, (float) $balance->quantity);
        $this->assertSame(1100.0, (float) $balance->inventory_value);

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'landed_cost_allocation')
            ->where('source_id', $allocation->id)
            ->first();
        $this->assertNotNull($ict, 'Posting must write the landed cost ICT.');
        $this->assertSame(100.0, (float) $ict->value_delta);

        // Journal: Dr Inventory 11401 / Cr credit account, company-stamped.
        $journal = DB::table('journal_entries')
            ->where('entry_type', 'LandedCost')
            ->where('reference', $landedCost->reference_number)
            ->first();
        $this->assertNotNull($journal);
        $this->assertSame($this->companyId, (int) $journal->company_id);
        $this->assertSame(100.0, (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->where('account_id', $this->inventoryAccountId)->value('debit'));
        $this->assertSame(100.0, (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->where('account_id', $this->creditAccountId)->value('credit'));
        $this->assertSame($this->companyId, (int) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->first()->company_id);

        // Double post is an idempotent no-op.
        $this->post(route('admin.purchases.landed-costs.post', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'landed_cost_allocation')->count(), 'Double post must not duplicate the WAC adjustment.');
        $this->assertSame(1100.0, (float) DB::table('inventory_cost_balances')->where('product_id', $this->productId)->value('inventory_value'));
    }

    // =====================================================================
    // post guards
    // =====================================================================

    public function test_post_requires_allocation_first(): void
    {
        $this->seedStock('10', '100');
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId); // left in draft

        $this->post(route('admin.purchases.landed-costs.post', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $landedCost->refresh();
        $this->assertSame('draft', $landedCost->status);
        $this->assertNull($landedCost->posted_journal_entry_code);
        $this->assertSame(0, DB::table('landed_cost_allocations')->count());
    }

    public function test_post_refuses_without_remaining_inventory(): void
    {
        // No seeded stock → WAC balance quantity is zero everywhere.
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);
        app(LandedCostService::class)->allocate($landedCost);

        $this->post(route('admin.purchases.landed-costs.post', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $landedCost->refresh();
        $this->assertSame('allocated', $landedCost->status);
        $this->assertNull($landedCost->posted_journal_entry_code);
    }

    // =====================================================================
    // reversal
    // =====================================================================

    public function test_reverse_restores_full_capitalization_when_nothing_consumed(): void
    {
        $this->seedStock('10', '100');
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);
        app(LandedCostService::class)->allocate($landedCost);
        app(LandedCostService::class)->post($landedCost->fresh());

        $this->post(route('admin.purchases.landed-costs.reverse', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $landedCost->refresh();
        $this->assertSame('cancelled', $landedCost->status);
        $this->assertNotNull($landedCost->reversal_journal_entry_code);

        // WAC back to pre-capitalization.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(10.0, (float) $balance->quantity);
        $this->assertSame(1000.0, (float) $balance->inventory_value);

        // Reversal ICT + journal reversal exist.
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'landed_cost_reversal')->count());
        $original = DB::table('journal_entries')->where('entry_type', 'LandedCost')->where('reference', $landedCost->reference_number)->first();
        $this->assertNotNull($original, 'Original journal preserved.');
        $this->assertSame(1, DB::table('journal_entries')->where('entry_code', $original->entry_code.'-REV')->count());

        // Reversal is terminal: a second reverse is refused (status is now
        // cancelled) and must not write a second reversal ICT.
        $this->post(route('admin.purchases.landed-costs.reverse', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('error');
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'landed_cost_reversal')->count());
    }

    public function test_reverse_after_partial_consumption_reverses_only_remaining_capitalization(): void
    {
        $this->seedStock('10', '100'); // value 1000
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);
        app(LandedCostService::class)->allocate($landedCost); // +10 value, per unit +1
        app(LandedCostService::class)->post($landedCost->fresh()); // value 1010, avg 101

        // Sell 5 units at the raised average → value 505, qty 5.
        app(WeightedAverageCostService::class)->applyOutbound(
            $this->productId,
            $this->warehouseId,
            '5',
            'lcl_test_sale',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        $this->post(route('admin.purchases.landed-costs.reverse', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('success');

        // Only the 5 still-capitalized units are reversed from WAC (5 × 1):
        // 505 − 5 = 500 = the exact pre-landed-cost value of the remaining stock.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(5.0, (float) $balance->quantity);
        $this->assertSame(500.0, (float) $balance->inventory_value, 'Reversal must not over-remove from WAC.');

        // The consumed 5 units (5 × per-unit 10 = 50) are corrected through
        // Dr Inventory / Cr COGS.
        $correction = DB::table('journal_entries')
            ->where('entry_type', 'LandedCostReversalCorrection')
            ->where('reference', $landedCost->reference_number)
            ->first();
        $this->assertNotNull($correction, 'Consumed cost correction journal must exist.');
        $this->assertSame(50.0, (float) $correction->total_amount);
        $this->assertSame(50.0, (float) DB::table('journal_entry_lines')->where('journal_entry_code', $correction->entry_code)->where('account_id', $this->inventoryAccountId)->value('debit'));
        $this->assertSame(50.0, (float) DB::table('journal_entry_lines')->where('journal_entry_code', $correction->entry_code)->where('account_id', $this->cogsAccountId)->value('credit'));
    }

    // =====================================================================
    // cancel
    // =====================================================================

    public function test_cancel_draft_and_refuse_posted(): void
    {
        $this->seedStock('10', '100');
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);

        $this->post(route('admin.purchases.landed-costs.cancel', ['landedCost' => $landedCost->id]))
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertSame('cancelled', $landedCost->fresh()->status);

        // A posted landed cost requires reversal, not plain cancel.
        $posted = $this->createLandedCost(50, $invoiceId);
        app(LandedCostService::class)->allocate($posted);
        app(LandedCostService::class)->post($posted->fresh());

        $this->post(route('admin.purchases.landed-costs.cancel', ['landedCost' => $posted->id]))
            ->assertRedirect()
            ->assertSessionHas('error');
        $this->assertSame('posted', $posted->fresh()->status);
    }

    // =====================================================================
    // multi-company boundary
    // =====================================================================

    public function test_cross_company_lifecycle_actions_are_invisible(): void
    {
        $this->seedStock('10', '100');
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);

        $this->actingAs(User::find($this->otherUserId));

        $this->post(route('admin.purchases.landed-costs.allocate', ['landedCost' => $landedCost->id]))->assertNotFound();
        $this->post(route('admin.purchases.landed-costs.post', ['landedCost' => $landedCost->id]))->assertNotFound();
        $this->post(route('admin.purchases.landed-costs.cancel', ['landedCost' => $landedCost->id]))->assertNotFound();
        $this->post(route('admin.purchases.landed-costs.reverse', ['landedCost' => $landedCost->id]))->assertNotFound();
        $this->get(route('admin.purchases.landed-costs.preview', ['landedCost' => $landedCost->id]))->assertNotFound();

        // Storing against a foreign invoice is also a 404.
        $this->post(route('admin.purchases.landed-costs.store'), [
            'purchase_invoice_id' => $invoiceId,
            'total_amount' => 25,
            'credit_source_type' => 'ap',
            'credit_account_id' => $this->creditAccountId,
        ])->assertNotFound();

        // Nothing happened to the landed cost.
        $this->actingAs(User::find($this->userId));
        $this->assertSame('draft', $landedCost->fresh()->status);
        $this->assertSame(0, DB::table('landed_cost_allocations')->count());
    }

    // =====================================================================
    // Phase 20 — the landing journal resolves through the link table
    // =====================================================================

    /** @test */
    public function posting_twice_reuses_the_live_journal_instead_of_duplicating(): void
    {
        $this->seedStock('10', '100');
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();
        $landedCost = $this->createLandedCost(100, $invoiceId);

        app(LandedCostService::class)->allocate($landedCost);
        app(LandedCostService::class)->post($landedCost->fresh());

        // A second createJournal invocation for the same row (an upsert
        // shape the doc treats as idempotent) must adopt the LIVE entry
        // through the link table — never duplicate.
        $method = new \ReflectionMethod(LandedCostService::class, 'createJournal');
        $method->setAccessible(true);
        $again = $method->invoke(app(LandedCostService::class), $landedCost->fresh());

        $this->assertSame(
            $landedCost->fresh()->posted_journal_entry_code,
            $again,
            'A live entry is amended in place.'
        );
        $this->assertSame(
            1,
            DB::table('journal_entries')->where('entry_type', 'LandedCost')->where('reference', $landedCost->reference_number)->count()
        );
    }

    /** @test */
    public function repost_after_full_reversal_never_resurrects_the_reversed_slot(): void
    {
        $this->seedStock('10', '100');
        [$invoiceId, $detailId] = $this->createPurchaseInvoiceWithReceipt();

        $landedCost = $this->createLandedCost(100, $invoiceId);
        app(LandedCostService::class)->allocate($landedCost);
        app(LandedCostService::class)->post($landedCost->fresh());
        app(LandedCostService::class)->reverse($landedCost->fresh());

        // Re-arm the SAME row (same reference_number) for a fresh posting.
        $landedCost->forceFill(['status' => 'allocated'])->save();
        $entryCode = app(LandedCostService::class)->post($landedCost->fresh())->posted_journal_entry_code;
        $landedCost->refresh();

        $slot = 'LC-'.str_pad((string) $landedCost->id, 8, '0', STR_PAD_LEFT);
        $this->assertNotSame(
            $slot,
            $entryCode,
            'The reversed slot LC-<id> (held by the original and its -REV) is never resurrected.'
        );
        $this->assertNotSame(
            $landedCost->reversal_journal_entry_code,
            $entryCode,
            'The reversed original is never adopted as the amend target.'
        );
        $this->assertStringStartsWith('QID-', $entryCode, 'The occupied-slot escape draws a fresh QID- code.');
        // Three entries share the reference after the round trip: the
        // original, its reversal (createReversal copies entry_type +
        // reference), and the fresh posting.
        $this->assertSame(
            3,
            DB::table('journal_entries')->where('entry_type', 'LandedCost')->where('reference', $landedCost->reference_number)->count(),
            'Reversed original (audit) + its reversal + the fresh entry.'
        );
        $this->assertSame(0, DB::table('journal_reversals')->where('reversal_entry_code', $entryCode)->count());
    }

    // =====================================================================
    // helpers
    // =====================================================================

    protected function seedStock(string $quantity, string $unitCost): void
    {
        app(WeightedAverageCostService::class)->applyInbound(
            $this->productId,
            $this->warehouseId,
            $quantity,
            $unitCost,
            'lcl_setup',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );
    }

    /**
     * Purchase invoice + accepted goods receipt for the fixture product
     * (10 units @ 100 accepted into the fixture warehouse).
     *
     * @return array{0: int, 1: int} [invoiceId, detailId]
     */
    protected function createPurchaseInvoiceWithReceipt(): array
    {
        $invoiceId = DB::table('purchase_invoices')->insertGetId([
            'invoice_number' => 'LCL-PINV-'.uniqid(),
            'supplier_id' => $this->supplierId,
            'currency_id' => $this->currencyId,
            'invoice_date' => now()->toDateString(),
            'warehouse_id' => $this->warehouseId,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'is_posted' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $detailId = DB::table('purchase_invoice_details')->insertGetId([
            'invoice_id' => $invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'unit_id' => $this->unitId,
            'quantity' => 10,
            'unit_price' => 100,
            'discount_amount' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // goods_receipts.order_id is NOT NULL (no FK): a minimal PO keeps the
        // fixture honest and satisfies the column.
        $orderId = DB::table('purchase_orders')->insertGetId([
            'po_number' => 'LCL-PO-'.uniqid(),
            'po_date' => now()->toDateString(),
            'vendor_id' => $this->supplierId,
            'currency_id' => $this->currencyId,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $receiptId = DB::table('goods_receipts')->insertGetId([
            'receipt_number' => 'LCL-GRN-'.uniqid(),
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'warehouse_id' => $this->warehouseId,
            'receipt_date' => now()->toDateString(),
            'received_by' => $this->userId,
            'receipt_type' => 'full',
            'status' => 'approved',
            'quality_status' => 'passed',
            'total_items' => 1,
            'total_quantity' => 10,
            'total_value' => 1000,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('goods_receipt_details')->insertGetId([
            'receipt_id' => $receiptId,
            'invoice_detail_id' => $detailId,
            'product_id' => $this->productId,
            'quantity_received' => 10,
            'unit_id' => $this->unitId,
            'unit_cost' => 100,
            'quality_status' => 'good',
            'is_accepted' => 1,
            'accepted_quantity' => 10,
            'rejected_quantity' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [(int) $invoiceId, (int) $detailId];
    }

    protected function createLandedCost(float $total, ?int $invoiceId = null): \App\Models\Vendor_Purchases\LandedCost
    {
        return \App\Models\Vendor_Purchases\LandedCost::create([
            'reference_number' => 'LCLC-'.uniqid(),
            'company_id' => $this->companyId,
            'purchase_invoice_id' => $invoiceId,
            'allocation_method' => 'value',
            'status' => 'draft',
            'total_amount' => $total,
            'currency_id' => $this->currencyId,
            'exchange_rate' => 1,
            'credit_source_type' => 'ap',
            'credit_account_id' => $this->creditAccountId,
            'created_by' => $this->userId,
        ]);
    }
}
