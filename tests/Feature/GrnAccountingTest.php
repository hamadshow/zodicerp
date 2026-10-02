<?php

namespace Tests\Feature;

use App\Services\Vendor_Purchases\GoodsReceiptService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * MySQL Integration Tests for Goods Receipt (GRN) Accounting Behavior.
 *
 * These tests verify that GRN approval is an inventory-only operation:
 *   - Creates inventory movements (stock IN)
 *   - Updates product quantities
 *   - Updates PO received quantities
 *   - Does NOT create GL journal entries
 *
 * ARCHITECTURE DECISION:
 *   ZodicERP uses "Invoice-driven inventory recognition" where the Purchase Invoice
 *   is the sole financial trigger (Dr Purchase/COGS, Cr AP). No GRNI account exists.
 *   The GRN remains operational-only until a proper GRNI account and receipt allocation
 *   mechanism are added to the architecture.
 */
class GrnAccountingTest extends TestCase
{
    protected int $testUserId;
    protected int $testCompanyId;
    protected int $testWarehouseId;
    protected int $testProductId;
    protected int $testUnitId;
    protected int $testSupplierId;
    protected int $testPoId;
    protected string $testPoNumber;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        $this->testCompanyId = 1;

        // Create test user (unique username — a committed residue row from an
        // interrupted run must never collide with the unique index).
        $email = 'grn-test-' . uniqid() . '@zodicerp-test.com';
        $this->testUserId = DB::table('users')->insertGetId([
            'username' => 'grn-tester-' . uniqid(),
            'email' => $email,
            'password' => bcrypt('password'),
            'role' => 'admin',
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Ensure company exists
        DB::table('company')->insertOrIgnore([
            'id' => 1,
            'company_name' => 'GRN Test Company',
            'company_code' => 'GRN-TEST',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create branch
        $branch = DB::table('branches')->where('branch_code', 'GRN-TEST-BR')->first();
        $branchId = $branch?->id ?? DB::table('branches')->insertGetId([
            'company_id' => $this->testCompanyId,
            'branch_code' => 'GRN-TEST-BR',
            'branch_name' => 'GRN Test Branch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create warehouse
        $warehouse = DB::table('warehouses')->where('warehouse_code', 'GRN-TEST-WH')->first();
        $this->testWarehouseId = $warehouse?->id ?? DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'GRN-TEST-WH',
            'name' => 'GRN Test Warehouse',
            'branch_id' => $branchId,
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create unit
        $unit = DB::table('item_units')->where('name', 'GRN Test Unit')->first();
        $this->testUnitId = $unit?->id ?? DB::table('item_units')->insertGetId([
            'name' => 'GRN Test Unit',
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => true,
            'created_by' => $this->testUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create product
        $uniqid = uniqid();
        $this->testProductId = DB::table('products')->insertGetId([
            'product_code' => 'GRN-TP-' . $uniqid,
            'name' => 'GRN TEST PRODUCT ' . $uniqid,
            'slug' => 'grn-test-product-' . $uniqid,
            'sku' => 'GRN-TEST-' . $uniqid,
            'quantity' => 0,
            'unit_id' => $this->testUnitId,
            'cost_per_item' => 10.00,
            'company_id' => $this->testCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create supplier group
        $supplierGroupId = DB::table('supplier_groups')->insertGetId([
            'code' => 'GRN-G',
            'name_ar' => 'GRN Test Group',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create supplier
        $this->testSupplierId = DB::table('suppliers')->insertGetId([
            'supplier_code' => 'GRN-SUP-' . uniqid(),
            'name_ar' => 'GRN Test Supplier',
            'supplier_group_id' => $supplierGroupId,
            'password' => bcrypt('password'),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create purchase order
        $this->testPoNumber = 'GRN-PO-' . uniqid();
        $this->testPoId = DB::table('purchase_orders')->insertGetId([
            'po_number' => $this->testPoNumber,
            'po_date' => now()->toDateString(),
            'vendor_id' => $this->testSupplierId,
            'status' => 'approved',
            'company_id' => $this->testCompanyId,
            'currency_id' => 1,
            'exchange_rate' => 1.000000,
            'subtotal' => 500.00,
            'grand_total' => 500.00,
            'created_by' => $this->testUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create PO item
        DB::table('purchase_order_items')->insert([
            'purchase_order_id' => $this->testPoId,
            'line_number' => 1,
            'item_type' => 'product',
            'product_id' => $this->testProductId,
            'item_name_ar' => 'GRN Test Product',
            'unit_id' => $this->testUnitId,
            'ordered_quantity' => 50,
            'received_quantity' => 0,
            'unit_price' => 10.00,
            'discount_percent' => 0,
            'discount_amount' => 0,
            'tax_percent' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        // Hardened cleanup: any ICT referencing this run's warehouse/product
        // must go first (covers residue from interrupted runs whose detail ids
        // no longer match), otherwise the warehouse delete violates its FK.
        // The self-referencing reversal_of_id FK needs CHILDREN (reversals)
        // deleted before parents (originals).
        if ($this->testWarehouseId ?? 0) {
            DB::table('inventory_cost_transactions')
                ->where('warehouse_id', $this->testWarehouseId)
                ->where('source_type', 'goods_receipt_reversal')
                ->delete();
            DB::table('inventory_cost_transactions')
                ->where('warehouse_id', $this->testWarehouseId)
                ->delete();

            // Balances reference the warehouse too — warehouse-scoped so
            // residue products from interrupted runs are covered.
            DB::table('inventory_cost_balances')
                ->where('warehouse_id', $this->testWarehouseId)
                ->delete();
        }

        // Remove dependent costing and movement rows before their referenced GRN rows.
        // Warehouse-scoped so orphan receipts from interrupted runs (same
        // shared warehouse) cannot block the warehouse delete either.
        $grnIds = DB::table('goods_receipts')
            ->where(function ($q) {
                $q->where('warehouse_id', $this->testWarehouseId ?? 0)
                    ->orWhere('order_id', $this->testPoId ?? 0);
            })
            ->pluck('id');

        if ($grnIds->isNotEmpty()) {
            $detailIds = DB::table('goods_receipt_details')
                ->whereIn('receipt_id', $grnIds)
                ->pluck('id');

            if ($detailIds->isNotEmpty()) {
                // Reversal ICTs (source_id = original ICT id) must go first.
                $originalTxIds = DB::table('inventory_cost_transactions')
                    ->where('source_type', 'goods_receipt_detail')
                    ->whereIn('source_id', $detailIds)
                    ->pluck('id');
                if ($originalTxIds->isNotEmpty()) {
                    DB::table('inventory_cost_transactions')
                        ->where('source_type', 'goods_receipt_reversal')
                        ->whereIn('reversal_of_id', $originalTxIds)
                        ->delete();
                }

                DB::table('inventory_cost_transactions')
                    ->where('source_type', 'goods_receipt_detail')
                    ->whereIn('source_id', $detailIds)
                    ->delete();
            }

            $movementHeaders = DB::table('inventory_movement_headers')
                ->where('reference_type', 'goods_receipt')
                ->whereIn('reference_id', $grnIds)
                ->pluck('id');

            if ($movementHeaders->isNotEmpty()) {
                DB::table('inventory_movement_lines')->whereIn('stock_movement_id', $movementHeaders)->delete();
                DB::table('inventory_movement_headers')->whereIn('id', $movementHeaders)->delete();
            }

            DB::table('goods_receipt_details')->whereIn('receipt_id', $grnIds)->delete();
            DB::table('goods_receipts')->whereIn('id', $grnIds)->delete();
        }

        // Clean up PO items and PO
        if ($this->testPoId) {
            DB::table('purchase_order_items')->where('purchase_order_id', $this->testPoId)->delete();
            DB::table('purchase_orders')->where('id', $this->testPoId)->delete();
        }

        // Residue from interrupted runs: adjustment + movement rows anchored
        // to the shared warehouse/product must go BEFORE the product and
        // warehouse deletes (FK-safe order).
        if ($this->testWarehouseId ?? 0) {
            $residueAdjustmentIds = DB::table('stock_adjustments')
                ->where('warehouse_id', $this->testWarehouseId)
                ->pluck('id');
            if ($residueAdjustmentIds->isNotEmpty()) {
                DB::table('stock_adjustment_items')->whereIn('adjustment_id', $residueAdjustmentIds)->delete();
                DB::table('stock_adjustments')->whereIn('id', $residueAdjustmentIds)->delete();
            }

            $residueHeaders = DB::table('inventory_movement_headers')
                ->where('warehouse_id', $this->testWarehouseId)
                ->pluck('id');
            if ($residueHeaders->isNotEmpty()) {
                DB::table('inventory_movement_lines')->whereIn('stock_movement_id', $residueHeaders)->delete();
                DB::table('inventory_movement_headers')->whereIn('id', $residueHeaders)->delete();
            }
        }

        // Clean up product (after every child referencing it is gone).
        if ($this->testProductId) {
            DB::table('products')->where('id', $this->testProductId)->delete();
        }

        DB::table('supplier_groups')->where('code', 'GRN-G')->delete();
        DB::table('warehouses')->where('warehouse_code', 'GRN-TEST-WH')->delete();
        DB::table('item_units')->where('name', 'GRN Test Unit')->delete();
        DB::table('branches')->where('branch_code', 'GRN-TEST-BR')->delete();

        // Clean up supplier
        if ($this->testSupplierId) {
            DB::table('suppliers')->where('id', $this->testSupplierId)->delete();
        }

        // Clean up user
        if ($this->testUserId) {
            DB::table('users')->where('id', $this->testUserId)->delete();
        }

        parent::tearDown();
    }

    // ========================================================================
    // TEST 1 — GRN approval creates inventory movement, NO journal
    // ========================================================================

    /** @test */
    public function approved_grn_creates_inventory_movement_but_no_journal()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(50, 10.00); // 50 units × $10 = $500

        $service = app(GoodsReceiptService::class);
        $service->approveReceipt($receipt);

        // Verify inventory movement was created
        $movements = DB::table('inventory_movement_headers')
            ->where('voucher_num', $receipt->receipt_number)
            ->where('reference_type', 'goods_receipt')
            ->count();
        $this->assertEquals(1, $movements, 'GRN must create exactly one inventory movement');

        $movementLine = DB::table('inventory_movement_lines')
            ->join('inventory_movement_headers', 'inventory_movement_headers.id', '=', 'inventory_movement_lines.stock_movement_id')
            ->where('inventory_movement_headers.voucher_num', $receipt->receipt_number)
            // Both tables have an `id` column; select the movement LINE explicitly so
            // `$movementLine->id` cannot resolve to the header id (ambiguous `SELECT *`).
            ->select('inventory_movement_lines.*')
            ->first();
        $this->assertNotNull($movementLine?->goods_receipt_detail_id, 'Movement line must reference the GRN detail.');

        $costTransaction = DB::table('inventory_cost_transactions')
            ->where('source_type', 'goods_receipt_detail')
            ->where('source_id', $movementLine->goods_receipt_detail_id)
            ->first();
        $this->assertNotNull($costTransaction, 'GRN movement must create a weighted-average cost transaction.');
        $this->assertEquals($movementLine->id, $costTransaction->movement_line_id, 'Cost transaction must reference the movement line.');

        // Verify NO journal entry was created
        $journals = DB::table('journal_entries')
            ->where('reference', $receipt->receipt_number)
            ->count();
        $this->assertEquals(0, $journals, 'GRN must NOT create any journal entry');

        // Verify product quantity was updated
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(50.0, (float) $product->quantity, 'Product quantity must be incremented');
    }

    // ========================================================================
    // TEST 2 — Repeated approval is idempotent
    // ========================================================================

    /** @test */
    public function repeated_approval_is_idempotent_no_duplicates()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(30, 20.00); // 30 units × $20 = $600

        $service = app(GoodsReceiptService::class);

        // Approve three times
        $service->approveReceipt($receipt);
        $service->approveReceipt($receipt->fresh());
        $service->approveReceipt($receipt->fresh());

        // Should have exactly ONE inventory movement
        $movements = DB::table('inventory_movement_headers')
            ->where('voucher_num', $receipt->receipt_number)
            ->count();
        $this->assertEquals(1, $movements, 'Must have exactly one inventory movement');

        // Product quantity should be incremented only once
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(30.0, (float) $product->quantity, 'Product quantity must increment only once');
    }

    // ========================================================================
    // TEST 3 — Inventory quantity correctness
    // ========================================================================

    /** @test */
    public function grn_updates_product_quantity_correctly()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(25, 8.00); // 25 units × $8 = $200

        $service = app(GoodsReceiptService::class);
        $service->approveReceipt($receipt);

        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(25.0, (float) $product->quantity);
    }

    // ========================================================================
    // TEST 4 — PO received quantity update
    // ========================================================================

    /** @test */
    public function grn_updates_po_received_quantity()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(40, 10.00); // 40 of 50 ordered

        $service = app(GoodsReceiptService::class);
        $service->approveReceipt($receipt);

        $poItem = DB::table('purchase_order_items')
            ->where('purchase_order_id', $this->testPoId)
            ->first();
        $this->assertEquals(40.0, (float) $poItem->received_quantity);
    }

    // ========================================================================
    // TEST 5 — Full receipt marks PO as fully_received
    // ========================================================================

    /** @test */
    public function grn_fully_received_marks_po_correctly()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(50, 10.00); // All 50 ordered

        $service = app(GoodsReceiptService::class);
        $service->approveReceipt($receipt);

        $poItem = DB::table('purchase_order_items')
            ->where('purchase_order_id', $this->testPoId)
            ->first();
        $this->assertEquals(50.0, (float) $poItem->received_quantity);

        $po = DB::table('purchase_orders')->where('id', $this->testPoId)->first();
        $this->assertEquals('fully_received', $po->status);
    }

    // ========================================================================
    // TEST 6 — Multiple GRNs accumulate correctly
    // ========================================================================

    /** @test */
    public function multiple_grns_accumulate_received_quantities()
    {
        $this->actingAsTestUser();

        $service = app(GoodsReceiptService::class);

        $receipt1 = $this->createGrn(20, 10.00);
        $service->approveReceipt($receipt1);

        $receipt2 = $this->createGrn(15, 10.00);
        $service->approveReceipt($receipt2);

        // PO should show 35 received
        $poItem = DB::table('purchase_order_items')
            ->where('purchase_order_id', $this->testPoId)
            ->first();
        $this->assertEquals(35.0, (float) $poItem->received_quantity);

        // Product should show 35
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(35.0, (float) $product->quantity);

        // Two inventory movements (one per GRN)
        $movementCount = DB::table('inventory_movement_headers')
            ->where('reference_type', 'goods_receipt')
            ->whereIn('voucher_num', [$receipt1->receipt_number, $receipt2->receipt_number])
            ->count();
        $this->assertEquals(2, $movementCount);

        // Still NO journal entries for these GRNs
        $journalCount = DB::table('journal_entries')
            ->whereIn('reference', [$receipt1->receipt_number, $receipt2->receipt_number])
            ->count();
        $this->assertEquals(0, $journalCount);
    }

    // ========================================================================
    // TEST 7 — Cancelled receipt does not affect inventory
    // ========================================================================

    /** @test */
    public function draft_grn_can_be_cancelled_without_inventory_effect()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(20, 10.00);

        $service = app(GoodsReceiptService::class);
        $service->cancelReceipt($receipt);

        $receipt = $receipt->fresh();
        $this->assertEquals('cancelled', $receipt->status);

        // Product quantity unchanged
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(0.0, (float) $product->quantity);

        // No inventory movements
        $movements = DB::table('inventory_movement_headers')
            ->where('voucher_num', $receipt->receipt_number)
            ->count();
        $this->assertEquals(0, $movements);

        // No journal entries
        $journals = DB::table('journal_entries')
            ->where('reference', $receipt->receipt_number)
            ->count();
        $this->assertEquals(0, $journals);
    }

    // ========================================================================
    // TEST 8 — Reversing an approved receipt restores everything exactly
    // ========================================================================

    /** @test */
    public function reversing_approved_receipt_restores_inventory_and_po()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(50, 10.00);

        $service = app(GoodsReceiptService::class);
        $service->approveReceipt($receipt);

        $reversed = $service->reverseReceipt($receipt->fresh());

        // Status is cancelled (enum-compatible terminal state).
        $this->assertSame('cancelled', $reversed->status);

        // Product quantity rolled back to zero.
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(0.0, (float) $product->quantity, 'Reversal must undo the derived quantity increment.');

        // WAC balance zeroed exactly.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->testProductId)
            ->where('warehouse_id', $this->testWarehouseId)
            ->first();
        $this->assertSame(0.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(0.0, (float) $balance->inventory_value, 0.000001);

        // One reversal ICT per original, each tied to its original.
        $originalTxIds = DB::table('inventory_cost_transactions')
            ->where('source_type', 'goods_receipt_detail')
            ->pluck('id');
        $reversals = DB::table('inventory_cost_transactions')
            ->where('source_type', 'goods_receipt_reversal')
            ->get();
        $this->assertCount(1, $reversals);
        $this->assertSame((int) $originalTxIds->first(), (int) $reversals->first()->reversal_of_id);
        $this->assertEquals(-50.0, (float) $reversals->first()->quantity_delta);

        // The movement is stamped for the stock card.
        $movement = DB::table('inventory_movement_headers')
            ->where('reference_type', 'goods_receipt')
            ->where('reference_id', $receipt->id)
            ->first();
        $this->assertStringContainsString('[REVERSED', (string) $movement->notes);

        // PO accumulation recomputed back to zero.
        $poItem = DB::table('purchase_order_items')
            ->where('purchase_order_id', $this->testPoId)
            ->first();
        $this->assertEquals(0.0, (float) $poItem->received_quantity);

        // Reversing again is idempotent (already stamped).
        $service->reverseReceipt($reversed->fresh());
        $this->assertSame(
            1,
            DB::table('inventory_cost_transactions')->where('source_type', 'goods_receipt_reversal')->count(),
            'Repeated reversal must not duplicate reversal ICTs.'
        );
    }

    /** @test */
    public function reverse_refuses_non_approved_receipts()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(10, 5.00);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Only approved receipts can be reversed.');

        app(GoodsReceiptService::class)->reverseReceipt($receipt);
    }

    /** @test */
    public function reverse_refuses_consumed_stock_and_rolls_back()
    {
        $this->actingAsTestUser();

        $receipt = $this->createGrn(25, 6.00);
        $service = app(GoodsReceiptService::class);
        $service->approveReceipt($receipt);

        // Consume part of the received stock through the adjustment engine.
        $adjustmentService = app(\App\Services\Inventory\StockAdjustmentService::class);
        $adjustmentService->createAdjustment([
            'warehouse_id' => $this->testWarehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'damage',
            'items' => [
                ['product_id' => $this->testProductId, 'unit_id' => $this->testUnitId, 'adjustment_quantity' => -10, 'unit_cost' => 0],
            ],
        ]);
        $adjustment = DB::table('stock_adjustments')->orderByDesc('id')->first();
        $adjustmentService->approveAdjustment((int) $adjustment->id);

        try {
            $service->reverseReceipt($receipt->fresh());
            $this->fail('Reversing a receipt whose stock was consumed must throw.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase('consumed', $e->getMessage());
        }

        // Whole reversal rolled back: receipt still approved, no reversal
        // ICTs, movement not stamped.
        $this->assertSame('approved', $receipt->fresh()->status);
        $this->assertSame(
            0,
            DB::table('inventory_cost_transactions')->where('source_type', 'goods_receipt_reversal')->count()
        );
        $movement = DB::table('inventory_movement_headers')
            ->where('reference_type', 'goods_receipt')
            ->where('reference_id', $receipt->id)
            ->first();
        $this->assertStringNotContainsString('[REVERSED', (string) $movement->notes);

        // Product quantity unchanged (25 received - 10 consumed).
        $product = DB::table('products')->where('id', $this->testProductId)->first();
        $this->assertEquals(15.0, (float) $product->quantity);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private function createGrn(float $quantity, float $unitCost): \App\Models\Vendor_Purchases\GoodsReceipt
    {
        $receiptNumber = 'GRN-' . now()->format('Ymd') . '-' . str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $totalValue = $quantity * $unitCost;

        $receiptId = DB::table('goods_receipts')->insertGetId([
            'receipt_number' => $receiptNumber,
            'order_id' => $this->testPoId,
            'warehouse_id' => $this->testWarehouseId,
            'receipt_date' => now()->toDateString(),
            'receipt_time' => now()->format('H:i:s'),
            'received_by' => $this->testUserId,
            'status' => 'draft',
            'quality_status' => 'pending',
            'receipt_type' => 'full',
            'total_items' => 1,
            'total_quantity' => $quantity,
            'total_value' => $totalValue,
            'company_id' => $this->testCompanyId,
            'created_by' => $this->testUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('goods_receipt_details')->insert([
            'receipt_id' => $receiptId,
            'product_id' => $this->testProductId,
            'unit_id' => $this->testUnitId,
            'quantity_received' => $quantity,
            'unit_cost' => $unitCost,
            'accepted_quantity' => $quantity,
            'rejected_quantity' => 0,
            'is_accepted' => true,
            'quality_status' => 'good',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return \App\Models\Vendor_Purchases\GoodsReceipt::find($receiptId);
    }

    private function actingAsTestUser(): void
    {
        $user = \App\Models\User::find($this->testUserId);

        // The default guard must be authenticated: CompanyContext (and thus
        // the WAC + unit-conversion engines) resolve the active company from
        // Auth::user(), not from the sanctum guard.
        $this->actingAs($user);
    }
}
