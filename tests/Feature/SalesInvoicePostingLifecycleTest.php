<?php

namespace Tests\Feature;

use App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController;
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
 * Phase 8 — Sales Invoice posting lifecycle hardening.
 *
 * Pins the posting contract end to end through the real HTTP actions:
 *
 *   - store() stamps the active company (multi-company boundary) and seeds a
 *     draft invoice; posting happens through the explicit post action.
 *   - post() is idempotent (double POST must not duplicate journals,
 *     movements or WAC outbounds) and rolls back completely on failure
 *     (insufficient stock persists nothing).
 *   - Cross-company post/delete attempts are invisible (404) and touch nothing.
 *   - Deleting a POSTED invoice keeps the audit trail: original journal
 *     preserved, reversal journal appended, movements stamped [REVERSED],
 *     stock restored through the WAC engine (never ledger destruction).
 *   - Deleting a DRAFT invoice removes its UnPost journal along with it.
 *
 * Posting order (load-bearing, documented §9.1 of the source-of-truth doc):
 * the journal step applies the WAC outbounds (creating the sales ICTs), then
 * the movement step reads the ICT unit costs back. Sales ICT rows carry NO
 * movement_header_id — provenance is the shared sales_invoice_detail source.
 */
class SalesInvoicePostingLifecycleTest extends TestCase
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

    protected int $customerId;

    protected int $customerGroupId;

    protected int $treasuryId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        // Fixture convention (Phase 4+): companies first — they own every FK below.
        foreach ([$this->companyId, $this->otherCompanyId] as $cid) {
            DB::table('company')->insertOrIgnore([
                'id' => $cid,
                'company_name' => 'Posting Lifecycle Co '.$cid,
                'company_code' => 'SIPLC'.$cid,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'sipl_'.$suffix,
            'fullname' => 'Posting Lifecycle Tester',
            'email' => 'sipl_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        // Default guard (NOT sanctum): CompanyContext resolves from the default-guard user.
        $this->actingAs(User::find($this->userId));

        $this->otherUserId = DB::table('users')->insertGetId([
            'username' => 'siplx_'.$suffix,
            'fullname' => 'Posting Lifecycle Tester Other Co',
            'email' => 'siplx_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->otherCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'SIPL-BR-'.$suffix,
            'branch_name' => 'SIPL Branch '.$suffix,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'SIPL-WH-'.$suffix,
            'name' => 'SIPL Warehouse '.$suffix,
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'SIPL Base Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'SIPL-PRD-'.$suffix,
            'name' => 'SIPL Product '.$suffix,
            'slug' => 'sipl-product-'.$suffix,
            'sku' => 'SIPL-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId, // conversion + resolver refuse unitless products
            'sale_price' => 25, // price resolver falls back to product sale price
            'cost_per_item' => 10,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->currencyId = DB::table('currencies')->insertGetId([
            'code' => 'SPL',
            'name' => 'Posting Lifecycle Currency',
            'symbol' => 'P',
            'decimal_places' => 2,
            'format' => 'L',
            'is_base' => 0,
            'status' => 'active',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->customerGroupId = $this->ensureTestCustomerGroup();

        $this->customerId = DB::table('customers')->insertGetId([
            'customer_code' => 'SIPL-CUS-'.$suffix,
            'name_ar' => 'عميل SIPL',
            'name_en' => 'SIPL Customer',
            'customer_group_id' => $this->customerGroupId,
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->treasuryId = $this->ensureTestTreasuryAccount();

        // GL accounts the posting path resolves (resolvers require AccStopped=0).
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

    // =====================================================================
    // store + post happy path
    // =====================================================================

    public function test_store_stamps_company_and_post_creates_journal_movement_and_deduction(): void
    {
        $this->seedStock('10', '6');

        $this->post(route('admin.client-sales.invoices.store'), [
            'invoice_date' => now()->toDateString(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => $this->treasuryId,
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'quantity' => 4, 'unit_id' => $this->unitId],
            ],
        ])->assertRedirect()->assertSessionHas('success');

        $invoice = SalesInvoice::query()
            ->where('company_id', $this->companyId)
            ->where('created_by', $this->userId)
            ->orderByDesc('id')
            ->firstOrFail();

        $this->assertSame($this->companyId, (int) $invoice->company_id, 'store() must stamp the invoice with the active company.');
        $this->assertSame($this->warehouseId, (int) $invoice->warehouse_id);
        $this->assertFalse((bool) $invoice->is_posted, 'store() must create a draft — posting is an explicit action.');

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoice->id]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $invoice->refresh();
        $this->assertTrue((bool) $invoice->is_posted);
        $this->assertNotNull($invoice->posted_at);
        $this->assertSame($this->userId, (int) $invoice->posted_by);

        $journal = DB::table('journal_entries')
            ->where('entry_type', 'SalesInvoice')
            ->where('reference', $invoice->invoice_number)
            ->first();
        $this->assertNotNull($journal, 'Posting must create the SalesInvoice journal.');
        $this->assertSame('Post', $journal->status);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoice->id)
            ->first();
        $this->assertNotNull($header, 'Posting must create the sale movement.');
        $this->assertSame('sale', $header->type);
        $this->assertSame('out', $header->direction);
        $this->assertSame($this->companyId, (int) $header->company_id);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(4.0, (float) $line->quantity);

        // Provenance (§9.1): the sales ICT points at the invoice detail, not the movement.
        $detailId = DB::table('sales_invoice_details')->where('invoice_id', $invoice->id)->where('product_id', $this->productId)->value('id');
        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_detail')
            ->where('source_id', $detailId)
            ->first();
        $this->assertNotNull($ict, 'Posting must write the sales outbound ICT.');
        $this->assertSame(-4.0, (float) $ict->quantity_delta);
        $this->assertSame(6.0, (float) $ict->unit_cost, 'COGS must use the seeded WAC cost.');

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(6.0, (float) $balance->quantity);
        $this->assertSame(6.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    // =====================================================================
    // post() idempotency
    // =====================================================================

    public function test_post_is_idempotent_when_invoice_already_posted(): void
    {
        $this->seedStock('10', '6');
        $invoiceId = $this->createInvoice(4);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))->assertRedirect()->assertSessionHas('success');

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $journalsBefore = DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count();
        $movementLinesBefore = DB::table('inventory_movement_lines')
            ->whereIn('stock_movement_id', DB::table('inventory_movement_headers')->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->pluck('id'))
            ->count();
        $productQtyBefore = (float) DB::table('products')->where('id', $this->productId)->value('quantity');

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))->assertRedirect()->assertSessionHas('success');

        $this->assertSame($journalsBefore, DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count(), 'Double post must not duplicate the journal.');
        $this->assertSame($movementLinesBefore, DB::table('inventory_movement_lines')
            ->whereIn('stock_movement_id', DB::table('inventory_movement_headers')->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->pluck('id'))
            ->count(), 'Double post must not duplicate movements.');
        $this->assertSame($productQtyBefore, (float) DB::table('products')->where('id', $this->productId)->value('quantity'), 'Double post must not re-deduct derived quantity.');
    }

    // =====================================================================
    // posting without stock fails and persists nothing
    // =====================================================================

    public function test_posting_without_stock_fails_and_persists_nothing(): void
    {
        $invoiceId = $this->createInvoice(4); // no seeded stock

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $this->assertFalse((bool) $invoice->is_posted, 'Failed posting must roll back the is_posted flag.');
        $this->assertNull($invoice->posted_at);
        $this->assertSame(0, DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count(), 'Failed posting must not leave a journal.');
        $this->assertSame(0, DB::table('inventory_movement_headers')->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->count(), 'Failed posting must not leave movements.');
        $this->assertSame(0, DB::table('inventory_cost_transactions')->where('source_type', 'sales_invoice_detail')->where('product_id', $this->productId)->count(), 'Failed posting must not leave WAC outbounds.');
        $this->assertSame(0.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    // =====================================================================
    // multi-company boundary
    // =====================================================================

    public function test_cross_company_post_and_delete_are_invisible(): void
    {
        $this->seedStock('10', '6');
        $invoiceId = $this->createInvoice(4);

        $this->actingAs(User::find($this->otherUserId));

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))->assertNotFound();
        $this->delete(route('admin.client-sales.invoices.destroy', ['invoice' => $invoiceId]))->assertNotFound();

        $this->actingAs(User::find($this->userId));

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $this->assertFalse((bool) $invoice->is_posted, 'Cross-company post attempt must not post.');
        $this->assertNotNull(SalesInvoice::find($invoiceId), 'Cross-company delete attempt must not delete.');
        $this->assertSame(0, DB::table('inventory_cost_transactions')->where('source_type', 'sales_invoice_detail')->where('product_id', $this->productId)->count());
    }

    // =====================================================================
    // destroying a POSTED invoice keeps the audit trail
    // =====================================================================

    public function test_deleting_posted_invoice_reverses_journal_and_stock_without_destroying_the_ledger(): void
    {
        $this->seedStock('20', '6');
        $invoiceId = $this->createInvoice(4);
        $invoice = SalesInvoice::findOrFail($invoiceId);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))->assertRedirect()->assertSessionHas('success');

        $this->assertSame(16.0, (float) DB::table('inventory_cost_balances')->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseId)->value('quantity'));

        $this->delete(route('admin.client-sales.invoices.destroy', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');

        // Original journal preserved, reversal appended (idempotent -REV code).
        $original = DB::table('journal_entries')
            ->where('entry_type', 'SalesInvoice')
            ->where('reference', $invoice->invoice_number)
            ->first();
        $this->assertNotNull($original, 'Original journal must be preserved for audit.');
        $this->assertSame(1, DB::table('journal_entries')->where('entry_code', $original->entry_code.'-REV')->count(), 'Reversal journal must be appended.');

        // Movement rows kept with the [REVERSED] stamp — not deleted.
        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoiceId)
            ->first();
        $this->assertNotNull($header, 'Movement rows are kept for audit, not deleted.');
        $this->assertStringContainsString('[REVERSED', (string) $header->notes);

        // Original outbound ICT preserved; engine wrote a reversal ICT.
        $detailId = DB::table('sales_invoice_details')->where('invoice_id', $invoiceId)->where('product_id', $this->productId)->value('id');
        $this->assertNotNull(DB::table('inventory_cost_transactions')->where('source_type', 'sales_invoice_detail')->where('source_id', $detailId)->first(), 'Original outbound ICT must be preserved.');
        $this->assertSame(1, DB::table('inventory_cost_transactions')->where('source_type', 'sales_invoice_reversal')->count(), 'Reversal must flow through the WAC engine.');

        // Stock restored through the engine (20 − 4 + 4).
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(20.0, (float) $balance->quantity);
        $this->assertSame(120.0, (float) $balance->inventory_value);
        $this->assertSame(20.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // SoftDeletes: the invoice row is soft-deleted, not force-deleted.
        $this->assertNull(SalesInvoice::find($invoiceId), 'The invoice must no longer be findable.');
        $this->assertNotNull(SalesInvoice::withTrashed()->find($invoiceId)?->deleted_at, 'The invoice row is soft-deleted.');
    }

    // =====================================================================
    // Phase 18 — the delete reversal is a link-table edge, not a suffix probe
    // =====================================================================

    public function test_deleting_posted_invoice_records_the_reversal_in_the_link_table(): void
    {
        $this->seedStock('20', '6');
        $invoiceId = $this->createInvoice(4);
        $invoice = SalesInvoice::findOrFail($invoiceId);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $originalCode = DB::table('journal_entries')
            ->where('entry_type', 'SalesInvoice')
            ->where('reference', $invoice->invoice_number)
            ->value('entry_code');

        $this->delete(route('admin.client-sales.invoices.destroy', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');

        // Phase 18: the delete's reversal is recorded as a journal_reversals
        // edge — every GL lifecycle now answers 'is this entry reversed?'
        // through the link table, never by probing for a '-REV' suffix.
        $edge = DB::table('journal_reversals')->where('original_entry_code', $originalCode)->first();
        $this->assertNotNull($edge, 'The posted-delete reversal must be recorded as a link-table edge.');
        $this->assertSame($originalCode.'-REV', $edge->reversal_entry_code);
        $this->assertSame($this->companyId, (int) $edge->company_id, 'The edge is company-stamped.');
    }

    // =====================================================================
    // destroying a DRAFT invoice removes its UnPost journal
    // =====================================================================

    public function test_deleting_unposted_invoice_removes_its_unpost_journal_and_rows(): void
    {
        $invoiceId = $this->createInvoice(4);
        $invoice = SalesInvoice::findOrFail($invoiceId);

        // Give the draft its UnPost journal via the shared journal helper.
        $this->postSalesInvoiceJournal($invoice);
        $this->assertSame(1, DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count());

        $this->delete(route('admin.client-sales.invoices.destroy', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');

        // SoftDeletes: the invoice row is soft-deleted, not force-deleted.
        $this->assertNull(SalesInvoice::find($invoiceId), 'The invoice must no longer be findable.');
        $this->assertNotNull(SalesInvoice::withTrashed()->find($invoiceId)?->deleted_at, 'The invoice row is soft-deleted.');
        $this->assertSame(0, DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count(), 'Unposted journal must be deleted with its draft.');
    }

    // =====================================================================
    // movement step idempotency (guards the update() posted path)
    // =====================================================================

    public function test_movement_creation_is_idempotent_per_invoice(): void
    {
        $this->seedStock('10', '6');
        $invoiceId = $this->createInvoice(4);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))->assertRedirect()->assertSessionHas('success');

        $headersBefore = DB::table('inventory_movement_headers')->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->count();
        $this->assertSame(1, $headersBefore);

        // Re-running the movement step (as update() of a posted invoice would) must no-op.
        $this->invoke(new SalesInvoiceController, 'createStockMovementsForInvoice', [SalesInvoice::findOrFail($invoiceId)]);

        $this->assertSame($headersBefore, DB::table('inventory_movement_headers')->where('reference_type', 'sales_invoice')->where('reference_id', $invoiceId)->count());
    }

    // =====================================================================
    // treasury/GL coupling (Phase 9)
    // =====================================================================

    public function test_posting_stamps_sales_journal_with_company_id(): void
    {
        $this->seedStock('10', '6');
        $invoiceId = $this->createInvoice(4);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $journal = DB::table('journal_entries')
            ->where('entry_type', 'SalesInvoice')
            ->where('reference', $invoice->invoice_number)
            ->first();
        $this->assertNotNull($journal);
        $this->assertSame($this->companyId, (int) $journal->company_id, 'Sales journal must be company-stamped.');
        $this->assertSame(
            $this->companyId,
            (int) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->first()->company_id,
            'Sales journal lines must be company-stamped.'
        );
    }

    public function test_posting_rejects_foreign_treasury(): void
    {
        $this->seedStock('10', '6');
        $foreignTreasuryId = DB::table('accounts')->insertGetId([
            'AccCode' => 'LCF-'.substr(uniqid(), -8),
            'AccName' => 'Foreign Treasury',
            'AccType' => 1,
            'AccFinal' => 1,
            'Nature' => 'bank',
            'company_id' => $this->otherCompanyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $invoiceId = $this->createInvoice(4, $foreignTreasuryId);

        $this->post(route('admin.client-sales.invoices.post', ['invoice' => $invoiceId]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $this->assertFalse((bool) $invoice->is_posted, 'Foreign-treasury posting must roll back completely.');
        $this->assertSame(0, DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', $invoice->invoice_number)->count());
        $this->assertSame(0, DB::table('inventory_cost_transactions')->where('source_type', 'sales_invoice_detail')->where('product_id', $this->productId)->count());
    }

    // =====================================================================
    // helpers
    // =====================================================================

    /**
     * Seed on-hand WAC inventory through the real engine, then mirror the
     * derived products.quantity the perpetual flows normally maintain.
     */
    protected function seedStock(string $quantity, string $unitCost): void
    {
        app(\App\Services\Inventory\WeightedAverageCostService::class)->applyInbound(
            $this->productId,
            $this->warehouseId,
            $quantity,
            $unitCost,
            'sipl_setup',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        DB::table('products')->where('id', $this->productId)->update(['quantity' => (float) $quantity]);
    }

    protected function createInvoice(float $quantity = 4.0, ?int $treasuryId = null): int
    {
        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => 'SIPL-INV-'.uniqid(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'treasury_id' => $treasuryId ?? $this->treasuryId,
            'invoice_date' => now()->toDateString(),
            'subtotal' => $quantity * 25,
            'total_amount' => $quantity * 25,
            'is_posted' => 0,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => $quantity,
            'unit_id' => $this->unitId,
            'unit_price' => 25,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return (int) $invoiceId;
    }

    private function invoke(object $target, string $method, array $args): mixed
    {
        $ref = new \ReflectionMethod($target, $method);
        $ref->setAccessible(true);

        return $ref->invoke($target, ...$args);
    }
}
