<?php

namespace Tests\Feature;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\OpeningStockService;
use App\Services\Inventory\ReconciliationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 7 — Inventory reconciliation.
 *
 * The movement ledger and the WAC ledger are the truth; products.quantity is
 * a derived cache (source-of-truth doc, invariant 8). The report must detect
 * balance divergence, legacy pre-engine lines without ICTs, and derived
 * drift. Resync must repair through ledger-recorded correction documents
 * (never silent rewrites) except the derived cache, which is a pure write.
 */
class InventoryReconciliationTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $productId;

    protected int $unitId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'IRC Co',
            'company_code' => 'IRC',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('company')->insertOrIgnore([
            'id' => 2,
            'company_name' => 'Other Co',
            'company_code' => 'OTH',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'irc_'.$suffix,
            'fullname' => 'Reconciliation Tester',
            'email' => 'irc_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'IRC-BR-'.$suffix,
            'branch_name' => 'IRC Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'IRC-WH-'.$suffix,
            'name' => 'IRC Warehouse',
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'IRC Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'IRC-PRD-'.$suffix,
            'name' => 'IRC Product',
            'slug' => 'irc-product-'.$suffix,
            'sku' => 'IRC-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 5,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function seedOpening(float $quantity, string $unitCost): object
    {
        return app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => $quantity, 'cost_price' => (float) $unitCost],
            ],
        ]);
    }

    protected function mismatchRow(): ?array
    {
        $report = app(ReconciliationService::class)->report($this->warehouseId);

        return collect($report['mismatches'])
            ->first(fn ($m) => $m['product_id'] === $this->productId && $m['warehouse_id'] === $this->warehouseId);
    }

    protected function derivedRow(): ?array
    {
        $report = app(ReconciliationService::class)->report($this->warehouseId);

        return collect($report['derived_drift'])
            ->first(fn ($d) => $d['product_id'] === $this->productId);
    }

    /** @test */
    public function clean_ledger_reports_no_drift()
    {
        $this->seedOpening(10, '5');

        app(ReconciliationService::class)->report($this->warehouseId);

        // The shared testing DB may carry legacy drift from other suites for
        // OTHER products; THIS product's ledgers must agree.
        $this->assertNull($this->mismatchRow());
        $this->assertNull($this->derivedRow());
    }

    /** @test */
    public function wac_drift_is_detected_and_repaired_by_posting_a_correction()
    {
        $this->seedOpening(10, '5');

        // Break the WAC ledger: delete the balance + the inbound ICT. The
        // movement ledger still says 10.
        DB::table('inventory_cost_transactions')->where('product_id', $this->productId)->delete();
        DB::table('inventory_cost_balances')->where('product_id', $this->productId)->delete();

        $row = $this->mismatchRow();
        $this->assertNotNull($row, 'Missing WAC balance must be flagged.');
        $this->assertSame(10.0, $row['ledger_quantity']);
        $this->assertSame(0.0, $row['wac_quantity']);

        $service = app(ReconciliationService::class);
        $result = $service->resyncBalance($this->productId, $this->warehouseId);

        $this->assertTrue($result['changed']);
        $this->assertSame(10.0, $result['delta']);

        // The correction attaches the missing ICT to the EXISTING (uncosted)
        // movement line — the movement ledger must NOT grow (that would make
        // the gap chase itself), and the line stops counting as legacy.
        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')
                ->where('reference_type', 'reconciliation')
                ->where('reference_id', $this->productId)
                ->count(),
            'A positive delta with a host line must NOT create a synthetic movement.'
        );

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'reconciliation_correction')
            ->first();
        $this->assertNotNull($ict, 'Correction must carry a WAC transaction.');
        $this->assertSame(10.0, (float) $ict->quantity_delta);
        $this->assertSame(10.0, (float) DB::table('inventory_movement_lines')->where('id', $ict->movement_line_id)->value('quantity'));

        // After the fix the report is clean.
        $this->assertNull($this->mismatchRow());
    }

    /** @test */
    public function tampered_balance_above_its_icts_is_recomputed_from_ict_sum()
    {
        $this->seedOpening(10, '5');

        // Balance was inflated OUTSIDE the cost engine: ICB says 12 but its
        // own ICTs sum to 10.
        DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->increment('quantity', 2);

        $row = $this->mismatchRow();
        $this->assertNotNull($row);
        $this->assertSame(-2.0, $row['delta']);

        $result = app(ReconciliationService::class)->resyncBalance($this->productId, $this->warehouseId);

        $this->assertSame('balance_recomputed_from_ict', $result['mode'] ?? null);

        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(10.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(50.0, (float) $balance->inventory_value, 0.0001);

        $this->assertNull($this->mismatchRow());
    }

    /** @test */
    public function orphan_ict_surplus_is_refused_for_manual_review()
    {
        $this->seedOpening(10, '5');

        // Genuine orphan cost transactions: Σ ICT (12) exceeds the movement
        // ledger (10). The right fix is a human decision.
        DB::table('inventory_cost_transactions')->insertGetId([
            'company_id' => $this->companyId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'source_type' => 'legacy_import',
            'source_id' => 999999,
            'quantity_delta' => 2,
            'value_delta' => 8,
            'unit_cost' => 4,
            'previous_quantity' => 10,
            'previous_value' => 50,
            'previous_average_cost' => 5,
            'new_quantity' => 12,
            'new_value' => 58,
            'new_average_cost' => 4.833333,
            'transaction_date' => now()->toDateString(),
            'posting_date' => now()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            app(ReconciliationService::class)->resyncBalance($this->productId, $this->warehouseId);
            $this->fail('Orphan-ICT surplus must be refused for manual review.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase('manual review', $e->getMessage());
        }

        // Nothing was changed.
        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(10.0, (float) $balance->quantity);
    }

    /** @test */
    public function legacy_lines_without_ict_are_flagged()
    {
        // Pre-engine row: a movement with no cost transaction behind it.
        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'adjustment',
            'direction' => 'in',
            'reference_type' => 'stock_adjustment',
            'reference_id' => 0,
            'voucher_num' => 'LEGACY-'.uniqid(),
            'warehouse_id' => $this->warehouseId,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('inventory_movement_lines')->insertGetId([
            'stock_movement_id' => $headerId,
            'product_id' => $this->productId,
            'unit_id' => $this->unitId,
            'quantity' => 7,
            'cost_price' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = $this->mismatchRow();
        $this->assertNotNull($row, 'Legacy line must be flagged.');
        $this->assertSame(1, $row['legacy_lines_without_ict']);
        $this->assertSame(7.0, $row['ledger_quantity']);
        $this->assertSame(0.0, $row['wac_quantity']);

        // Resync brings the WAC up to the legacy ledger by costing the legacy
        // line (avg cost 0 — legacy row, documented).
        app(ReconciliationService::class)->resyncBalance($this->productId, $this->warehouseId);

        $balance = DB::table('inventory_cost_balances')->where('product_id', $this->productId)->first();
        $this->assertSame(7.0, (float) $balance->quantity);

        // The legacy line is now costed — the legacy flag is gone.
        $row = $this->mismatchRow();
        $this->assertNull($row, 'A costed legacy line is no longer flagged.');
    }

    /** @test */
    public function resync_is_idempotent_once_in_line()
    {
        $this->seedOpening(10, '5');

        DB::table('inventory_cost_balances')->where('product_id', $this->productId)->delete();
        DB::table('inventory_cost_transactions')->where('product_id', $this->productId)->delete();

        $service = app(ReconciliationService::class);
        $service->resyncBalance($this->productId, $this->warehouseId);
        $second = $service->resyncBalance($this->productId, $this->warehouseId);

        $this->assertFalse($second['changed']);
        $this->assertSame(
            1,
            DB::table('inventory_cost_transactions')->where('source_type', 'reconciliation_correction')->count(),
            'A second resync must not post another correction.'
        );
    }

    /** @test */
    public function derived_quantity_drift_is_detected_and_resynced()
    {
        $this->seedOpening(10, '5');

        // Derive-cache corruption.
        DB::table('products')->where('id', $this->productId)->update(['quantity' => 99]);

        $row = $this->derivedRow();
        $this->assertNotNull($row, 'Derived drift must be flagged.');
        $this->assertSame(99.0, $row['derived_quantity']);
        $this->assertSame(10.0, $row['ledger_total']);

        $result = app(ReconciliationService::class)->resyncDerivedQuantity($this->productId);

        $this->assertTrue($result['changed']);
        $this->assertSame(10.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        $this->assertNull($this->derivedRow());
    }

    /** @test */
    public function cross_company_resources_are_refused()
    {
        $foreignWarehouse = Warehouses::query()->insertGetId([
            'warehouse_code' => 'IRC-FW-'.uniqid(),
            'name' => 'Foreign Warehouse',
            'branch_id' => $this->branchId,
            'company_id' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            app(ReconciliationService::class)->resyncBalance($this->productId, $foreignWarehouse);
            $this->fail('Foreign warehouse resync must be refused.');
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            $this->assertSame(404, $e->getStatusCode());
        }

        $foreignProductId = Products::query()->insertGetId([
            'product_code' => 'IRC-FP-'.uniqid(),
            'name' => 'Foreign Product',
            'slug' => 'irc-fp-'.uniqid(),
            'sku' => 'IRC-FP',
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'company_id' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);

        app(ReconciliationService::class)->resyncDerivedQuantity($foreignProductId);
    }
}
