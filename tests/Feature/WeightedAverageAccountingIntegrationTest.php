<?php

namespace Tests\Feature;

use App\Models\Client_Sales\SalesInvoice;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Release-gate accounting verification for the Weighted Average engine.
 *
 * Every scenario drives the real application services (WA service, the Sales
 * Invoice journal path, SalesReturnService, PurchaseReturnService). Journal
 * assertions resolve accounts by AccCode (11401 / 501 / 401 / 2111), never by
 * hard-coded AccID. No journal is inserted directly with SQL.
 */
class WeightedAverageAccountingIntegrationTest extends TestCase
{
    protected int $companyId = 1;
    protected int $userId;

    private array $productIds = [];
    private array $warehouseIds = [];
    private array $customerIds = [];
    private array $invoiceNumbers = [];
    private array $returnNumbers = [];
    private array $supplierIds = [];
    private array $branchIds = [];
    private array $purchaseInvoiceIds = [];
    private array $purchaseReturnIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }
        $this->userId = (int) DB::table('users')->first()->id;
        $this->actingAs(\App\Models\User::find($this->userId));
    }

    protected function tearDown(): void
    {
        try {
            if (! empty($this->invoiceNumbers)) {
                $ids = DB::table('sales_invoices')->whereIn('invoice_number', $this->invoiceNumbers)->pluck('id');
                DB::table('sales_invoice_details')->whereIn('invoice_id', $ids)->delete();
                DB::table('sales_invoices')->whereIn('id', $ids)->delete();
            }
            if (! empty($this->returnNumbers)) {
                $ids = DB::table('sales_returns')->whereIn('return_number', $this->returnNumbers)->pluck('id');
                DB::table('sales_return_details')->whereIn('return_id', $ids)->delete();
                DB::table('sales_returns')->whereIn('id', $ids)->delete();
            }
            if (! empty($this->purchaseReturnIds)) {
                DB::table('purchase_return_details')->whereIn('return_id', $this->purchaseReturnIds)->delete();
                DB::table('purchase_returns')->whereIn('id', $this->purchaseReturnIds)->delete();
            }
            if (! empty($this->purchaseInvoiceIds)) {
                DB::table('purchase_invoice_details')->whereIn('invoice_id', $this->purchaseInvoiceIds)->delete();
                DB::table('purchase_invoices')->whereIn('id', $this->purchaseInvoiceIds)->delete();
            }
            foreach ($this->productIds as $pid) {
                DB::table('inventory_cost_transactions')->where('product_id', $pid)->delete();
                DB::table('inventory_cost_balances')->where('product_id', $pid)->delete();
                DB::table('inventory_movement_lines')->where('product_id', $pid)->delete();
                DB::table('products')->where('id', $pid)->delete();
            }
            foreach ($this->warehouseIds as $wid) {
                // Movement headers (and any orphaned lines) created for this fixture warehouse.
                $headerIds = DB::table('inventory_movement_headers')->where('warehouse_id', $wid)->pluck('id');
                DB::table('inventory_movement_lines')->whereIn('stock_movement_id', $headerIds)->delete();
                DB::table('inventory_movement_headers')->whereIn('id', $headerIds)->delete();
            }
            foreach ($this->warehouseIds as $wid) {
                DB::table('warehouses')->where('id', $wid)->delete();
            }
            foreach ($this->branchIds as $bid) {
                DB::table('branches')->where('id', $bid)->delete();
            }
            foreach ($this->customerIds as $cid) {
                DB::table('customers')->where('id', $cid)->delete();
            }
            foreach ($this->supplierIds as $sid) {
                DB::table('suppliers')->where('id', $sid)->delete();
            }
            DB::table('supplier_groups')->where('code', 'WA-ACCT-GRP')->delete();
        } catch (\Throwable $e) {
            // best-effort cleanup
        }
        parent::tearDown();
    }

    private function createWarehouse(): int
    {
        $branchId = DB::table('branches')->insertGetId([
            'company_id' => $this->companyId,
            'branch_code' => 'WA-ACCT-BR-'.uniqid(),
            'branch_name' => 'WA Acct Branch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->branchIds[] = $branchId;
        $wid = DB::table('warehouses')->insertGetId([
            'warehouse_code' => 'WA-ACCT-WH-'.uniqid(),
            'name' => 'WA Acct Warehouse '.uniqid(),
            'branch_id' => $branchId,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->warehouseIds[] = $wid;

        return $wid;
    }

    private function createProduct(string $suffix): int
    {
        $pid = DB::table('products')->insertGetId([
            'product_code' => 'WA-ACCT-'.$suffix.'-'.substr(uniqid(), -6),
            'name' => 'WA Acct '.$suffix,
            'slug' => 'wa-acct-'.$suffix.'-'.uniqid(),
            'sku' => 'WA-ACCT-'.substr(uniqid(), -6),
            'quantity' => 0,
            'cost_per_item' => 999, // intentionally NOT the WA cost — engine must be authoritative
            'status' => 'active',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->productIds[] = $pid;

        return (int) $pid;
    }

    private function createCustomer(): int
    {
        $cid = DB::table('customers')->insertGetId([
            'customer_code' => 'WA-ACCT-CUST-'.uniqid(),
            'name_ar' => 'عميل حسابي',
            'name_en' => 'WA Accounting Customer',
            'customer_group_id' => DB::table('customer_groups')->first()->id ?? 1,
            'account_id' => DB::table('accounts')->where('AccCode', 1200)->value('AccID'),
            'is_active' => true,
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->customerIds[] = $cid;

        return (int) $cid;
    }

    private function unitId(): int
    {
        $existing = DB::table('item_units')->where('unit_type', 1)->value('id');
        if ($existing) {
            return (int) $existing;
        }
        return (int) DB::table('item_units')->insertGetId([
            'name' => 'WA Unit', 'unit_type' => 1, 'conversion_factor' => 1, 'active' => true,
            'created_by' => $this->userId, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function accId(int $code): int
    {
        return (int) DB::table('accounts')->where('AccCode', $code)->value('AccID');
    }

    private function makeSalesInvoice(string $number, int $customerId, int $warehouseId, int $productId, int $unitId, float $qty, float $price): array
    {
        $invId = DB::table('sales_invoices')->insertGetId([
            'invoice_number' => $number,
            'invoice_date' => now()->toDateString(),
            'customer_id' => $customerId,
            'currency_id' => 1,
            'exchange_rate' => 1,
            'invoice_type' => 'standard',
            'payment_status' => 'unpaid',
            'treasury_id' => DB::table('accounts')->where('Nature', 'bank')->value('AccID'),
            'warehouse_id' => $warehouseId,
            'total_amount' => $qty * $price,
            'subtotal' => $qty * $price,
            'is_posted' => true,
            'created_by' => $this->userId,
            'company_id' => $this->companyId,
        ]);
        $detailId = DB::table('sales_invoice_details')->insertGetId([
            'invoice_id' => $invId,
            'product_id' => $productId,
            'quantity' => $qty,
            'unit_id' => $unitId,
            'unit_price' => $price,
            'warehouse_id' => $warehouseId,
        ]);
        $this->postSalesInvoiceJournal(SalesInvoice::find($invId));

        return ['invoice_id' => (int) $invId, 'detail_id' => (int) $detailId];
    }

    private function invoker(string $class, string $method, array $params): mixed
    {
        $service = app($class);
        $ref = new \ReflectionMethod($service, $method);
        $ref->setAccessible(true);

        return $ref->invoke($service, ...$params);
    }

    private function line(string $entryCode, int $accountCode, string $side): ?float
    {
        $val = DB::table('journal_entry_lines')
            ->where('journal_entry_code', $entryCode)
            ->where('account_id', $this->accId($accountCode))
            ->value($side === 'debit' ? 'debit' : 'credit');

        return $val === null ? null : (float) $val;
    }

    // =====================================================================
    // Test 1 — Sales COGS = 20 × WA(100) = 2000 ; Dr 501 / Cr 11401
    // =====================================================================

    public function test_sales_cogs_uses_weighted_average_cost(): void
    {
        $productId = $this->createProduct('COGS');
        $wh = $this->createWarehouse();
        $customer = $this->createCustomer();
        $unit = $this->unitId();
        $this->seedInventory($productId, $wh, '30', '100'); // WA = 100

        $num = 'WA-COGS-'.uniqid();
        $this->invoiceNumbers[] = $num;
        $sale = $this->makeSalesInvoice($num, $customer, $wh, $productId, $unit, 20, 200); // sells 20

        // WA transaction must value the sale at 20 × 100 = 2000
        $waTxn = DB::table('inventory_cost_transactions')
            ->where('product_id', $productId)
            ->where('source_type', 'sales_invoice_detail')
            ->where('source_id', $sale['detail_id'])
            ->first();
        $this->assertNotNull($waTxn, 'Sale must produce a WA outbound transaction.');
        $this->assertEqualsWithDelta(-2000.0, (float) $waTxn->value_delta, 0.01, 'COGS from WA = 20 × 100');

        $journal = DB::table('journal_entries')->where('reference', $num)->where('entry_type', 'SalesInvoice')->first();
        $this->assertNotNull($journal);
        $this->assertEqualsWithDelta(2000.0, $this->line($journal->entry_code, 501, 'debit'), 0.01, 'Dr 501 COGS = 2000');
        $this->assertEqualsWithDelta(2000.0, $this->line($journal->entry_code, 11401, 'credit'), 0.01, 'Cr 11401 Inventory = 2000');

        $balance = json_decode($this->balanceJson($productId, $wh), true);
        $this->assertEqualsWithDelta(10.0, $balance['quantity'], 0.01);
        $this->assertEqualsWithDelta(1000.0, $balance['inventory_value'], 0.01);

        // Balanced journal
        $dr = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('debit');
        $cr = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('credit');
        $this->assertEqualsWithDelta($cr, $dr, 0.01, 'Journal must balance');
    }

    // =====================================================================
    // Test 2 — Sales Return restores inventory at the ORIGINAL sale WA cost,
    // NOT the current products.cost_per_item.
    // =====================================================================

    public function test_sales_return_restores_inventory_at_original_sale_wa_cost(): void
    {
        $productId = $this->createProduct('RET');
        $wh = $this->createWarehouse();
        $customer = $this->createCustomer();
        $unit = $this->unitId();
        $this->seedInventory($productId, $wh, '10', '100'); // WA = 100

        $saleNum = 'WA-RET-SALE-'.uniqid();
        $this->invoiceNumbers[] = $saleNum;
        $sale = $this->makeSalesInvoice($saleNum, $customer, $wh, $productId, $unit, 5, 150); // sells 5 @ WA 100

        // Drift the current product cost far away from the historical WA cost.
        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 999]);

        $retNum = 'WA-RET-'.uniqid();
        $this->returnNumbers[] = $retNum;

        // Drive the REAL public Sales Return workflow (validates against the
        // original invoice, posts the reversal journal AND restores stock).
        $service = app(\App\Services\Client_Sales\SalesReturnService::class);
        $salesReturn = $service->createSalesReturn([
            'invoice_id' => $sale['invoice_id'],
            'customer_id' => $customer,
            'warehouse_id' => $wh,
            'return_date' => now()->toDateString(),
            'return_reason' => 'damaged',
            'return_type' => 'partial_return',
            'restocking_fee' => 0,
            'status' => 'approved',
            'refund_status' => 'pending',
            'return_number' => $retNum,
            'items' => [
                ['invoice_detail_id' => $sale['detail_id'], 'product_id' => $productId, 'quantity' => 5, 'return_qty' => 5, 'unit_id' => $unit],
            ],
        ]);
        $this->assertNotNull($salesReturn->id);

        // Inventory restored at ORIGINAL sale WA cost: 5 × 100 = 500
        $journal = DB::table('journal_entries')->where('reference', $retNum)->where('entry_type', 'SalesReturn')->first();
        $this->assertNotNull($journal, 'Return journal must exist');
        $this->assertEqualsWithDelta(500.0, $this->line($journal->entry_code, 11401, 'debit'), 0.01, 'Inventory restored = 5 × original WA 100 = 500');
        $this->assertEqualsWithDelta(500.0, $this->line($journal->entry_code, 501, 'credit'), 0.01, 'COGS reversed = 500');

        // WA balance back to the pre-sale state for the returned units.
        $balance = json_decode($this->balanceJson($productId, $wh), true);
        $this->assertEqualsWithDelta(10.0, $balance['quantity'], 0.01);
        $this->assertEqualsWithDelta(1000.0, $balance['inventory_value'], 0.01);

        // products.cost_per_item is 999 — the restoration used the historical
        // WA cost (100), never the drifted current product cost.
    }

    // =====================================================================
    // Test 3 — Purchase Return at current WA = 115: inventory −1150 and
    // journal Cr 11401 = 1150 through the real PurchaseReturnService flow.
    // =====================================================================

    public function test_purchase_return_credits_inventory_asset_at_current_wa(): void
    {
        $productId = $this->createProduct('PRET');
        $wh = $this->createWarehouse();
        $unit = $this->unitId();
        $this->seedInventory($productId, $wh, '30', '115'); // WA = 115 → V = 3450

        // Supplier (AP) master data
        $apAccountId = $this->accId(2111);
        $groupId = DB::table('supplier_groups')->insertGetId([
            'code' => 'WA-ACCT-GRP', 'name_ar' => 'WA Acct Group', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $supplierId = DB::table('suppliers')->insertGetId([
            'supplier_code' => 'WA-ACCT-SUP-'.uniqid(),
            'name_ar' => 'مورد محاسبي',
            'supplier_group_id' => $groupId,
            'password' => bcrypt('password'),
            'account_id' => $apAccountId,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->supplierIds[] = $supplierId;

        // Purchase invoice for 10 units @ 115 (the current WA unit cost)
        $invNum = 'WA-PINV-'.uniqid();
        $invId = DB::table('purchase_invoices')->insertGetId([
            'invoice_number' => $invNum,
            'supplier_id' => $supplierId,
            'currency_id' => 1,
            'invoice_date' => now()->toDateString(),
            'warehouse_id' => $wh,
            'company_id' => $this->companyId,
            'created_by' => $this->userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->purchaseInvoiceIds[] = (int) $invId;
        $detailId = DB::table('purchase_invoice_details')->insertGetId([
            'invoice_id' => $invId,
            'product_id' => $productId,
            'warehouse_id' => $wh,
            'unit_id' => $unit,
            'quantity' => 10,
            'unit_price' => 115.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(\App\Services\Vendor_Purchases\PurchaseReturnService::class);
        $return = $service->createPurchaseReturn([
            'invoice_id' => $invId,
            'supplier_id' => $supplierId,
            'warehouse_id' => $wh,
            'return_date' => now()->toDateString(),
            'return_reason' => 'excess_quantity',
            'return_type' => 'partial_return',
            'restocking_fee' => 0,
            'status' => 'approved',
            'refund_status' => 'pending',
            'items' => [
                ['invoice_detail_id' => $detailId, 'product_id' => $productId, 'quantity' => 10, 'return_qty' => 10, 'unit_id' => $unit],
            ],
        ]);

        // Real flow → return document persisted
        $this->assertNotNull($return->id);
        $this->purchaseReturnIds[] = (int) $return->id;
        $this->assertSame('approved', $return->status);

        // WA balance: 30 → 20 units, 3450 → 2300 (10 × 115 out)
        $balance = json_decode($this->balanceJson($productId, $wh), true);
        $this->assertEqualsWithDelta(20.0, $balance['quantity'], 0.01);
        $this->assertEqualsWithDelta(2300.0, $balance['inventory_value'], 0.01);

        // Journal: Dr AP 2111 1150 ; Cr Inventory 11401 1150
        $journal = DB::table('journal_entries')
            ->where('reference', $return->return_number)
            ->where('entry_type', 'PurchaseReturn')
            ->first();
        $this->assertNotNull($journal, 'Purchase Return journal must exist');
        $this->assertEqualsWithDelta(1150.0, $this->line($journal->entry_code, 11401, 'credit'), 0.01, 'Cr 11401 Inventory = 10 × 115 = 1150');
        $this->assertEqualsWithDelta(1150.0, $this->line($journal->entry_code, 2111, 'debit'), 0.01, 'Dr AP = 1150');

        $dr = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('debit');
        $cr = (float) DB::table('journal_entry_lines')->where('journal_entry_code', $journal->entry_code)->sum('credit');
        $this->assertEqualsWithDelta($cr, $dr, 0.01, 'Journal must balance');
    }

    private function balanceJson(int $productId, int $warehouseId): string
    {
        $b = DB::table('inventory_cost_balances')
            ->where('company_id', $this->companyId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        return json_encode([
            'quantity' => (float) $b->quantity,
            'inventory_value' => (float) $b->inventory_value,
            'average_cost' => (float) $b->average_cost,
        ], JSON_THROW_ON_ERROR);
    }
}
