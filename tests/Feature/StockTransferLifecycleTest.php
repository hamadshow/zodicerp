<?php

namespace Tests\Feature;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\OpeningStockService;
use App\Services\Inventory\StockTransferService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 5 — Stock Transfer lifecycle.
 *
 * Ratified contract: the ledger applies at SAVE time. WAC moves from the
 * source warehouse to the destination at the outbound unit cost (no gain or
 * loss), no journal is posted, global products.quantity is untouched. Phase 5
 * adds: the service engine, cancellation via WAC::reverse with mirrored
 * audit documents, edit/delete rules, and the create-line race fix.
 */
class StockTransferLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $warehouseBId;

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
            'company_name' => 'STL Co',
            'company_code' => 'STL',
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
            'username' => 'stl_'.$suffix,
            'fullname' => 'Transfer Tester',
            'email' => 'stl_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'STL-BR-'.$suffix,
            'branch_name' => 'STL Branch',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $mkWarehouse = function (string $tag) use ($suffix) {
            return Warehouses::query()->insertGetId([
                'warehouse_code' => 'STL-WH-'.$tag.'-'.$suffix,
                'name' => 'STL Warehouse '.$tag,
                'branch_id' => $this->branchId,
                'company_id' => $this->companyId,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        };
        $this->warehouseId = $mkWarehouse('A');
        $this->warehouseBId = $mkWarehouse('B');

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'STL Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'STL-PRD-'.$suffix,
            'name' => 'STL Product',
            'slug' => 'stl-product-'.$suffix,
            'sku' => 'STL-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 10,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Seed stock through the REAL Phase 3 opening-stock engine so the WAC
     * layer starts from an authentic state.
     */
    protected function seedOpening(float $quantity, string $unitCost, ?int $warehouseId = null): object
    {
        return app(OpeningStockService::class)->create([
            'warehouse_id' => $warehouseId ?? $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => $quantity, 'cost_price' => (float) $unitCost],
            ],
        ]);
    }

    protected function makeTransfer(float $quantity = 7, string $unitCost = '4'): object
    {
        $this->seedOpening(10, $unitCost);

        return app(StockTransferService::class)->createTransfer([
            'movement_date' => now()->toDateString(),
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'notes' => 'Lifecycle transfer',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => $quantity],
            ],
        ]);
    }

    protected function sourceHeader(object $transfer): ?object
    {
        return DB::table('inventory_movement_headers')->where('id', $transfer->id)->first();
    }

    protected function destinationHeader(object $transfer): ?object
    {
        return DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer_destination')
            ->where('reference_id', $transfer->id)
            ->first();
    }

    /* =====================================================================
     | Creation & ledger contract
     ===================================================================== */

    /** @test */
    public function create_moves_wac_between_warehouses_and_keeps_global_quantity()
    {
        $service = app(StockTransferService::class);
        $opening = $this->seedOpening(20, '3');

        $transfer = $service->createTransfer([
            'movement_date' => now()->toDateString(),
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 7],
            ],
        ]);

        $source = $this->sourceHeader($transfer);
        $destination = $this->destinationHeader($transfer);

        $this->assertSame('out', $source->direction);
        $this->assertSame($this->warehouseId, (int) $source->warehouse_id);
        $this->assertSame('in', $destination->direction);
        $this->assertSame($this->warehouseBId, (int) $destination->warehouse_id);

        $sourceLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $source->id)->first();
        $destinationLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $destination->id)->first();
        $this->assertSame(7.0, (float) $sourceLine->quantity);
        $this->assertSame(7.0, (float) $destinationLine->quantity);
        $this->assertSame(
            (float) $sourceLine->cost_price,
            (float) $destinationLine->cost_price,
            'The inbound must be priced at the outbound WAC (no gain/loss).'
        );
        $this->assertEqualsWithDelta(3.0, (float) $sourceLine->cost_price, 0.0001);

        $sourceBalance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseId)->first();
        $targetBalance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseBId)->first();
        $this->assertSame(13.0, (float) $sourceBalance->quantity);
        $this->assertSame(7.0, (float) $targetBalance->quantity);
        $this->assertEqualsWithDelta(
            (float) $sourceBalance->average_cost,
            (float) $targetBalance->average_cost,
            0.000001
        );

        // Derived global quantity is untouched by transfers.
        $this->assertSame(20.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // No journal for transfers.
        $this->assertSame(
            0,
            DB::table('journal_entries')->where('reference', 'like', '%'.$source->voucher_num.'%')->count()
        );

        // Every line carries the conversion snapshot and the created line id
        // (no latest('id') race) drives its ICT.
        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'stock_transfer_source')
            ->where('movement_header_id', $source->id)
            ->first();
        $this->assertNotNull($ict);
        $this->assertSame((int) $sourceLine->id, (int) $ict->source_id);
        $this->assertSame(-7.0, (float) $ict->quantity_delta);

        unset($opening);
    }

    /** @test */
    public function create_refuses_insufficient_stock_and_rolls_back()
    {
        $service = app(StockTransferService::class);

        $this->seedOpening(2, '3');

        try {
            $service->createTransfer([
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $this->warehouseId,
                'to_warehouse_id' => $this->warehouseBId,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 5],
                ],
            ]);
            $this->fail('Transferring more than the WAC balance must throw.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase('Insufficient', $e->getMessage());
        }

        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')
                ->where('reference_type', 'stock_transfer')
                ->where('to_warehouse_id', $this->warehouseBId)
                ->count(),
            'The whole create must roll back.'
        );
        $this->assertSame(
            0,
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_transfer_source')->count()
        );
        $this->assertSame(2.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /** @test */
    public function create_converts_document_units_to_base()
    {
        $service = app(StockTransferService::class);
        $this->seedOpening(24, '2');

        $dozenUnitId = ItemUnit::query()->insertGetId([
            'name' => 'STL Dozen '.uniqid(),
            'unit_type' => 2,
            'conversion_factor' => 12,
            'base_unit' => $this->unitId,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $transfer = $service->createTransfer([
            'movement_date' => now()->toDateString(),
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $dozenUnitId, 'quantity' => 1],
            ],
        ]);

        $source = $this->sourceHeader($transfer);
        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $source->id)->first();

        $this->assertSame(12.0, (float) $line->quantity, '1 dozen must become 12 base units.');
        $this->assertEqualsWithDelta(1.0, (float) $line->original_quantity, 0.0001, 'original_quantity keeps the ENTERED document quantity.');
        $this->assertEqualsWithDelta(12.0, (float) $line->conversion_factor_snapshot, 0.0001);

        $destinationBalance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseBId)->first();
        $this->assertSame(12.0, (float) $destinationBalance->quantity);
    }

    /* =====================================================================
     | Cancel (exact reversal)
     ===================================================================== */

    /** @test */
    public function cancel_reverses_balances_exactly_and_writes_audit_documents()
    {
        $service = app(StockTransferService::class);
        $this->makeTransfer(7, '4');

        $beforeSource = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseId)->first();
        $beforeTarget = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseBId)->first();

        $transfer = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer')
            ->where('to_warehouse_id', $this->warehouseBId)
            ->orderByDesc('id')
            ->first();

        $service->cancelTransfer((int) $transfer->id);

        $afterSource = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseId)->first();
        $afterTarget = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseBId)->first();

        $this->assertEqualsWithDelta(10.0, (float) $afterSource->quantity, 0.000001);
        $this->assertEqualsWithDelta(40.0, (float) $afterSource->inventory_value, 0.000001);
        $this->assertSame(0.0, (float) $afterTarget->quantity);
        $this->assertEqualsWithDelta(0.0, (float) $afterTarget->inventory_value, 0.000001);
        $this->assertEqualsWithDelta(4.0, (float) $afterSource->average_cost, 0.000001);

        // Reversal ICTs exist for every original, with reversal_of_id set.
        $reversals = DB::table('inventory_cost_transactions')
            ->where('source_type', 'stock_transfer_cancellation')
            ->get();
        $this->assertCount(2, $reversals);
        foreach ($reversals as $reversal) {
            $this->assertNotNull($reversal->reversal_of_id);
        }

        // Mirrored audit documents: 'in' back at source, 'out' at destination.
        $reversalDocs = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer_cancellation')
            ->where('reference_id', $transfer->id)
            ->get();
        $this->assertCount(2, $reversalDocs);
        $this->assertEqualsCanonicalizing(
            ['in', 'out'],
            $reversalDocs->pluck('direction')->all()
        );

        // Original documents are stamped.
        $source = $this->sourceHeader($transfer);
        $this->assertStringContainsString('[CANCELLED', (string) $source->notes);
        $this->assertStringContainsString('[CANCELLED', (string) $this->destinationHeader($transfer)->notes);

        // The WAC chronology date must never regress (reversal dated today,
        // transfer dated today — same date is fine).
        $this->assertTrue($afterSource->quantity >= 0 && $afterTarget->quantity >= 0);

        unset($beforeSource, $beforeTarget);
    }

    /** @test */
    public function cancel_is_idempotent()
    {
        $service = app(StockTransferService::class);
        $this->makeTransfer(3, '5');

        $transfer = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer')
            ->where('to_warehouse_id', $this->warehouseBId)
            ->orderByDesc('id')
            ->first();

        $service->cancelTransfer((int) $transfer->id);

        $balancesAfterFirst = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->orderBy('warehouse_id')
            ->get(['warehouse_id', 'quantity', 'inventory_value'])
            ->toJson();

        $service->cancelTransfer((int) $transfer->id);

        $balancesAfterSecond = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->orderBy('warehouse_id')
            ->get(['warehouse_id', 'quantity', 'inventory_value'])
            ->toJson();

        $this->assertSame($balancesAfterFirst, $balancesAfterSecond);
        $this->assertSame(
            2,
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_transfer_cancellation')->count(),
            'Idempotent cancel must not write additional reversal ICTs.'
        );
        $this->assertSame(
            2,
            DB::table('inventory_movement_headers')
                ->where('reference_type', 'stock_transfer_cancellation')
                ->where('reference_id', $transfer->id)
                ->count()
        );
    }

    /** @test */
    public function cancel_refuses_consumed_destination_stock_and_rolls_back()
    {
        $service = app(StockTransferService::class);
        $this->makeTransfer(5, '2');

        $transfer = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer')
            ->where('to_warehouse_id', $this->warehouseBId)
            ->orderByDesc('id')
            ->first();

        // Consume the transferred stock at the destination (adjustment engine).
        app(\App\Services\Inventory\StockAdjustmentService::class)->createAdjustment([
            'warehouse_id' => $this->warehouseBId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'damage',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -5, 'unit_cost' => 0],
            ],
        ]);
        $adjustment = DB::table('stock_adjustments')->orderByDesc('id')->first();
        app(\App\Services\Inventory\StockAdjustmentService::class)->approveAdjustment((int) $adjustment->id);

        try {
            $service->cancelTransfer((int) $transfer->id);
            $this->fail('Cancelling a transfer whose stock was consumed must throw.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase('consumed', $e->getMessage());
        }

        // Whole cancel rolled back: original balances unchanged, no reversal
        // ICTs, no audit documents, no cancellation stamp.
        $target = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseBId)->first();
        $this->assertSame(0.0, (float) $target->quantity);
        $this->assertSame(
            0,
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_transfer_cancellation')->count()
        );
        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')
                ->where('reference_type', 'stock_transfer_cancellation')
                ->where('reference_id', $transfer->id)
                ->count()
        );
        $source = $this->sourceHeader($transfer);
        $this->assertStringNotContainsString('[CANCELLED', (string) $source->notes);
    }

    /* =====================================================================
     | Edit & delete rules
     ===================================================================== */

    /** @test */
    public function posted_transfer_cannot_be_edited_or_deleted_but_draft_can()
    {
        $service = app(StockTransferService::class);
        $this->makeTransfer(2, '6');

        $transfer = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer')
            ->where('to_warehouse_id', $this->warehouseBId)
            ->orderByDesc('id')
            ->first();

        $this->assertTrue($service->isPosted($transfer));

        try {
            $service->updateTransfer((int) $transfer->id, [
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $this->warehouseId,
                'to_warehouse_id' => $this->warehouseBId,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 9],
                ],
            ]);
            $this->fail('Editing a posted transfer must throw.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase('cannot be edited', $e->getMessage());
        }

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $transfer->id)->first();
        $this->assertSame(2.0, (float) $line->quantity, 'Posted lines must stay untouched.');

        // A genuinely unposted draft (no ICTs) can still be edited and deleted.
        $draftId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'reference_type' => 'stock_transfer',
            'voucher_num' => 'TR-DRAFT-'.uniqid(),
            'warehouse_id' => $this->warehouseId,
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'notes' => 'TransferStock',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertFalse($service->isPosted(DB::table('inventory_movement_headers')->where('id', $draftId)->first()));

        $service->updateTransfer($draftId, [
            'movement_date' => now()->toDateString(),
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'notes' => 'Updated draft',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 4],
            ],
        ]);

        $this->assertSame(4.0, (float) DB::table('inventory_movement_lines')->where('stock_movement_id', $draftId)->value('quantity'));
    }

    /** @test */
    public function legacy_transfer_without_icts_cannot_be_cancelled()
    {
        $service = app(StockTransferService::class);

        $legacyId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'reference_type' => 'stock_transfer',
            'voucher_num' => 'TR-LEGACY-'.uniqid(),
            'warehouse_id' => $this->warehouseId,
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'notes' => 'TransferStock',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $service->cancelTransfer($legacyId);
            $this->fail('Cancelling a transfer with no ICTs must be refused.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase('reconciliation', $e->getMessage());
        }

        $this->assertStringNotContainsString('[CANCELLED', (string) DB::table('inventory_movement_headers')->where('id', $legacyId)->value('notes'));
    }

    /* =====================================================================
     | Validation, isolation, cross-company
     ===================================================================== */

    /** @test */
    public function same_warehouse_transfer_is_refused()
    {
        $this->seedOpening(10, '3');

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(StockTransferService::class)->createTransfer([
            'movement_date' => now()->toDateString(),
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 1],
            ],
        ]);
    }

    /** @test */
    public function cross_company_resources_are_refused_at_creation()
    {
        // Foreign warehouse (company 2).
        $foreignWarehouse = Warehouses::query()->insertGetId([
            'warehouse_code' => 'STL-FW-'.uniqid(),
            'name' => 'Foreign Warehouse',
            'branch_id' => $this->branchId,
            'company_id' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->seedOpening(10, '3');

        try {
            app(StockTransferService::class)->createTransfer([
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $this->warehouseId,
                'to_warehouse_id' => $foreignWarehouse,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 1],
                ],
            ]);
            $this->fail('Cross-company destination must be refused.');
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            $this->assertSame(404, $e->getStatusCode());
        }

        // Foreign product.
        $foreignProductId = Products::query()->insertGetId([
            'product_code' => 'STL-FP-'.uniqid(),
            'name' => 'Foreign Product',
            'slug' => 'stl-fp-'.uniqid(),
            'sku' => 'STL-FP-SKU',
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 1,
            'company_id' => 2,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            app(StockTransferService::class)->createTransfer([
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $this->warehouseId,
                'to_warehouse_id' => $this->warehouseBId,
                'items' => [
                    ['product_id' => $foreignProductId, 'unit_id' => $this->unitId, 'quantity' => 1],
                ],
            ]);
            $this->fail('Cross-company product must be refused.');
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            $this->assertSame(404, $e->getStatusCode());
        }
    }

    /** @test */
    public function cancel_of_foreign_transfer_throws_model_not_found()
    {
        // Foreign company-2 header shaped like a transfer.
        $foreignId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'reference_type' => 'stock_transfer',
            'voucher_num' => 'TR-FGN-'.uniqid(),
            'warehouse_id' => $this->warehouseId,
            'from_warehouse_id' => $this->warehouseId,
            'to_warehouse_id' => $this->warehouseBId,
            'company_id' => 2,
            'created_by' => $this->userId,
            'notes' => 'TransferStock',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        app(StockTransferService::class)->cancelTransfer($foreignId);
    }
}
