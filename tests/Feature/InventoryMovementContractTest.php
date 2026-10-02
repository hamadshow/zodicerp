<?php

namespace Tests\Feature;

use App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController;
use App\Models\Client_Sales\SalesInvoice;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Client_Sales\SalesReturnService;
use App\Services\Inventory\StockAdjustmentService;
use App\Services\Inventory\OpeningStockService;
use App\Services\Inventory\WeightedAverageCostService;
use App\Services\Vendor_Purchases\GoodsReceiptService;
use App\Services\Vendor_Purchases\PurchaseReturnService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 2 — Inventory Movement Engine Integrity.
 *
 * Every legitimate stock-changing flow must traverse the SAME chain:
 *
 *   business transaction -> inventory movement (IMH/IML, base units)
 *                        -> WAC delta (ICB/ICT)
 *                        -> products.quantity (derived)
 *                        -> journal where the confirmed policy requires it
 *
 * Sources of truth for the policy: docs/inventory/inventory-source-of-truth.md
 * (Phase 0 findings + confirmed decisions): GRN posts NO journal (invoice-driven
 * purchasing); Transfer posts NO journal and never changes products.quantity;
 * everything else posts where the code already posts today.
 */
class InventoryMovementContractTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $userId;

    protected int $branchId;

    protected int $warehouseId;

    protected int $productId;

    protected int $unitId;

    protected int $currencyId;

    protected int $supplierId;

    protected int $customerId;

    protected int $customerGroupId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'Contract Test Co',
            'company_code' => 'MCT',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'mct_'.$suffix,
            'fullname' => 'Movement Contract Tester',
            'email' => 'mct_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->branchId = DB::table('branches')->insertGetId([
            'branch_code' => 'MCT-BR-'.$suffix,
            'branch_name' => 'MCT Branch '.$suffix,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->warehouseId = Warehouses::query()->insertGetId([
            'warehouse_code' => 'MCT-WH-'.$suffix,
            'name' => 'MCT Warehouse '.$suffix,
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->unitId = ItemUnit::query()->insertGetId([
            'name' => 'MCT Base Unit '.$suffix,
            'unit_type' => 1,
            'conversion_factor' => 1,
            'active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->productId = Products::query()->insertGetId([
            'product_code' => 'MCT-PRD-'.$suffix,
            'name' => 'MCT Product '.$suffix,
            'slug' => 'mct-product-'.$suffix,
            'sku' => 'MCT-SKU-'.$suffix,
            'quantity' => 0,
            'unit_id' => $this->unitId,
            'cost_per_item' => 10,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->supplierId = DB::table('suppliers')->insertGetId([
            'supplier_code' => 'MCT-SUP-'.$suffix,
            'name_ar' => 'مورد MCT',
            'name_en' => 'MCT Supplier',
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->customerGroupId = DB::table('customer_groups')->insertGetId([
            'code' => 'MCTG-'.$suffix,
            'name_ar' => 'مجموعة MCT',
            'name_en' => 'MCT Group',
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->customerId = DB::table('customers')->insertGetId([
            'customer_code' => 'MCT-CUS-'.$suffix,
            'name_ar' => 'عميل MCT',
            'name_en' => 'MCT Customer',
            'customer_group_id' => $this->customerGroupId,
            'is_active' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->currencyId = DB::table('currencies')->insertGetId([
            'code' => 'MCT',
            'name' => 'Contract Currency',
            'symbol' => 'C',
            'decimal_places' => 2,
            'format' => 'L',
            'is_base' => 0,
            'status' => 'active',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->createContractAccounts();
    }

    /**
     * The journal resolvers match by exact code (11401) or AccCode prefix +
     * AccType=1. Seed minimal accounts so GL-integrated flows can post.
     */
    protected function createContractAccounts(): void
    {
        foreach ([['11401', 'Inventory Asset', 1], ['41000', 'Sales Revenue', 1], ['51000', 'Cost of Sales', 1], ['21100', 'Accounts Payable', 2], ['69999', 'Inventory Adjustment', 2], ['11120', 'Contract Treasury Bank', 1], ['1.2.100', 'Accounts Receivable', 1]] as [$code, $name, $type]) {
            DB::table('accounts')->insertOrIgnore([
                'AccCode' => $code,
                'AccName' => $name,
                'AccType' => $type,
                'AccFinal' => 1,
                'Nature' => $code === '11120' ? 'bank' : null,
                'company_id' => $this->companyId,
            ]);
        }
    }

    /* =====================================================================
     | FLOW 1 — GRN approval (base-unit contract + no journal, confirmed)
     ===================================================================== */

    /** @test */
    public function grn_approval_creates_movement_wac_and_quantity_in_base_units_without_journal()
    {
        $invoiceId = DB::table('purchase_invoices')->insertGetId([
            'invoice_number' => 'MCT-PI-'.uniqid(),
            'supplier_id' => $this->supplierId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'invoice_date' => now()->toDateString(),
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // GRN approval syncs PO received quantities via updatePurchaseOrderQuantities().
        $orderId = DB::table('purchase_orders')->insertGetId([
            'po_number' => 'MCT-PO-'.uniqid(),
            'po_date' => now()->toDateString(),
            'status' => 'approved',
            'currency_id' => $this->currencyId,
            'exchange_rate' => 1,
            'vendor_id' => $this->supplierId,
            'subtotal' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'shipping_charges' => 0,
            'other_charges' => 0,
            'grand_total' => 0,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('purchase_order_items')->insertGetId([
            'purchase_order_id' => $orderId,
            'line_number' => 1,
            'item_type' => 'product',
            'product_id' => $this->productId,
            'item_name_ar' => 'MCT PO Item',
            'ordered_quantity' => 10,
            'received_quantity' => 0,
            'unit_id' => $this->unitId,
            'unit_price' => 5,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $invoiceDetailId = DB::table('purchase_invoice_details')->insertGetId([
            'invoice_id' => $invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 10,
            'unit_id' => $this->unitId,
            'unit_price' => 5,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $receiptId = DB::table('goods_receipts')->insertGetId([
            'receipt_number' => 'MCT-GRN-'.uniqid(),
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'warehouse_id' => $this->warehouseId,
            'receipt_date' => now()->toDateString(),
            'receipt_time' => now()->format('H:i:s'),
            'received_by' => $this->userId,
            'status' => 'draft',
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('goods_receipt_details')->insert([
            'receipt_id' => $receiptId,
            'invoice_detail_id' => $invoiceDetailId,
            'product_id' => $this->productId,
            'quantity_received' => 10,
            'unit_id' => $this->unitId,
            'unit_cost' => 5,
            'is_accepted' => 1,
            'accepted_quantity' => 10,
            'rejected_quantity' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $receipt = \App\Models\Vendor_Purchases\GoodsReceipt::findOrFail($receiptId);
        app(GoodsReceiptService::class)->approveReceipt($receipt->fresh('details'));

        // Movement: one header per detail, type=purchase, base quantity.
        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'goods_receipt')
            ->where('reference_id', $receiptId)
            ->first();
        $this->assertNotNull($header, 'GRN must create an inventory movement header.');
        $this->assertSame('purchase', $header->type);
        $this->assertSame('in', $header->direction);
        $this->assertSame($this->companyId, (int) $header->company_id);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(10.0, (float) $line->quantity, 'Movement line must carry the BASE quantity.');
        $this->assertSame(10.0, (float) $line->original_quantity);

        // WAC: balance and transaction must exist with full provenance.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertNotNull($balance, 'GRN must seed inventory_cost_balances.');
        $this->assertSame(10.0, (float) $balance->quantity);
        $this->assertSame(50.0, (float) $balance->inventory_value);

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'goods_receipt_detail')
            ->where('source_id', DB::table('goods_receipt_details')->where('receipt_id', $receiptId)->value('id'))
            ->first();
        $this->assertNotNull($ict, 'GRN must write an inventory_cost_transaction.');
        $this->assertSame(10.0, (float) $ict->quantity_delta);
        $this->assertSame((int) $header->id, (int) $ict->movement_header_id, 'ICT must link to the movement header.');

        // Derived quantity.
        $this->assertSame(10.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // Confirmed policy: GRN posts NO journal (invoice-driven purchasing).
        $this->assertSame(
            0,
            DB::table('journal_entries')->where('reference', $receipt->receipt_number)->count(),
            'GRN must remain operational-only (no journal).'
        );
    }

    /* =====================================================================
     | FLOW 2 — Purchase Return (base-unit contract; previously RAW)
     ===================================================================== */

    /** @test */
    public function purchase_return_uses_base_quantity_across_movement_wac_and_products_quantity()
    {
        $this->seedStock(20, '4');

        $invoiceId = DB::table('purchase_invoices')->insertGetId([
            'invoice_number' => 'MCT-PI-RET-'.uniqid(),
            'supplier_id' => $this->supplierId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'invoice_date' => now()->toDateString(),
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $invoiceDetailId = DB::table('purchase_invoice_details')->insertGetId([
            'invoice_id' => $invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 20,
            'unit_id' => $this->unitId,
            'unit_price' => 4,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $return = app(PurchaseReturnService::class)->createPurchaseReturn([
            'invoice_id' => $invoiceId,
            'supplier_id' => $this->supplierId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'status' => 'approved',
            'items' => [
                [
                    'invoice_detail_id' => $invoiceDetailId,
                    'product_id' => $this->productId,
                    'unit_id' => $this->unitId,
                    'return_qty' => 6,
                ],
            ],
        ]);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'purchase_return')
            ->where('reference_id', $return->id)
            ->first();
        $this->assertNotNull($header, 'Purchase return must create a movement header.');
        $this->assertSame('out', $header->direction);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(6.0, (float) $line->quantity, 'Base-unit quantities must stay 1:1.');
        $this->assertNotNull($line->original_quantity);
        $this->assertNotNull($line->conversion_factor_snapshot);

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'purchase_return_detail')
            ->where('source_id', $return->details->first()->id)
            ->first();
        $this->assertNotNull($ict, 'Purchase return must write an ICT.');
        $this->assertSame(-6.0, (float) $ict->quantity_delta);
        $this->assertSame(4.0, (float) $ict->unit_cost, 'Outbound must cost at the current WAC.');

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(14.0, (float) $balance->quantity);

        $this->assertSame(14.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));
    }

    /* =====================================================================
     | FLOW 3 — Sales Invoice posting
     ===================================================================== */

    /** @test */
    public function sales_invoice_posting_creates_movement_wac_quantity_and_journal()
    {
        $this->seedStock(10, '6');

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => 'MCT-INV-'.uniqid(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'treasury_id' => DB::table('accounts')->where('Nature', 'bank')->value('AccID'),
            'invoice_date' => now()->toDateString(),
            'subtotal' => 36,
            'total_amount' => 36,
            'is_posted' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $detailId = DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 4,
            'unit_id' => $this->unitId,
            'unit_price' => 9,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Controller posting order: the journal step applies the WAC outbounds
        // (creating the ICTs), then the movement step reads them back.
        $invoice = SalesInvoice::findOrFail($invoiceId);
        $controller = new SalesInvoiceController;
        $this->invoke($controller, 'upsertJournalEntryForInvoice', [$invoice]);
        $this->invoke($controller, 'createStockMovementsForInvoice', [$invoice]);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $invoiceId)
            ->first();
        $this->assertNotNull($header, 'Sales invoice must create a movement header.');
        $this->assertSame('sale', $header->type);
        $this->assertSame('out', $header->direction);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(4.0, (float) $line->quantity);

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_detail')
            ->where('source_id', $detailId)
            ->first();
        $this->assertNotNull($ict, 'Sales invoice must write an ICT.');
        $this->assertSame(-4.0, (float) $ict->quantity_delta);
        $this->assertSame(6.0, (float) $ict->unit_cost, 'COGS must use the seeded WAC cost.');

        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertSame(6.0, (float) $balance->quantity);

        $this->assertSame(6.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        $this->assertSame(
            1,
            DB::table('journal_entries')->where('entry_type', 'SalesInvoice')->where('reference', DB::table('sales_invoices')->where('id', $invoiceId)->value('invoice_number'))->count(),
            'Sales invoice must post its journal (perpetual COGS).'
        );
    }

    /* =====================================================================
     | FLOW 4 — Sales Return approval
     ===================================================================== */

    /** @test */
    public function sales_return_restores_movement_wac_quantity_and_reverses_cogs()
    {
        // Seed stock AND a posted sale so the return can locate the original
        // sales_invoice_detail cost transaction.
        $this->seedStock(10, '5');

        $invoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => 'MCT-INV-SR-'.uniqid(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'treasury_id' => DB::table('accounts')->where('Nature', 'bank')->value('AccID'),
            'invoice_date' => now()->toDateString(),
            'subtotal' => 32,
            'total_amount' => 32,
            'is_posted' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $detailId = DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $invoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 4,
            'unit_id' => $this->unitId,
            'unit_price' => 8,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $invoice = SalesInvoice::findOrFail($invoiceId);
        $controller = new SalesInvoiceController;
        $this->invoke($controller, 'upsertJournalEntryForInvoice', [$invoice]);
        $this->invoke($controller, 'createStockMovementsForInvoice', [$invoice]);

        $return = app(SalesReturnService::class)->createSalesReturn([
            'invoice_id' => $invoiceId,
            'customer_id' => $this->customerId,
            'warehouse_id' => $this->warehouseId,
            'return_date' => now()->toDateString(),
            'status' => 'approved',
            'items' => [
                [
                    'invoice_detail_id' => $detailId,
                    'product_id' => $this->productId,
                    'unit_id' => $this->unitId,
                    'quantity' => 2,
                ],
            ],
        ]);

        $header = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_return')
            ->where('reference_id', $return->id)
            ->first();
        $this->assertNotNull($header, 'Sales return must create a movement header.');
        $this->assertSame('in', $header->direction);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(2.0, (float) $line->quantity);
        $this->assertSame(5.0, (float) $line->cost_price, 'Return line must carry the ORIGINAL sale unit cost.');

        $ict = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_return_detail')
            ->where('source_id', $return->details->first()->id)
            ->first();
        $this->assertNotNull($ict, 'Sales return must write an ICT.');
        $this->assertSame(2.0, (float) $ict->quantity_delta);
        $this->assertSame(5.0, (float) $ict->unit_cost);

        $this->assertSame(8.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        $this->assertGreaterThan(
            0,
            DB::table('journal_entries')->where('entry_type', 'SalesReturn')->where('reference', $return->return_number)->count(),
            'Sales return must post its COGS-reversal journal.'
        );
    }

    /* =====================================================================
     | FLOW 5 — Stock Transfer (no journal, no global quantity change)
     ===================================================================== */

    /** @test */
    public function stock_transfer_moves_wac_between_warehouses_without_touching_global_quantity_or_journal()
    {
        $suffix = uniqid();
        $warehouseB = Warehouses::query()->insertGetId([
            'warehouse_code' => 'MCT-WHB-'.$suffix,
            'name' => 'MCT Warehouse B '.$suffix,
            'branch_id' => $this->branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->seedStock(20, '3', $this->warehouseId);

        $response = $this->actingAs(User::find($this->userId))
            ->post(route('admin.inventory.stock-transfers.store', ['country' => 'sa', 'lang' => 'ar']), [
                'movement_date' => now()->toDateString(),
                'from_warehouse_id' => $this->warehouseId,
                'to_warehouse_id' => $warehouseB,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 7],
                ],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $source = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer')
            ->where('warehouse_id', $this->warehouseId)
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($source, 'Transfer must create the OUT movement.');

        $destination = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_transfer_destination')
            ->where('reference_id', $source->id)
            ->first();
        $this->assertNotNull($destination, 'Transfer must create the IN movement.');
        $this->assertSame('in', $destination->direction);

        $sourceLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $source->id)->first();
        $destinationLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $destination->id)->first();
        $this->assertSame(7.0, (float) $sourceLine->quantity);
        $this->assertSame(7.0, (float) $destinationLine->quantity);
        $this->assertSame(
            (float) $sourceLine->cost_price,
            (float) $destinationLine->cost_price,
            'Transfer must carry the OUT unit cost to the IN side (no gain/loss).'
        );

        $sourceBalance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $this->warehouseId)->first();
        $targetBalance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)->where('warehouse_id', $warehouseB)->first();
        $this->assertSame(13.0, (float) $sourceBalance->quantity);
        $this->assertSame(7.0, (float) $targetBalance->quantity);
        $this->assertEqualsWithDelta(
            (float) $sourceBalance->average_cost,
            (float) $targetBalance->average_cost,
            0.000001,
            'Cost must transfer at the source WAC.'
        );

        $this->assertSame(
            20.0,
            (float) DB::table('products')->where('id', $this->productId)->value('quantity'),
            'Transfer must NOT change global products.quantity.'
        );

        $voucher = $source->voucher_num;
        $this->assertSame(
            0,
            DB::table('journal_entries')->where('reference', 'like', '%'.$voucher.'%')->count(),
            'Transfer must not post any journal.'
        );
    }

    /* =====================================================================
     | FLOW 6 — Stock Adjustment (D2 ratified: WAC-engine routed)
     ===================================================================== */

    /** @test */
    public function stock_adjustment_routes_through_wac_with_per_direction_headers()
    {
        $service = app(StockAdjustmentService::class);

        // Ratified decision D2: positives apply inbound at the ENTERED unit
        // cost; negatives consume at the CURRENT WAC. Seed stock so the
        // write-off has a price to consume.
        $opening = app(OpeningStockService::class)->create([
            'warehouse_id' => $this->warehouseId,
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 10, 'cost_price' => 4],
            ],
        ]);

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'count',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => 5, 'unit_cost' => 2],
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -3, 'unit_cost' => 0],
            ],
        ]);
        $service->approveAdjustment((int) $adjustment->id);

        // D3-era shape: one movement header PER DIRECTION (in + out).
        $headers = DB::table('inventory_movement_headers')
            ->where('reference_type', 'stock_adjustment')
            ->where('reference_id', $adjustment->id)
            ->get();
        $this->assertCount(2, $headers, 'Approval must create one movement header per direction.');
        $this->assertEqualsCanonicalizing(['in', 'out'], $headers->pluck('direction')->all());

        foreach ($headers->pluck('id') as $headerId) {
            $this->assertSame('adjustment', DB::table('inventory_movement_headers')->where('id', $headerId)->value('type'));
        }

        $inLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $headers->firstWhere('direction', 'in')->id)->first();
        $outLine = DB::table('inventory_movement_lines')->where('stock_movement_id', $headers->firstWhere('direction', 'out')->id)->first();

        $this->assertSame(5.0, (float) $inLine->quantity);
        $this->assertSame(5.0, (float) $inLine->original_quantity);
        $this->assertSame(2.0, (float) $inLine->cost_price, 'Positive adjustment must land at the ENTERED unit cost.');

        $this->assertSame(3.0, (float) $outLine->quantity);
        // Positives apply BEFORE negatives: 10@4 + 5@2 = 15 @ 3.333333, then
        // the write-off prices at that post-inbound WAC (never the entered
        // negative-side cost).
        $this->assertEqualsWithDelta(3.3333, (float) $outLine->cost_price, 0.001, 'Negative adjustment must price at the CURRENT (post-inbound) WAC.');

        // WAC ledger: one ICT per applied item, source_type
        // 'stock_adjustment_line', attached to its direction's movement
        // header. Outbound ICTs store NEGATIVE deltas with a POSITIVE unit
        // cost (= the applied WAC).
        $txs = DB::table('inventory_cost_transactions')
            ->where('source_type', 'stock_adjustment_line')
            ->whereIn('movement_header_id', $headers->pluck('id'))
            ->where('company_id', $this->companyId)
            ->get();
        $this->assertCount(2, $txs, 'Each applied item must produce one stock_adjustment_line ICT.');
        $inTx = $txs->firstWhere('movement_header_id', $headers->firstWhere('direction', 'in')->id);
        $outTx = $txs->firstWhere('movement_header_id', $headers->firstWhere('direction', 'out')->id);

        $this->assertSame(5.0, (float) $inTx->quantity_delta);
        $this->assertEqualsWithDelta(10.0, (float) $inTx->value_delta, 0.0001);
        $this->assertSame(2.0, (float) $inTx->unit_cost);

        $this->assertSame(-3.0, (float) $outTx->quantity_delta);
        $this->assertEqualsWithDelta(-10.0, (float) $outTx->value_delta, 0.001);
        $this->assertEqualsWithDelta(3.333333, (float) $outTx->unit_cost, 0.0001);

        // Derived quantity: 10 + 5 - 3 = 12 (D3 contract unchanged).
        $this->assertSame(12.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        $this->assertGreaterThan(
            0,
            DB::table('journal_entries')->where('entry_type', 'StockAdjustment')->where('reference', $adjustment->adjustment_number)->count(),
            'Adjustment must post its gain/loss journal.'
        );
    }

    /** @test */
    public function stock_adjustment_refuses_insufficient_stock_and_rolls_back_completely()
    {
        $service = app(StockAdjustmentService::class);

        $adjustment = $service->createAdjustment([
            'warehouse_id' => $this->warehouseId,
            'adjustment_date' => now()->toDateString(),
            'reason' => 'damage',
            'items' => [
                ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'adjustment_quantity' => -1, 'unit_cost' => 0],
            ],
        ]);

        try {
            $service->approveAdjustment((int) $adjustment->id);
            $this->fail('Approval with insufficient stock must throw.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsStringIgnoringCase(
                'Insufficient weighted-average inventory',
                $e->getMessage()
            );
        }

        $this->assertSame(
            'draft',
            DB::table('stock_adjustments')->where('id', $adjustment->id)->value('status'),
            'Whole approval must roll back — document stays draft.'
        );
        $this->assertSame(
            0,
            DB::table('inventory_cost_transactions')->where('source_type', 'stock_adjustment_line')->count(),
            'No ICT may survive a rolled-back approval.'
        );
        $this->assertSame(
            0,
            DB::table('inventory_movement_headers')->where('reference_type', 'stock_adjustment')->where('reference_id', $adjustment->id)->count(),
            'No movement may survive a rolled-back approval.'
        );
        $this->assertSame(
            0.0,
            (float) DB::table('products')->where('id', $this->productId)->value('quantity'),
            'Derived quantity must roll back.'
        );
    }

    /* =====================================================================
     | FLOW 7 — Opening Stock (documented exception: no conversion, no WAC)
     ===================================================================== */

    /** @test */
    public function opening_stock_creates_movement_and_quantity_without_wac_or_conversion()
    {
        $response = $this->actingAs(User::find($this->userId))
            ->post(route('admin.inventory.opening-stock.store', ['country' => 'sa', 'lang' => 'ar']), [
                'movement_date' => now()->toDateString(),
                'warehouse_id' => $this->warehouseId,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => 12, 'cost_price' => 4],
                ],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $header = DB::table('inventory_movement_headers')
            ->where('type', 'opening')
            ->where('reference_type', 'opening')
            ->where('warehouse_id', $this->warehouseId)
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($header, 'Opening stock must create a movement header.');
        $this->assertSame($this->companyId, (int) $header->company_id);
        $this->assertNotNull($header->movement_date, 'Opening stock must store its movement date.');

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $header->id)->first();
        $this->assertSame(12.0, (float) $line->quantity);
        $this->assertSame(4.0, (float) $line->cost_price);

        $this->assertSame(12.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // D1 (ratified, implemented in Phase 3): opening stock seeds WAC at
        // the entered cost through the standard cost engine.
        $balance = DB::table('inventory_cost_balances')
            ->where('product_id', $this->productId)
            ->where('warehouse_id', $this->warehouseId)
            ->first();
        $this->assertNotNull($balance, 'Opening stock must seed WAC (D1).');
        $this->assertSame(12.0, (float) $balance->quantity);
        $this->assertEqualsWithDelta(48.0, (float) $balance->inventory_value, 0.000001);

        $this->assertSame(
            1,
            DB::table('inventory_cost_transactions')
                ->where('source_type', 'opening_stock_line')
                ->where('movement_header_id', $header->id)
                ->count(),
            'Opening stock must write one movement-linked ICT per line.'
        );
    }

    /* =====================================================================
     | Cross-flow invariants
     ===================================================================== */

    /**
     * VERIFIED DEVIATION (Phase 2, documented in the source-of-truth doc):
     * in the Sales flow the WAC outbound (and thus the ICT) is written by the
     * JOURNAL step, before any movement exists, so an ICT can never carry
     * movement_header_id/movement_line_id. Sales provenance is the shared
     * source id (sales_invoice_detail) on the ICT plus the invoice-referenced
     * movement header. GRN and Purchase Return DO link ICT -> movement
     * directly (asserted in their flow tests above).
     */
    public function sales_cost_transactions_are_traceable_to_their_source_detail()
    {
        $this->seedStock(20, '8');

        $salesInvoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => 'MCT-INV-PROV-'.uniqid(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'treasury_id' => DB::table('accounts')->where('Nature', 'bank')->value('AccID'),
            'invoice_date' => now()->toDateString(),
            'subtotal' => 60,
            'total_amount' => 60,
            'is_posted' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $detailId = DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $salesInvoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 5,
            'unit_id' => $this->unitId,
            'unit_price' => 12,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $invoice = SalesInvoice::findOrFail($salesInvoiceId);
        $this->invoke(new SalesInvoiceController, 'upsertJournalEntryForInvoice', [$invoice]);
        $this->invoke(new SalesInvoiceController, 'createStockMovementsForInvoice', [$invoice]);

        // Provenance contract for the sales flow: exactly one ICT per invoice
        // detail, keyed by the shared source id.
        $icts = DB::table('inventory_cost_transactions')
            ->where('source_type', 'sales_invoice_detail')
            ->where('source_id', $detailId)
            ->get();
        $this->assertCount(1, $icts, 'Sales ICT provenance is the sales_invoice_detail source id.');
        $this->assertSame(-5.0, (float) $icts->first()->quantity_delta);

        // And the movement side is traceable back through the invoice header.
        $movementExists = DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->where('reference_id', $salesInvoiceId)
            ->exists();
        $this->assertTrue($movementExists);
    }

    /** @test */
    public function quantity_snapshot_reconciles_with_movement_ledger_after_each_flow()
    {
        // opening +12, sale -5 => products.quantity must equal ledger sum.
        $this->opening(12);
        $this->assertSame(12.0, (float) DB::table('products')->where('id', $this->productId)->value('quantity'));

        // The WAC seed is a cost-layer fixture, not a ledger flow (no movement
        // line) — subtract its quantity contribution when reconciling.
        $seedQuantity = 10;
        $this->seedStock($seedQuantity, '4');
        $salesInvoiceId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => 'MCT-INV-RECON-'.uniqid(),
            'customer_id' => $this->customerId,
            'currency_id' => $this->currencyId,
            'warehouse_id' => $this->warehouseId,
            'treasury_id' => DB::table('accounts')->where('Nature', 'bank')->value('AccID'),
            'invoice_date' => now()->toDateString(),
            'subtotal' => 45,
            'total_amount' => 45,
            'is_posted' => 1,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $salesInvoiceId,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'quantity' => 5,
            'unit_id' => $this->unitId,
            'unit_price' => 9,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $invoice = SalesInvoice::findOrFail($salesInvoiceId);
        $this->invoke(new SalesInvoiceController, 'upsertJournalEntryForInvoice', [$invoice]);
        $this->invoke(new SalesInvoiceController, 'createStockMovementsForInvoice', [$invoice]);

        $ledgerQty = DB::table('inventory_movement_headers as h')
            ->join('inventory_movement_lines as l', 'l.stock_movement_id', '=', 'h.id')
            ->where('l.product_id', $this->productId)
            ->where('h.company_id', $this->companyId)
            ->selectRaw("SUM(CASE WHEN h.direction = 'in' THEN l.quantity ELSE -l.quantity END) as qty")
            ->value('qty');

        $this->assertEqualsWithDelta(
            (float) $ledgerQty,
            (float) DB::table('products')->where('id', $this->productId)->value('quantity') - $seedQuantity,
            0.000001,
            'products.quantity must reconcile with the movement ledger.'
        );
    }

    /* =====================================================================
     | Helpers
     ===================================================================== */

    protected function seedStock(float $quantity, string $unitCost, ?int $warehouseId = null): int
    {
        $tx = app(WeightedAverageCostService::class)->applyInbound(
            $this->productId,
            $warehouseId ?? $this->warehouseId,
            (string) $quantity,
            $unitCost,
            'movement_contract_seed',
            (int) (microtime(true) * 1000000),
            now()->toDateString(),
        );

        // Mirror the GRN quantity side-effect the same way the real flow does
        // (WAC engine intentionally does not touch products.quantity).
        DB::table('products')->where('id', $this->productId)->increment('quantity', $quantity);

        return $tx->id;
    }

    protected function opening(float $quantity): void
    {
        $this->actingAs(User::find($this->userId))
            ->post(route('admin.inventory.opening-stock.store', ['country' => 'sa', 'lang' => 'ar']), [
                'movement_date' => now()->toDateString(),
                'warehouse_id' => $this->warehouseId,
                'items' => [
                    ['product_id' => $this->productId, 'unit_id' => $this->unitId, 'quantity' => $quantity, 'cost_price' => 4],
                ],
            ])->assertSessionHas('success');
    }

    protected function invoke(object $target, string $method, array $args = []): mixed
    {
        $reflection = new \ReflectionMethod($target, $method);
        $reflection->setAccessible(true);

        return $reflection->invokeArgs($target, $args);
    }
}
