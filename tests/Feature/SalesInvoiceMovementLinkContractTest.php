<?php

namespace Tests\Feature;

use App\Models\Client_Sales\SalesInvoice;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 15 — sales-invoice ICTs carry their own movement-line provenance,
 * and unposting pairs every outbound ICT with its OWN line.
 *
 * Before this phase the sales-invoice posting step created its WAC outbounds
 * (inside the journal step) WITHOUT movement_header_id / movement_line_id —
 * the only lifecycle in the system with NULL ICT links — so the unpost step
 * had to guess ICT provenance by product + original quantity:
 *
 *   - an invoice with two same-shape lines (same product, same quantity)
 *     reversed the FIRST detail's outbound ICT twice (idempotent no-op on
 *     the second call) and NEVER reversed the second — the ledger stayed
 *     short by one line's quantity/value while the shelf was fully
 *     restored: silent books-vs-shelf divergence;
 *   - a stale reversal round made `first()` permanently skip the live ICT.
 *
 * Now: the movement step creates each line first and links the detail's
 * outbound ICT to it; the reversal step pairs by movement_line_id (with a
 * grouped per-detail fallback for legacy unlinked rows that consumes one
 * un-reversed ICT per line).
 */
class SalesInvoiceMovementLinkContractTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $productId;

    protected int $unitId;

    protected int $currencyId;

    protected int $customerId;

    protected int $treasuryId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'P15 Co',
            'company_code' => 'P15',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'p15_'.$suffix,
            'fullname' => 'Movement Link Tester',
            'email' => 'p15_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'P15-BR-'.$suffix,
            'branch_name' => 'P15 Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'P15-WH-'.$suffix,
            'name' => 'P15 Warehouse',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'P15 Base Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'P15-PRD-'.$suffix,
            'name' => 'P15 Product',
            'slug' => 'p15-product-'.$suffix,
            'sku' => 'P15-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'sale_price' => 25, // price resolver falls back to product sale price
            'cost_per_item' => 10,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->currencyId = DB::table('currencies')->insertGetId([
            'code' => 'P15'.substr($suffix, -5),
            'name' => 'P15 Currency',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->customerId = DB::table('customers')->insertGetId([
            'customer_code' => 'P15-CUS-'.$suffix,
            'name_ar' => 'عميل P15',
            'name_en' => 'P15 Customer',
            'customer_group_id' => $this->ensureTestCustomerGroup(),
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->treasuryId = $this->ensureTestTreasuryAccount();

        foreach ([['11401', 'Inventory Asset', 1], ['401', 'Sales Revenue', 1], ['501', 'Cost of Sales', 1]] as [$code, $name, $type]) {
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
    }

    /* -----------------------------------------------------------------
     | Helpers
     ----------------------------------------------------------------- */

    private function seedStock(string $quantity, string $unitCost): void
    {
        app(\App\Services\Inventory\WeightedAverageCostService::class)->applyInbound(
            $this->productId,
            $this->warehouseId,
            $quantity,
            $unitCost,
            'p15_setup',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        DB::table('products')->where('id', $this->productId)->update(['quantity' => (float) $quantity]);
    }

    /**
     * Store a draft invoice through the real HTTP action; same-shape lines
     * (identical product + quantity) are the whole point of this battery.
     */
    private function storeInvoice(float $qty1, ?float $qty2 = null): int
    {
        $items = [
            ['product_id' => $this->productId, 'quantity' => $qty1, 'unit_id' => $this->unitId],
        ];
        if ($qty2 !== null) {
            $items[] = ['product_id' => $this->productId, 'quantity' => $qty2, 'unit_id' => $this->unitId];
        }

        $this->post(route('admin.client-sales.invoices.store'), [
            'invoice_date' => now()->toDateString(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->treasuryId,
            'warehouse_id' => $this->warehouseId,
            'items' => $items,
        ])->assertRedirect()->assertSessionHas('success');

        return (int) SalesInvoice::query()
            ->where('company_id', $this->companyId)
            ->where('created_by', $this->userId)
            ->orderByDesc('id')
            ->firstOrFail()->id;
    }

    private function postInvoice(int $invoiceId): void
    {
        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    private function destroyInvoice(int $invoiceId): void
    {
        $this->delete(route('admin.client-sales.invoices.destroy', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    private function ledgerQuantity(): float
    {
        return (float) DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->value('quantity');
    }

    private function ledgerValue(): float
    {
        return (float) DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->value('inventory_value');
    }

    private function derivedQuantity(): float
    {
        return (float) DB::table('products')->where('id', $this->productId)->value('quantity');
    }

    /* =====================================================================
     |  The provenance + reversal contract
     ===================================================================== */

    /** @test */
    public function posting_links_every_outbound_ict_to_its_own_movement_line()
    {
        $this->seedStock('20', '6');

        $invoiceId = $this->storeInvoice(2, 2); // two SAME-SHAPE lines
        $this->postInvoice($invoiceId);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoiceId)
            ->first();
        $this->assertNotNull($header);

        $lineIds = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $header->id)
            ->orderBy('id')
            ->pluck('id');
        $detailIds = DB::table('sales_invoice_details')
            ->where('invoice_id', $invoiceId)
            ->orderBy('id')
            ->pluck('id');

        $this->assertCount(2, $lineIds);
        $this->assertCount(2, $detailIds);

        // Each ICT is linked to ITS OWN line — no NULL links, no shared line.
        foreach ($detailIds as $i => $detailId) {
            $ict = DB::table('inventory_cost_transactions')
                ->where('source_type', 'sales_invoice_detail')
                ->where('source_id', $detailId)
                ->first();
            $this->assertNotNull($ict, 'Posting must write an outbound ICT per detail.');
            $this->assertSame((int) $header->id, (int) $ict->movement_header_id, 'The ICT must carry the movement header link.');
            $this->assertSame((int) $lineIds[$i], (int) $ict->movement_line_id, 'The ICT must carry ITS OWN movement-line link.');
        }

        $this->assertEqualsWithDelta(16.0, $this->ledgerQuantity(), 0.0001);
        $this->assertEqualsWithDelta(16.0, $this->derivedQuantity(), 0.0001); // seedStock mirrors the derived cache to 20
    }

    /** @test */
    public function deleting_posted_invoice_reverses_each_line_once_and_restores_the_ledger_exactly()
    {
        // The pre-Phase-15 fuzzy reversal reversed the FIRST detail's ICT
        // twice (idempotent no-op) and left the twin live: the ledger ended
        // at 12 while the shelf showed 20. This test is the discriminator.
        $this->seedStock('20', '6');

        $invoiceId = $this->storeInvoice(2, 2);
        $this->postInvoice($invoiceId);

        $txIds = DB::table('inventory_cost_transactions as tx')
            ->join('sales_invoice_details as d', function ($join) {
                $join->on('tx.source_id', '=', 'd.id')->where('tx.source_type', 'sales_invoice_detail');
            })
            ->where('d.invoice_id', $invoiceId)
            ->orderBy('tx.id')
            ->pluck('tx.id');

        $this->assertCount(2, $txIds);

        $this->destroyInvoice($invoiceId);

        // BOTH outbounds reversed — exactly one reversal per original ICT.
        $reversals = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_reversal')
            ->whereIn('reversal_of_id', $txIds)
            ->get();
        $this->assertCount(2, $reversals, 'Every same-shape line must get its own reversal ICT.');
        $this->assertCount(2, $reversals->pluck('reversal_of_id')->unique(), 'No original ICT may be reversed twice.');

        // Ledger restored EXACTLY (value too — the old bug left value short).
        $this->assertEqualsWithDelta(20.0, $this->ledgerQuantity(), 0.0001, 'Ledger quantity must be fully restored.');
        $this->assertEqualsWithDelta(120.0, $this->ledgerValue(), 0.0001, 'Ledger value must be fully restored (20 × 6).');
        $this->assertEqualsWithDelta(20.0, $this->derivedQuantity(), 0.0001);

        // Audit trail: originals preserved, movement stamped [REVERSED].
        $this->assertSame(2, DB::table('inventory_cost_transactions')
            ->whereIn('id', $txIds)->count(), 'Original outbound ICTs must be preserved.');
        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoiceId)
            ->first();
        $this->assertStringContainsString('[REVERSED', (string) $header->notes);
    }

    /** @test */
    public function legacy_unlinked_lines_still_reverse_via_the_grouped_fallback()
    {
        // Rows posted BEFORE Phase 15 carry NULL ICT links; the grouped
        // per-detail fallback must still reverse each line exactly once.
        $this->seedStock('20', '6');

        $invoiceId = $this->storeInvoice(2, 2);
        $this->postInvoice($invoiceId);

        DB::table('inventory_cost_transactions as tx')
            ->join('sales_invoice_details as d', function ($join) {
                $join->on('tx.source_id', '=', 'd.id')->where('tx.source_type', 'sales_invoice_detail');
            })
            ->where('d.invoice_id', $invoiceId)
            ->update([
                'tx.movement_header_id' => null,
                'tx.movement_line_id' => null,
            ]);

        $txIds = DB::table('inventory_cost_transactions as tx')
            ->join('sales_invoice_details as d', function ($join) {
                $join->on('tx.source_id', '=', 'd.id')->where('tx.source_type', 'sales_invoice_detail');
            })
            ->where('d.invoice_id', $invoiceId)
            ->orderBy('tx.id')
            ->pluck('tx.id');

        $this->destroyInvoice($invoiceId);

        $reversals = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_reversal')
            ->whereIn('reversal_of_id', $txIds)
            ->get();
        $this->assertCount(2, $reversals, 'The grouped fallback must reverse each same-shape line exactly once.');
        $this->assertEqualsWithDelta(20.0, $this->ledgerQuantity(), 0.0001);
        $this->assertEqualsWithDelta(20.0, $this->derivedQuantity(), 0.0001);
    }

    /** @test */
    public function stale_reversal_rounds_never_block_the_live_shipment()
    {
        // The pre-Phase-15 fallback could permanently skip a live ICT once a
        // stale reversal round existed; `first()` (latest, no state filter)
        // kept re-selecting the already-reversed row. Sequential lifecycles
        // must each reverse exactly their own round.
        $this->seedStock('20', '6');

        $firstId = $this->storeInvoice(4);
        $this->postInvoice($firstId);
        $this->destroyInvoice($firstId); // stale round (real, engine-written)

        $secondId = $this->storeInvoice(2);
        $this->postInvoice($secondId);
        $this->destroyInvoice($secondId);

        $this->assertEqualsWithDelta(20.0, $this->ledgerQuantity(), 0.0001, 'Sequential ship/unship rounds must net to the seed.');
        $this->assertEqualsWithDelta(20.0, $this->derivedQuantity(), 0.0001);

        $this->assertSame(2, DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_reversal')
            ->count(), 'Exactly one reversal round per shipment.');
    }

    /* =====================================================================
     |  Phase 16 — the STRUCTURAL posting pipeline
     |  (apply outbounds → create documents → post journal)
     ===================================================================== */

    private function invoke(object $target, string $method, array $args): mixed
    {
        $ref = new \ReflectionMethod($target, $method);
        $ref->setAccessible(true);

        return $ref->invoke($target, ...$args);
    }

    /** @test */
    public function posting_pipeline_refuses_before_any_document_or_ledger_row()
    {
        // Phase 16 makes the refusal-first property structural: phase 1
        // (apply outbounds) runs BEFORE any movement row exists, so a
        // refused outbound leaves NOTHING to clean up.
        $this->seedStock('4', '6');

        $invoiceId = $this->storeInvoice(4); // wants 4, only 4 exist... then consume them
        app(\App\Services\Inventory\WeightedAverageCostService::class)->applyOutbound(
            $this->productId, $this->warehouseId, '4', 'p16-consume', 1, now()->toDateString()
        );
        DB::table('products')->where('id', $this->productId)->decrement('quantity', 4);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $this->assertFalse((bool) $invoice->is_posted, 'Refused posting must roll back the is_posted flag.');
        $this->assertSame(0, DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->count(), 'No movement documents.');
        $this->assertSame(0, DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_detail')->where('product_id', $this->productId)->count(), 'No sales ICT residue.');
        $this->assertSame(0, DB::table('journal_entries')
            ->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count(), 'No journal residue.');
        $this->assertEqualsWithDelta(0.0, $this->derivedQuantity(), 0.0001, 'Derived quantity untouched.');
    }

    /** @test */
    public function apply_phase_is_idempotent_per_detail_at_the_engine_level()
    {
        $this->seedStock('20', '6');

        $invoiceId = $this->storeInvoice(2);
        $invoice = SalesInvoice::findOrFail($invoiceId);

        $first = $this->invoke(new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController, 'applyInvoiceOutbounds', [$invoice]);
        $this->assertCount(1, $first);
        $firstTxId = (int) reset($first)->id;

        // Re-running phase 1 must return the SAME ICT rows — never double-apply.
        $second = $this->invoke(new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController, 'applyInvoiceOutbounds', [$invoice]);
        $this->assertSame($firstTxId, (int) reset($second)->id, 'Phase 1 re-entry must return the existing ICT.');
        $this->assertSame(1, DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_detail')
            ->where('source_id', array_key_first($first))->count());
        $this->assertEqualsWithDelta(18.0, $this->ledgerQuantity(), 0.0001, 'Ledger applied exactly once.');
    }

    /** @test */
    public function documents_phase_links_outbounds_from_map_or_from_ledger()
    {
        $this->seedStock('20', '6');

        // Invoice A: phase 2 runs with the in-memory map from phase 1.
        $aId = $this->storeInvoice(2);
        $a = SalesInvoice::findOrFail($aId);
        $c1 = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController;
        $this->invoke($c1, 'applyInvoiceOutbounds', [$a]);
        $this->invoke($c1, 'createStockMovementsForInvoice', [$a]);

        // Invoice B: phase 2 runs on a FRESH controller (no memory) — the
        // ledger re-read (firstOrFail) must supply the ICT. The journal was
        // posted BEFORE the documents via the legacy chain, and phase 2
        // still links everything.
        $bId = $this->storeInvoice(2);
        $b = SalesInvoice::findOrFail($bId);
        $this->postInvoice($bId); // full route pipeline for B
        $c2 = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController;
        $mapB = $this->invoke($c2, 'applyInvoiceOutbounds', [$b]); // engine idempotent
        $this->invoke(new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController, 'createStockMovementsForInvoice', [$b]);

        foreach ([$aId => $a, $bId => $b] as $invId => $inv) {
            $header = DB::table('inventory_movement_headers')
                ->where('reference_type', 'sales_invoice')->where('reference_id', $invId)->first();
            $this->assertNotNull($header, "Invoice {$invId} must have its movement document.");
            $lineId = (int) DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->value('id');
            $detailId = (int) DB::table('sales_invoice_details')->where('invoice_id', $invId)->value('id');
            $ict = DB::table('inventory_cost_transactions')
                ->where('source_type', 'sales_invoice_detail')->where('source_id', $detailId)->first();
            $this->assertSame($lineId, (int) $ict->movement_line_id, "Invoice {$invId}: the ICT must be linked to its own line.");
        }

        $this->assertCount(1, $mapB);
    }

    /** @test */
    public function journal_alone_legacy_chain_values_cogs_from_applied_outbounds()
    {
        $this->seedStock('20', '6');

        $invoiceId = $this->storeInvoice(3);
        $invoice = SalesInvoice::findOrFail($invoiceId);
        // The legacy chain operates on a POSTED invoice row (like the WAAI
        // fixture) — UnPost journals legitimately carry no COGS lines.
        $invoice->forceFill(['is_posted' => true])->save();

        // Legacy chain: apply outbounds, then post the journal with NO
        // movement documents yet. COGS must still value from the APPLIED
        // ICTs (3 × 6 = 18), never from document arithmetic.
        $c = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController;
        $this->invoke($c, 'applyInvoiceOutbounds', [$invoice]);
        $this->invoke($c, 'postJournalEntryForInvoice', [$invoice]);

        $this->assertSame(0, DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->count(), 'No documents yet in the legacy chain.');

        $journal = DB::table('journal_entries')
            ->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->first();
        $this->assertNotNull($journal);
        $cogsId = (int) DB::table('accounts')->where('AccCode', '501')->value('AccID');
        $this->assertEqualsWithDelta(18.0, (float) DB::table('journal_entry_lines')
            ->where('journal_entry_code', $journal->entry_code)
            ->where('account_id', $cogsId)->sum('debit'), 0.01, 'COGS valued from the applied ICTs.');

        // Documents land later; linking still completes.
        $this->invoke(new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController, 'createStockMovementsForInvoice', [$invoice]);
        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->first();
        $lineId = (int) DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->value('id');
        $detailId = (int) DB::table('sales_invoice_details')->where('invoice_id', $invoiceId)->value('id');
        $this->assertSame($lineId, (int) DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_detail')->where('source_id', $detailId)->value('movement_line_id'));
        $this->assertEqualsWithDelta(17.0, $this->derivedQuantity(), 0.0001);
    }
}
