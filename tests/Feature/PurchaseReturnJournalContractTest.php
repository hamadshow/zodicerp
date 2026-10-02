<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\Vendor_Purchases\PurchaseReturnService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 14 — PurchaseReturnService's silent AP-skip is closed and the stock
 * side is engine-routed (mirrors the Phase 12/13 sales-return work).
 *
 * Before this phase:
 *   - posting an approved/completed purchase return without AP / Inventory
 *     Asset accounts SILENTLY SKIPPED the debit-note journal while stock
 *     still left inventory;
 *   - retracting a posted return (approved → draft) KEPT the returned-to-
 *     vendor stock movement (ledger + derived quantity) — goods were gone
 *     from both the books and the shelf while the return said "not posted";
 *   - a posted→posted amendment re-posted the journal but never retracted
 *     the ledger, double-returning stock on every amendment;
 *   - the AP fallback resolver matched AccType 1 and could land on Input
 *     Tax (2131 is committed exactly that way in the test chart).
 *
 * Now: the GL is all-or-nothing (RuntimeException → whole return rolls
 * back); retraction/amendment run WAC::reverse per ICT with derived-
 * quantity rollback and immutable documents; the journal is company-
 * stamped; a reversed journal slot is never resurrected.
 */
class PurchaseReturnJournalContractTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $warehouseId;

    protected int $unitId;

    protected int $productId;

    protected int $supplierId;

    protected int $invoiceId;

    protected int $detailId;

    protected string $returnNumber;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'P14 Co',
            'company_code' => 'P14',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'p14_'.$suffix,
            'fullname' => 'Purchase Return Tester',
            'email' => 'p14_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'P14-BR-'.$suffix,
            'branch_name' => 'P14 Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->warehouseId = DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'P14-WH-'.$suffix,
            'name' => 'P14 Warehouse',
            'branch_id' => $branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->unitId = DB::table('item_units')->insertGetId([
            'name' => 'P14 Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->currencyId = DB::table('currencies')->insertGetId([
            'code' => 'P14'.substr($suffix, -5),
            'name' => 'P14 Currency',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // GL accounts for the debit-note contract (insertOrIgnore: committed
        // seeds may already exist; resolvers match by AccCode/AccType). The
        // committed test chart carries 2131 Input Tax at AccType 1 — exactly
        // the trap the Phase 14 AP-fallback tightening closes.
        foreach ([
            ['11401', 'Inventory Asset', 1],
            ['2111', 'Accounts Payable', 2],
        ] as [$code, $name, $type]) {
            DB::table('accounts')->insertOrIgnore([
                'AccCode' => $code,
                'AccName' => $name,
                'AccType' => $type,
                'AccFinal' => 1,
                'company_id' => $this->companyId,
            ]);
        }

        $this->supplierId = DB::table('suppliers')->insertGetId([
            'supplier_code' => 'P14-SUP-'.$suffix,
            'name_ar' => 'مورد P14',
            'name_en' => 'P14 Supplier',
            'account_id' => $this->accountId('2111'),
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'P14-PRD-'.$suffix,
            'name' => 'P14 Product',
            'slug' => 'p14-product-'.$suffix,
            'sku' => 'P14-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 20,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Opening stock (LEDGER-only: applyInbound does not touch
        // products.quantity — baseline derived quantity is 0) + the source
        // purchase invoice for return-availability validation.
        $today = now()->toDateString();
        app(WeightedAverageCostService::class)->applyInbound(
            $this->productId, $this->warehouseId, '20', '20', 'P14-open', 1, $today
        );
        $this->invoiceId = DB::table('purchase_invoices')->insertGetId([
            'invoice_number' => 'P14-PINV-'.$suffix,
            'supplier_id' => $this->supplierId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'invoice_date' => $today,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->detailId = DB::table('purchase_invoice_details')->insertGetId([
            'invoice_id' => $this->invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'unit_id' => $this->unitId,
            'quantity' => 10,
            'unit_price' => 20,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->returnNumber = 'P14-RET-'.$suffix;
    }

    /* -----------------------------------------------------------------
     | Helpers
     ----------------------------------------------------------------- */

    private function returnItems(int $qty): array
    {
        return [[
            'invoice_detail_id' => $this->detailId,
            'product_id' => $this->productId,
            'unit_id' => $this->unitId,
            'quantity' => $qty,
            'return_qty' => $qty,
        ]];
    }

    private function createReturn(string $status, int $qty): object
    {
        return app(PurchaseReturnService::class)->createPurchaseReturn([
            'invoice_id' => $this->invoiceId,
            'supplier_id' => $this->supplierId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'return_number' => $this->returnNumber,
            'status' => $status,
            'items' => $this->returnItems($qty),
        ]);
    }

    private function updatePayload(string $status, int $qty): array
    {
        return [
            'invoice_id' => $this->invoiceId,
            'supplier_id' => $this->supplierId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'return_number' => $this->returnNumber,
            'status' => $status,
            'items' => $this->returnItems($qty),
        ];
    }

    private function journalFor(string $returnNumber): ?object
    {
        return DB::table('journal_entries')
            ->where('reference', $returnNumber)
            ->where('entry_type', 'PurchaseReturn')
            ->first();
    }

    private function lineTotal(string $entryCode, int $accountId, string $column): float
    {
        return (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', $accountId)
            ->sum($column);
    }

    private function accountId(string $code): int
    {
        return (int) DB::table('accounts')->where('AccCode', $code)->value('AccID');
    }

    private function onHandQty(): float
    {
        return (float) DB::table('products')->where('id', $this->productId)->value('quantity');
    }

    private function ledgerBalance(): object
    {
        return DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
    }

    /* =====================================================================
     |  The debit-note contract
     ===================================================================== */

    /** @test */
    public function approved_return_posts_the_full_debit_note_journal()
    {
        $return = $this->createReturn('approved', 6); // 6 × 20 = 120, no tax

        $journal = $this->journalFor($this->returnNumber);
        $this->assertNotNull($journal, 'An approved return must post its debit-note journal.');
        $this->assertSame('Post', $journal->status);
        $this->assertEqualsWithDelta(120.0, (float) $journal->total_amount, 0.01);
        $this->assertSame($this->companyId, (int) $journal->company_id, 'The debit-note header must carry the company stamp.');

        $apId = $this->accountId('2111');
        $inventoryId = $this->accountId('11401');
        $this->assertEqualsWithDelta(120.0, $this->lineTotal($journal->entry_code, $apId, 'debit'), 0.01, 'AP reduction: Dr Accounts Payable.');
        $this->assertEqualsWithDelta(120.0, $this->lineTotal($journal->entry_code, $inventoryId, 'credit'), 0.01, 'Inventory leaves: Cr 11401.');

        // Every line stamped.
        $totalLines = DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->count();
        $stampedLines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journal->entry_code)
            ->where('company_id', $this->companyId)
            ->count();
        $this->assertGreaterThan(0, $totalLines);
        $this->assertSame($totalLines, $stampedLines, 'Every debit-note line must carry the company stamp.');

        // The entry balances.
        $debits = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('debit');
        $credits = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('credit');
        $this->assertEqualsWithDelta($debits, $credits, 0.01);

        // Stock side: movement out + ICT at the current WAC + derived quantity.
        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'purchase_return')
            ->where('reference_id', $return->id)
            ->first();
        $this->assertNotNull($header);
        $this->assertSame('out', $header->direction);
        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'purchase_return_detail')
            ->where('source_id', DB::table('purchase_return_details')->where('return_id', $return->id)->value('id'))
            ->first();
        $this->assertNotNull($ict);
        $this->assertEqualsWithDelta(-6.0, (float) $ict->quantity_delta, 0.0001);
        $this->assertEqualsWithDelta(20.0, (float) $ict->unit_cost, 0.0001, 'Outbound costs at the current WAC.');
        $this->assertEqualsWithDelta(14.0, (float) $this->ledgerBalance()->quantity, 0.0001);
        // The WAC seeds are ledger-only: baseline derived quantity is 0 → −6.
        $this->assertEqualsWithDelta(-6.0, $this->onHandQty(), 0.0001);
    }

    /** @test */
    public function completed_return_posts_the_same_debit_note()
    {
        $this->createReturn('completed', 2); // 2 × 20 = 40

        $journal = $this->journalFor($this->returnNumber);
        $this->assertNotNull($journal, 'A completed return posts exactly like an approved one.');
        $this->assertEqualsWithDelta(40.0, (float) $journal->total_amount, 0.01);
        $this->assertEqualsWithDelta(40.0, $this->lineTotal($journal->entry_code, $this->accountId('2111'), 'debit'), 0.01);
        $this->assertEqualsWithDelta(40.0, $this->lineTotal($journal->entry_code, $this->accountId('11401'), 'credit'), 0.01);
        $this->assertEqualsWithDelta(-2.0, $this->onHandQty(), 0.0001);
    }

    /** @test */
    public function unposted_draft_return_writes_no_journal_and_no_stock()
    {
        $this->createReturn('draft', 1);

        $this->assertNull($this->journalFor($this->returnNumber), 'Draft returns must not post.');
        $returnId = DB::table('purchase_returns')->where('return_number', $this->returnNumber)->value('id');
        $this->assertSame(0, DB::table('inventory_movement_headers')
            ->where('reference_type', 'purchase_return')
            ->where('reference_id', $returnId)
            ->count());
        $this->assertEqualsWithDelta(0.0, $this->onHandQty(), 0.0001, 'A draft return moves no stock.');
    }

    /** @test */
    public function posting_without_gl_accounts_fails_loudly_and_persists_nothing()
    {
        // Reproduce the unseeded-GL context INSIDE this test's transaction
        // (rolls back afterwards; committed seed rows are restored).
        DB::table('accounts')->where('AccCode', '11401')->delete();
        DB::table('accounts')->where('AccCode', '2111')->delete();
        DB::table('suppliers')->where('id', $this->supplierId)->update(['account_id' => null]);

        $beforeQty = $this->onHandQty();
        $beforeIcts = DB::table('inventory_cost_transactions')->where('source_type', 'purchase_return_detail')->count();

        try {
            $this->createReturn('approved', 2);
            $this->fail('Posting a return without AP/inventory accounts must fail loudly, not skip the journal.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Purchase return cannot be posted', $e->getMessage());
        }

        // NOTHING persisted: no journal, no return document, no movement, no ICT, no quantity change.
        $this->assertNull($this->journalFor($this->returnNumber));
        $this->assertSame(0, DB::table('purchase_returns')->where('return_number', $this->returnNumber)->count());
        $this->assertSame($beforeIcts, DB::table('inventory_cost_transactions')
            ->where('source_type', 'purchase_return_detail')
            ->count(), 'The refused return must not write a purchase_return_detail ICT (residue-safe count).');
        $this->assertEqualsWithDelta($beforeQty, $this->onHandQty(), 0.0001, 'The refused return must not touch products.quantity.');
    }

    /* =====================================================================
     |  Phase 14 — engine-routed retraction (approved → draft)
     ===================================================================== */

    /** @test */
    public function approved_return_retracted_to_draft_reverses_ledger_quantity_and_journal()
    {
        $return = $this->createReturn('approved', 6);

        $originalTx = DB::table('inventory_cost_transactions')
            ->where('source_type', 'purchase_return_detail')
            ->where('source_id', DB::table('purchase_return_details')->where('return_id', $return->id)->value('id'))
            ->first();
        $this->assertNotNull($originalTx, 'Precondition: the approval applied a purchase_return_detail ICT.');

        $originalEntryCode = $this->journalFor($this->returnNumber)->entry_code;

        app(PurchaseReturnService::class)->updatePurchaseReturn($return->id, $this->updatePayload('draft', 6));

        // Ledger: the original ICT SURVIVES (immutable) and is reversed exactly
        // once by an offsetting INBOUND ICT written through the WAC engine.
        $this->assertSame(1, (int) DB::table('inventory_cost_transactions')->where('id', $originalTx->id)->count(), 'The original ICT must be preserved.');
        $reversalTx = DB::table('inventory_cost_transactions')
            ->where('reversal_of_id', $originalTx->id)
            ->where('source_type', 'purchase_return_detail_reversal')
            ->first();
        $this->assertNotNull($reversalTx, 'The retraction must write an offsetting reversal ICT.');
        $this->assertEqualsWithDelta(-1.0 * (float) $originalTx->quantity_delta, (float) $reversalTx->quantity_delta, 0.0001);
        $this->assertEqualsWithDelta(-1.0 * (float) $originalTx->value_delta, (float) $reversalTx->value_delta, 0.0001);
        $this->assertEqualsWithDelta((float) $originalTx->unit_cost, (float) $reversalTx->unit_cost, 0.0001, 'Reversal posts at the ORIGINAL unit cost.');
        $this->assertSame((int) $originalTx->movement_header_id, (int) $reversalTx->movement_header_id);
        $this->assertSame((int) $originalTx->movement_line_id, (int) $reversalTx->movement_line_id, 'Reversal keeps the original movement-line link.');

        // Documents: immutable round trip — original preserved, -REV header added.
        $this->assertSame(1, DB::table('inventory_movement_headers')
            ->where('reference_type', 'purchase_return')->where('reference_id', $return->id)->count(), 'Original return movement must be preserved.');
        $reversalHeader = DB::table('inventory_movement_headers')
            ->where('reference_type', 'purchase_return_reversal')->where('reference_id', $return->id)->first();
        $this->assertNotNull($reversalHeader, 'Retraction must record a -REV movement document.');
        $this->assertSame('in', $reversalHeader->direction);
        $this->assertSame($this->returnNumber.'-REV', $reversalHeader->voucher_num);
        $this->assertSame(1, DB::table('inventory_movement_lines')->where('stock_movement_id', $reversalHeader->id)->count());

        // Derived quantity rolled back to the ledger-only baseline (0).
        $this->assertEqualsWithDelta(0.0, $this->onHandQty(), 0.0001, 'Retraction must roll back the derived quantity.');

        // Journal: original preserved + offsetting -REV entry (swapped sides:
        // the reversal Dr 11401 back and Cr AP back).
        $this->assertSame(1, (int) DB::table('journal_entries')->where('entry_code', $originalEntryCode)->count(), 'Original debit-note journal must be preserved.');
        $reversalJournal = DB::table('journal_entries')->where('entry_code', $originalEntryCode.'-REV')->first();
        $this->assertNotNull($reversalJournal, 'The retraction must post an offsetting -REV journal.');
        $this->assertEqualsWithDelta(120.0, $this->lineTotal($reversalJournal->entry_code, $this->accountId('11401'), 'debit'), 0.01, 'Reversal: Dr Inventory Asset.');
        $this->assertEqualsWithDelta(120.0, $this->lineTotal($reversalJournal->entry_code, $this->accountId('2111'), 'credit'), 0.01, 'Reversal: Cr Accounts Payable.');

        // Idempotent: a second draft→draft update changes nothing.
        app(PurchaseReturnService::class)->updatePurchaseReturn($return->id, $this->updatePayload('draft', 6));
        $this->assertSame(1, (int) DB::table('inventory_cost_transactions')->where('reversal_of_id', $originalTx->id)->count(), 'No duplicate reversal ICTs.');
        $this->assertSame(1, (int) DB::table('inventory_movement_headers')->where('reference_type', 'purchase_return_reversal')->where('reference_id', $return->id)->count(), 'No duplicate -REV movement documents.');
    }

    /** @test */
    public function approving_a_return_without_stock_fails_loudly_and_persists_nothing()
    {
        // The consumption guard for outbound originals lives at APPLY time
        // (the WAC engine refuses an outbound that would overdraw the
        // warehouse): drain the whole ledger, then approving the return must
        // be refused loudly with zero residue.
        $return = $this->createReturn('draft', 6);

        app(WeightedAverageCostService::class)->applyOutbound(
            $this->productId, $this->warehouseId, '20', 'P14-consume', 1, now()->toDateString()
        );
        DB::table('products')->where('id', $this->productId)->decrement('quantity', 20);

        $beforeQty = $this->onHandQty();
        $beforeIcts = DB::table('inventory_cost_transactions')
            ->where('source_type', 'purchase_return_detail')->count();
        $beforeLines = DB::table('inventory_movement_lines')->count();

        try {
            app(PurchaseReturnService::class)->updatePurchaseReturn($return->id, $this->updatePayload('approved', 6));
            $this->fail('Approving a return whose stock is gone must be refused.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Insufficient weighted-average inventory', $e->getMessage());
        }

        $this->assertSame($beforeIcts, DB::table('inventory_cost_transactions')
            ->where('source_type', 'purchase_return_detail')->count(), 'No purchase_return_detail ICT residue.');
        $this->assertSame($beforeLines, DB::table('inventory_movement_lines')->count(), 'No document residue.');
        $this->assertEqualsWithDelta($beforeQty, $this->onHandQty(), 0.0001, 'Quantity untouched.');
        $this->assertNull($this->journalFor($this->returnNumber), 'No journal residue.');
    }

    /** @test */
    public function retracted_return_can_be_reapproved()
    {
        $return = $this->createReturn('approved', 6);
        $this->assertEqualsWithDelta(-6.0, $this->onHandQty(), 0.0001);

        app(PurchaseReturnService::class)->updatePurchaseReturn($return->id, $this->updatePayload('draft', 6));
        $this->assertEqualsWithDelta(0.0, $this->onHandQty(), 0.0001);

        // Re-approve: the stock side applies FRESH despite the immutable
        // original documents — the create guard is ICT-based, not
        // detail-id-based (details are soft-deleted and recreated).
        app(PurchaseReturnService::class)->updatePurchaseReturn($return->id, $this->updatePayload('approved', 6));

        $detailIds = DB::table('purchase_return_details')->where('return_id', $return->id)->pluck('id');
        // "Un-reversed" = no reversal ICT points back at it (the original
        // itself keeps reversal_of_id NULL — the REVERSAL carries the link).
        $this->assertSame(1, (int) DB::table('inventory_cost_transactions as tx')
            ->where('tx.source_type', 'purchase_return_detail')
            ->whereIn('tx.source_id', $detailIds)
            ->whereNull('tx.reversal_of_id')
            ->whereNotExists(function ($q) {
                $q->selectRaw(1)
                    ->from('inventory_cost_transactions as rev')
                    ->whereColumn('rev.reversal_of_id', 'tx.id')
                    ->where('rev.source_type', 'purchase_return_detail_reversal');
            })
            ->count(), 'Re-approval writes exactly one fresh ICT.');
        $this->assertEqualsWithDelta(-6.0, $this->onHandQty(), 0.0001, 'Derived quantity applied exactly once.');
        $this->assertEqualsWithDelta(14.0, (float) $this->ledgerBalance()->quantity, 0.0001, 'Ledger back to the post-return state.');

        // Immutable documents: re-approval records a SECOND application round
        // (the original header survives untouched), so exactly two
        // 'purchase_return' headers exist — never three.
        $this->assertSame(2, (int) DB::table('inventory_movement_headers')
            ->where('reference_type', 'purchase_return')->where('reference_id', $return->id)->count(), 'Re-approval adds exactly one application-round document.');

        // The debit-note journal lives again. Immutable history: the
        // retracted original survives with a standing -REV (its lines are
        // reversed), and re-approval posts a FRESH entry — the live one is
        // exactly the entry without a standing reversal.
        $entryCodes = DB::table('journal_entries')
            ->where('reference', $this->returnNumber)
            ->where('entry_type', 'PurchaseReturn')
            ->pluck('entry_code')->all();
        $live = array_values(array_filter($entryCodes, fn (string $code) => !str_ends_with($code, '-REV') && !DB::table('journal_entries')->where('entry_code', $code.'-REV')->exists()));
        $this->assertCount(1, $live, 'Exactly one live (unreversed, non-reversal) debit-note entry after retract + re-approve.');
        $this->assertCount(1, array_filter($entryCodes, fn (string $code) => str_ends_with($code, '-REV')), 'The retraction reversal is preserved exactly once.');
        $journal = DB::table('journal_entries')->where('entry_code', $live[0])->first();
        $this->assertSame('Post', $journal->status);
        $this->assertEqualsWithDelta(120.0, (float) $journal->total_amount, 0.01);
        $this->assertEqualsWithDelta(120.0, $this->lineTotal($journal->entry_code, $this->accountId('2111'), 'debit'), 0.01);
        $this->assertEqualsWithDelta(120.0, $this->lineTotal($journal->entry_code, $this->accountId('11401'), 'credit'), 0.01);
    }

    /** @test */
    public function ap_fallback_resolves_a_liability_account_not_an_expense()
    {
        // Phase 14 tightened the fallback from AccType 1 (which matches the
        // committed 2131 Input Tax row) to AccType 2 (liability). Pin it via
        // reflection on the no-supplier-account path.
        $service = app(PurchaseReturnService::class);
        $method = new \ReflectionMethod($service, 'resolveAccountsPayableAccountId');
        $method->setAccessible(true);

        $resolvedId = (int) $method->invoke($service, null);
        $this->assertGreaterThan(0, $resolvedId, 'The AP fallback must resolve without a supplier account.');
        $this->assertSame(2, (int) DB::table('accounts')->where('AccID', $resolvedId)->value('AccType'), 'The AP fallback must land on an AccType-2 (liability) account.');
    }
}
