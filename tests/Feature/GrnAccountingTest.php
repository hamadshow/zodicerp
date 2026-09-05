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

        // Create test user
        $email = 'grn-test-' . uniqid() . '@zodicerp-test.com';
        $this->testUserId = DB::table('users')->insertGetId([
            'username' => 'grn-tester',
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
        // Clean up GRN test data
        $grnIds = DB::table('goods_receipts')
            ->where('receipt_number', 'like', 'GRN-%')
            ->pluck('id');
        if ($grnIds->isNotEmpty()) {
            DB::table('goods_receipt_details')->whereIn('receipt_id', $grnIds)->delete();
            DB::table('goods_receipts')->whereIn('id', $grnIds)->delete();
        }

        // Clean up inventory movements for test product
        $movementHeaders = DB::table('inventory_movement_lines')
            ->where('product_id', $this->testProductId)
            ->pluck('stock_movement_id');
        if ($movementHeaders->isNotEmpty()) {
            DB::table('inventory_movement_lines')->whereIn('stock_movement_id', $movementHeaders)->delete();
            DB::table('inventory_movement_headers')->whereIn('id', $movementHeaders)->delete();
        }

        // Clean up PO items and PO
        if ($this->testPoId) {
            DB::table('purchase_order_items')->where('purchase_order_id', $this->testPoId)->delete();
            DB::table('purchase_orders')->where('id', $this->testPoId)->delete();
        }

        // Clean up product
        if ($this->testProductId) {
            DB::table('products')->where('id', $this->testProductId)->delete();
        }

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
        $this->actingAs($user, 'sanctum');
    }
}
