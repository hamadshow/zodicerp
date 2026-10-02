<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use App\Services\Client_Sales\SalesReturnService;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 12 — SalesReturnService's silent AR-skip is closed (Phase 9 outlook).
 *
 * Posting an approved/completed sales return used to SILENTLY SKIP the
 * credit-note journal when no Accounts Receivable / Revenue account could
 * be resolved — while the stock movements, WAC inbound and derived
 * products.quantity still ran. A company could give stock back with no
 * trace in the books.
 *
 * The GL is now an all-or-nothing contract:
 *   - accounts resolvable → the FULL entry posts (revenue reversal + AR
 *     reduction, plus the COGS reversal when historical cost exists);
 *   - not resolvable → RuntimeException, and the caller's transaction
 *     rolls back the whole return (details, movements, ICTs, quantity).
 */
class SalesReturnJournalContractTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $warehouseId;

    protected int $unitId;

    protected int $productId;

    protected int $customerId;

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
            'company_name' => 'P12 Co',
            'company_code' => 'P12',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'p12_'.$suffix,
            'fullname' => 'Return Journal Tester',
            'email' => 'p12_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'P12-BR-'.$suffix,
            'branch_name' => 'P12 Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->warehouseId = DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'P12-WH-'.$suffix,
            'name' => 'P12 Warehouse',
            'branch_id' => $branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->unitId = DB::table('item_units')->insertGetId([
            'name' => 'P12 Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->currencyId = DB::table('currencies')->insertGetId([
            'code' => 'P12'.substr($suffix, -5),
            'name' => 'P12 Currency',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // GL accounts for the credit-note contract (insertOrIgnore: committed
        // seeds may already exist; resolvers match by AccCode/AccType).
        foreach ([
            ['11401', 'Inventory Asset', 1],
            ['501', 'Cost of Sales', 1],
            ['401', 'Sales Revenue', 1],
            ['1.2.100', 'Accounts Receivable', 1],
        ] as [$code, $name, $type]) {
            DB::table('accounts')->insertOrIgnore([
                'AccCode' => $code,
                'AccName' => $name,
                'AccType' => $type,
                'AccFinal' => 1,
                'company_id' => $this->companyId,
            ]);
        }

        $this->customerId = DB::table('customers')->insertGetId([
            'customer_code' => 'P12-CUST-'.$suffix,
            'name_ar' => 'عميل P12',
            'name_en' => 'P12 Customer '.$suffix,
            'customer_group_id' => $this->ensureTestCustomerGroup(),
            'account_id' => null, // resolver falls back to the 1.2% AR account
            'is_active' => true,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'P12-PRD-'.$suffix,
            'name' => 'P12 Product',
            'slug' => 'p12-product-'.$suffix,
            'sku' => 'P12-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 6,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Opening stock + the ORIGINAL SALE's ledger side (outbound ICT at
        // WAC 6) so the return's COGS-reversal lookup finds a historical
        // sales_invoice_detail cost, exactly like a real posted sale.
        $today = now()->toDateString();
        app(WeightedAverageCostService::class)->applyInbound(
            $this->productId, $this->warehouseId, '20', '6', 'P12-open', 1, $today
        );
        $this->invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => 'P12-INV-'.$suffix,
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'invoice_date' => $today,
            'subtotal' => 48,
            'total_amount' => 48,
            'is_posted' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->detailId = DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $this->invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 4,
            'unit_id' => $this->unitId,
            'unit_price' => 12,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        app(WeightedAverageCostService::class)->applyOutbound(
            $this->productId, $this->warehouseId, '4', 'sales_invoice_detail', $this->detailId, $today
        );

        $this->returnNumber = 'P12-RET-'.$suffix;
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
        return app(SalesReturnService::class)->createSalesReturn([
            'invoice_id' => $this->invoiceId,
            'customer_id' => $this->customerId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'return_number' => $this->returnNumber,
            'status' => $status,
            'items' => $this->returnItems($qty),
        ]);
    }

    private function journalFor(string $returnNumber): ?object
    {
        return DB::table('journal_entries')
            ->where('reference', $returnNumber)
            ->where('entry_type', 'SalesReturn')
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

    /* =====================================================================
     |  The credit-note contract
     ===================================================================== */

    /** @test */
    public function approved_return_posts_the_full_credit_note_journal()
    {
        $this->createReturn('approved', 2); // 2 × 12 = 24 total; COGS reversal 2 × 6 = 12

        $journal = $this->journalFor($this->returnNumber);
        $this->assertNotNull($journal, 'An approved return must post its credit-note journal.');
        $this->assertSame('Post', $journal->status);
        $this->assertEqualsWithDelta(24.0, (float) $journal->total_amount, 0.01);

        $revenueId = $this->accountId('401');
        $arId = $this->accountId('1.2.100');
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($journal->entry_code, $revenueId, 'debit'), 0.01, 'Revenue reversal: Dr Revenue.');
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($journal->entry_code, $arId, 'credit'), 0.01, 'AR reduction: Cr Accounts Receivable.');

        // COGS reversal valued from the HISTORICAL sale ICT (4 sold @ 6 → 2 × 6 = 12).
        $inventoryId = $this->accountId('11401');
        $cogsId = $this->accountId('501');
        $this->assertEqualsWithDelta(12.0, $this->lineTotal($journal->entry_code, $inventoryId, 'debit'), 0.01, 'Inventory restoration: Dr 11401.');
        $this->assertEqualsWithDelta(12.0, $this->lineTotal($journal->entry_code, $cogsId, 'credit'), 0.01, 'COGS reversal: Cr 501.');

        // The entry balances.
        $debits = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('debit');
        $credits = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('credit');
        $this->assertEqualsWithDelta($debits, $credits, 0.01);

        // The stock side still ran: restored movement + derived quantity.
        // (The setUp WAC seeds are LEDGER-only: applyInbound/applyOutbound do
        // not touch products.quantity — that column only tracks deltas applied
        // through movement-engine callers. Baseline here is 0 → +2 = 2.)
        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')
            ->where('reference_id', DB::table('sales_returns')->where('return_number', $this->returnNumber)->value('id'))
            ->first();
        $this->assertNotNull($header);
        $this->assertSame('in', $header->direction);
        $this->assertEqualsWithDelta(2.0, $this->onHandQty(), 0.0001);
    }

    /** @test */
    public function completed_return_posts_the_same_credit_note()
    {
        $this->createReturn('completed', 1); // 1 × 12 = 12; COGS reversal 1 × 6 = 6

        $journal = $this->journalFor($this->returnNumber);
        $this->assertNotNull($journal, 'A completed return posts exactly like an approved one.');
        $this->assertEqualsWithDelta(12.0, (float) $journal->total_amount, 0.01);
        $this->assertEqualsWithDelta(12.0, $this->lineTotal($journal->entry_code, $this->accountId('401'), 'debit'), 0.01);
        $this->assertEqualsWithDelta(6.0, $this->lineTotal($journal->entry_code, $this->accountId('11401'), 'debit'), 0.01);
        $this->assertEqualsWithDelta(1.0, $this->onHandQty(), 0.0001);
    }

    /** @test */
    public function unposted_draft_return_writes_no_journal_and_no_stock()
    {
        $this->createReturn('draft', 1);

        $this->assertNull($this->journalFor($this->returnNumber), 'Draft returns must not post.');
        $returnId = DB::table('sales_returns')->where('return_number', $this->returnNumber)->value('id');
        $this->assertSame(0, DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')
            ->where('reference_id', $returnId)
            ->count());
        $this->assertEqualsWithDelta(0.0, $this->onHandQty(), 0.0001, 'A draft return moves no stock (and the WAC seeds are ledger-only).');
    }

    /** @test */
    public function draft_return_approved_later_posts_exactly_once()
    {
        $return = $this->createReturn('draft', 2);
        $this->assertNull($this->journalFor($this->returnNumber), 'Draft posts nothing.');

        // Approve later via the update path (draft → approved).
        app(SalesReturnService::class)->updateSalesReturn($return->id, [
            'invoice_id' => $this->invoiceId,
            'customer_id' => $this->customerId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'return_number' => $this->returnNumber,
            'status' => 'approved',
            'items' => $this->returnItems(2),
        ]);

        // Exactly one FULL credit-note journal for the return.
        $journals = DB::table('journal_entries')
            ->where('reference', $this->returnNumber)
            ->where('entry_type', 'SalesReturn')
            ->get();
        $this->assertCount(1, $journals);
        $this->assertSame('Post', $journals[0]->status);
        $this->assertEqualsWithDelta(24.0, (float) $journals[0]->total_amount, 0.01);
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($journals[0]->entry_code, $this->accountId('401'), 'debit'), 0.01);
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($journals[0]->entry_code, $this->accountId('1.2.100'), 'credit'), 0.01);
        $this->assertEqualsWithDelta(12.0, $this->lineTotal($journals[0]->entry_code, $this->accountId('11401'), 'debit'), 0.01);

        // The stock side applied exactly once.
        $this->assertSame(1, DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')
            ->where('reference_id', $return->id)
            ->count());
        $detailIds = DB::table('sales_return_details')->where('return_id', $return->id)->pluck('id');
        $this->assertSame(1, DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_return_detail')
            ->whereIn('source_id', $detailIds)
            ->count());
        $this->assertEqualsWithDelta(2.0, $this->onHandQty(), 0.0001);
    }

    /*
     * Phase 13: the former KNOWN ISSUE here — raw-delete retraction breaking
     * on ict_movement_line_fk — is fixed; the retraction battery below pins
     * the engine-routed contract (WAC::reverse + immutable documents).
     */

    /** @test */
    public function posting_without_gl_accounts_fails_loudly_and_persists_nothing()
    {
        // Reproduce the unseeded-GL context INSIDE this test's transaction:
        // remove every resolvable AR + revenue account (rolls back afterwards;
        // committed seed rows are restored when the test transaction ends).
        DB::table('accounts')->where('AccCode', 'like', '4%')->delete();
        DB::table('accounts')->where('AccCode', 'like', '1.2%')->delete();
        DB::table('customers')->where('id', $this->customerId)->update(['account_id' => null]);

        $beforeQty = $this->onHandQty();
        $beforeIcts = DB::table('inventory_cost_transactions')->where('source_type', 'sales_return_detail')->count();

        try {
            $this->createReturn('approved', 2);
            $this->fail('Posting a return without AR/revenue accounts must fail loudly, not skip the journal.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Sales return cannot be posted', $e->getMessage());
        }

        // NOTHING persisted: no journal, no return document, no movement, no ICT, no quantity change.
        $this->assertNull($this->journalFor($this->returnNumber));
        $this->assertSame(0, DB::table('sales_returns')->where('return_number', $this->returnNumber)->count());
        $this->assertSame(0, DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')
            ->where('reference_id', DB::table('sales_returns')->where('return_number', $this->returnNumber)->value('id') ?? 0)
            ->count());
        $this->assertSame($beforeIcts, DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_return_detail')
            ->count(), 'The refused return must not write a sales_return_detail ICT (residue-safe count).');
        $this->assertEqualsWithDelta($beforeQty, $this->onHandQty(), 0.0001, 'The refused return must not touch products.quantity.');
    }

    /* =====================================================================
     |  Phase 13 — engine-routed retraction (approved → draft)
     ===================================================================== */

    private function updatePayload(string $status, int $qty): array
    {
        return [
            'invoice_id' => $this->invoiceId,
            'customer_id' => $this->customerId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'return_number' => $this->returnNumber,
            'status' => $status,
            'items' => $this->returnItems($qty),
        ];
    }

    /** @test */
    public function approved_return_retracted_to_draft_reverses_ledger_quantity_and_journal()
    {
        $return = $this->createReturn('approved', 2);

        $originalTx = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_return_detail')
            ->where('source_id', DB::table('sales_return_details')->where('return_id', $return->id)->value('id'))
            ->first();
        $this->assertNotNull($originalTx, 'Precondition: the approval applied a sales_return_detail ICT.');

        $originalEntryCode = $this->journalFor($this->returnNumber)->entry_code;

        app(SalesReturnService::class)->updateSalesReturn($return->id, $this->updatePayload('draft', 2));

        // Ledger: the original ICT SURVIVES (immutable) and is reversed exactly
        // once by an offsetting ICT written through the WAC engine.
        $this->assertSame(1, (int) DB::table('inventory_cost_transactions')->where('id', $originalTx->id)->count(), 'The original ICT must be preserved.');
        $reversalTx = DB::table('inventory_cost_transactions')
            ->where('reversal_of_id', $originalTx->id)
            ->where('source_type', 'sales_return_detail_reversal')
            ->first();
        $this->assertNotNull($reversalTx, 'The retraction must write an offsetting reversal ICT.');
        $this->assertEqualsWithDelta(-1.0 * (float) $originalTx->quantity_delta, (float) $reversalTx->quantity_delta, 0.0001);
        $this->assertEqualsWithDelta(-1.0 * (float) $originalTx->value_delta, (float) $reversalTx->value_delta, 0.0001);
        $this->assertEqualsWithDelta((float) $originalTx->unit_cost, (float) $reversalTx->unit_cost, 0.0001, 'Reversal posts at the ORIGINAL unit cost.');
        $this->assertSame((int) $originalTx->movement_header_id, (int) $reversalTx->movement_header_id);
        $this->assertSame((int) $originalTx->movement_line_id, (int) $reversalTx->movement_line_id, 'Reversal keeps the original movement-line link (the pre-Phase-13 raw delete broke this FK).');

        // Documents: immutable round trip — original preserved, -REV header added.
        $this->assertSame(1, DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')->where('reference_id', $return->id)->count(), 'Original return movement must be preserved.');
        $reversalHeader = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return_reversal')->where('reference_id', $return->id)->first();
        $this->assertNotNull($reversalHeader, 'Retraction must record a -REV movement document.');
        $this->assertSame('out', $reversalHeader->direction);
        $this->assertSame($this->returnNumber.'-REV', $reversalHeader->voucher_num);
        $this->assertSame(1, DB::table('inventory_movement_lines')->where('stock_movement_id', $reversalHeader->id)->count());

        // Derived quantity rolled back to the ledger-only baseline (0).
        $this->assertEqualsWithDelta(0.0, $this->onHandQty(), 0.0001, 'Retraction must roll back the derived quantity.');

        // Journal: original preserved + offsetting -REV entry via JournalReversalService.
        $this->assertSame(1, (int) DB::table('journal_entries')->where('entry_code', $originalEntryCode)->count(), 'Original credit-note journal must be preserved.');
        $reversalJournal = DB::table('journal_entries')->where('entry_code', $originalEntryCode.'-REV')->first();
        $this->assertNotNull($reversalJournal, 'The retraction must post an offsetting -REV journal.');
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($reversalJournal->entry_code, $this->accountId('1.2.100'), 'debit'), 0.01, 'Reversal: Dr Accounts Receivable.');
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($reversalJournal->entry_code, $this->accountId('401'), 'credit'), 0.01, 'Reversal: Cr Revenue.');

        // Idempotent: a second draft→draft update changes nothing.
        app(SalesReturnService::class)->updateSalesReturn($return->id, $this->updatePayload('draft', 2));
        $this->assertSame(1, (int) DB::table('inventory_cost_transactions')->where('reversal_of_id', $originalTx->id)->count(), 'No duplicate reversal ICTs.');
        $this->assertSame(1, (int) DB::table('inventory_movement_headers')->where('reference_type', 'sales_return_reversal')->where('reference_id', $return->id)->count(), 'No duplicate -REV movement documents.');
    }

    /** @test */
    public function retraction_refuses_when_returned_stock_already_consumed()
    {
        $return = $this->createReturn('approved', 2);

        // Someone consumes downstream until the warehouse ledger balance sits
        // BELOW the returned layer (18 ledger units − 17 = 1 < 2 returned):
        // consuming just the returned 2 would leave 16 and the engine would
        // correctly allow the reversal.
        app(WeightedAverageCostService::class)->applyOutbound(
            $this->productId, $this->warehouseId, '17', 'P13-consume', 1, now()->toDateString()
        );
        DB::table('products')->where('id', $this->productId)->decrement('quantity', 17);

        $beforeTxs = DB::table('inventory_cost_transactions')->count();
        $beforeLines = DB::table('inventory_movement_lines')->count();
        $beforeQty = $this->onHandQty();

        try {
            app(SalesReturnService::class)->updateSalesReturn($return->id, $this->updatePayload('draft', 2));
            $this->fail('Retracting a return whose stock was already consumed must be refused.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Inventory already consumed', $e->getMessage());
        }

        // The WHOLE retraction rolled back: no ledger, document, quantity or
        // journal residue anywhere.
        $this->assertSame($beforeTxs, DB::table('inventory_cost_transactions')->count(), 'No ledger residue.');
        $this->assertSame($beforeLines, DB::table('inventory_movement_lines')->count(), 'No document residue.');
        $this->assertEqualsWithDelta($beforeQty, $this->onHandQty(), 0.0001, 'Quantity untouched.');
        $this->assertNotNull($this->journalFor($this->returnNumber), 'Original journal untouched.');
        $this->assertSame(0, (int) DB::table('journal_entries')
            ->where('reference', $this->returnNumber)->where('entry_code', 'like', '%-REV')->count(), 'No -REV journal residue.');
        $this->assertSame(0, (int) DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return_reversal')->where('reference_id', $return->id)->count(), 'No -REV movement residue.');
    }

    /** @test */
    public function retracted_return_can_be_reapproved()
    {
        $return = $this->createReturn('approved', 2);

        app(SalesReturnService::class)->updateSalesReturn($return->id, $this->updatePayload('draft', 2));
        $this->assertEqualsWithDelta(0.0, $this->onHandQty(), 0.0001);

        // Re-approve: the stock side applies FRESH despite the immutable
        // original documents — the create guard is ICT-based, not document-based.
        app(SalesReturnService::class)->updateSalesReturn($return->id, $this->updatePayload('approved', 2));

        $detailIds = DB::table('sales_return_details')->where('return_id', $return->id)->pluck('id');
        $this->assertSame(1, (int) DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_return_detail')
            ->whereIn('source_id', $detailIds)
            ->whereNull('reversal_of_id')
            ->count(), 'Re-approval writes exactly one fresh ICT.');
        $this->assertEqualsWithDelta(2.0, $this->onHandQty(), 0.0001, 'Derived quantity restored exactly once.');
        // Immutable documents: re-approval records a SECOND application round
        // (the original header survives untouched), so exactly two
        // 'sales_return' headers exist — never three.
        $this->assertSame(2, (int) DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')->where('reference_id', $return->id)->count(), 'Re-approval adds exactly one application-round document.');

        // The credit-note journal lives again. Immutable history: the
        // retracted original survives with a standing -REV (its lines are
        // reversed), and re-approval posts a FRESH entry — the live one is
        // exactly the entry without a standing reversal.
        $entryCodes = DB::table('journal_entries')
            ->where('reference', $this->returnNumber)
            ->where('entry_type', 'SalesReturn')
            ->pluck('entry_code')->all();
        $live = array_values(array_filter($entryCodes, fn (string $code) => !str_ends_with($code, '-REV') && !DB::table('journal_entries')->where('entry_code', $code.'-REV')->exists()));
        $this->assertCount(1, $live, 'Exactly one live (unreversed, non-reversal) credit-note entry after retract + re-approve.');
        $this->assertCount(1, array_filter($entryCodes, fn (string $code) => str_ends_with($code, '-REV')), 'The retraction reversal is preserved exactly once.');
        $this->assertNotEndsWith('-REV', $live[0]);
        $journal = DB::table('journal_entries')->where('entry_code', $live[0])->first();
        $this->assertSame('Post', $journal->status);
        $this->assertEqualsWithDelta(24.0, (float) $journal->total_amount, 0.01);
        $this->assertEqualsWithDelta(24.0, $this->lineTotal($journal->entry_code, $this->accountId('1.2.100'), 'credit'), 0.01);
        $this->assertEqualsWithDelta(12.0, $this->lineTotal($journal->entry_code, $this->accountId('11401'), 'debit'), 0.01);
    }

    private function assertNotEndsWith(string $suffix, string $value): void
    {
        $this->assertTrue(!str_ends_with($value, $suffix), "Failed asserting that '$value' does not end with '$suffix'.");
    }

    /** @test */
    public function return_journal_is_company_stamped()
    {
        $this->createReturn('approved', 2);

        $journal = DB::table('journal_entries')
            ->where('reference', $this->returnNumber)
            ->where('entry_type', 'SalesReturn')
            ->where('entry_code', 'not like', '%-REV')
            ->first();
        $this->assertNotNull($journal);
        $this->assertSame($this->companyId, (int) $journal->company_id, 'The credit-note header must carry the company stamp.');

        $totalLines = DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->count();
        $stampedLines = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journal->entry_code)
            ->where('company_id', $this->companyId)
            ->count();
        $this->assertGreaterThan(0, $totalLines);
        $this->assertSame($totalLines, $stampedLines, 'Every credit-note line must carry the company stamp.');
    }
}
