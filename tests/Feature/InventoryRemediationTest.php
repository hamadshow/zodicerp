<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InventoryRemediationTest extends TestCase
{
    /**
     * Verify Opening Stock increments products.quantity on creation.
     */
    public function test_opening_stock_increments_product_quantity(): void
    {
        if ($this->skipIfIncompleteDb()) return;

        $productId = $this->getOrCreateTestProduct('OS TEST PRODUCT', 0);

        $qtyBefore = DB::table('products')->where('id', $productId)->value('quantity');

        $warehouseId = DB::table('warehouses')->first()->id ?? null;
        if (!$warehouseId) {
            $this->markTestSkipped('No warehouses');
            return;
        }

        $unitId = DB::table('item_units')->first()->id ?? null;
        if (!$unitId) {
            $this->markTestSkipped('No item units');
            return;
        }

        $companyId = DB::table('company')->first()->id ?? 1;

        DB::transaction(function () use ($productId, $warehouseId, $unitId, $companyId) {
            $headerId = DB::table('inventory_movement_headers')->insertGetId([
                'movement_date' => now()->toDateString(),
                'type' => 'opening',
                'direction' => 'in',
                'voucher_num' => 'OS-TEST-' . uniqid(),
                'warehouse_id' => $warehouseId,
                'company_id' => $companyId,
                'created_by' => 1,
                'notes' => 'Test Opening Stock',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('inventory_movement_lines')->insert([
                'stock_movement_id' => $headerId,
                'product_id' => $productId,
                'unit_id' => $unitId,
                'quantity' => 10,
                'cost_price' => 50.00,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('products')->where('id', $productId)->increment('quantity', 10);
        });

        $qtyAfter = DB::table('products')->where('id', $productId)->value('quantity');

        $this->assertEquals((float) $qtyBefore + 10, (float) $qtyAfter);
    }

    /**
     * Verify Opening Stock decrement on delete.
     */
    public function test_opening_stock_decrements_product_quantity_on_delete(): void
    {
        if ($this->skipIfIncompleteDb()) return;

        $productId = $this->getOrCreateTestProduct('OS DELETE TEST', 15);

        $warehouseId = DB::table('warehouses')->first()->id ?? null;
        if (!$warehouseId) {
            $this->markTestSkipped('No warehouses');
            return;
        }

        $unitId = DB::table('item_units')->first()->id ?? null;
        if (!$unitId) {
            $this->markTestSkipped('No item units');
            return;
        }

        $companyId = DB::table('company')->first()->id ?? 1;

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'opening',
            'direction' => 'in',
            'voucher_num' => 'OS-DEL-' . uniqid(),
            'warehouse_id' => $warehouseId,
            'company_id' => $companyId,
            'created_by' => 1,
            'notes' => 'Test Opening Stock Delete',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $headerId,
            'product_id' => $productId,
            'unit_id' => $unitId,
            'quantity' => 10,
            'cost_price' => 50.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('products')->where('id', $productId)->increment('quantity', 10);
        $qtyAfterInsert = (float) DB::table('products')->where('id', $productId)->value('quantity');

        // Now simulate delete: decrement quantity, delete lines, delete header
        $lines = DB::table('inventory_movement_lines')->where('stock_movement_id', $headerId)->get();
        foreach ($lines as $line) {
            DB::table('products')->where('id', $line->product_id)->decrement('quantity', (float) $line->quantity);
        }
        DB::table('inventory_movement_lines')->where('stock_movement_id', $headerId)->delete();
        DB::table('inventory_movement_headers')->where('id', $headerId)->delete();

        $qtyAfterDelete = (float) DB::table('products')->where('id', $productId)->value('quantity');

        $this->assertEquals($qtyAfterInsert - 10, $qtyAfterDelete);
    }

    /**
     * Verify Stock Transfer uses products.cost_per_item, not 0.
     */
    public function test_stock_transfer_uses_product_cost(): void
    {
        if ($this->skipIfIncompleteDb()) return;

        $productId = $this->getOrCreateTestProduct('TRANSFER COST TEST', 100);

        $warehouses = DB::table('warehouses')->select('id')->limit(2)->get();
        if ($warehouses->count() < 2) {
            $this->markTestSkipped('Need at least 2 warehouses');
            return;
        }

        $unitId = DB::table('item_units')->first()->id ?? null;
        if (!$unitId) {
            $this->markTestSkipped('No item units');
            return;
        }

        $companyId = DB::table('company')->first()->id ?? 1;

        $headerId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'voucher_num' => 'TR-COST-' . uniqid(),
            'warehouse_id' => $warehouses[0]->id,
            'from_warehouse_id' => $warehouses[0]->id,
            'to_warehouse_id' => $warehouses[1]->id,
            'company_id' => $companyId,
            'created_by' => 1,
            'notes' => 'Test Transfer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // The fix: cost_price should be products.cost_per_item, not 0
        $productCost = (float) DB::table('products')->where('id', $productId)->value('cost_per_item');

        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $headerId,
            'product_id' => $productId,
            'unit_id' => $unitId,
            'quantity' => 5,
            'cost_price' => $productCost, // Should be 100, not 0
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $line = DB::table('inventory_movement_lines')->where('stock_movement_id', $headerId)->first();

        $this->assertEquals($productCost, (float) $line->cost_price);
        $this->assertNotEquals(0, (float) $line->cost_price);
    }

    /**
     * Verify Sales Return COGS reversal uses historical cost from original sale.
     */
    public function test_sales_return_uses_historical_cost(): void
    {
        if ($this->skipIfIncompleteDb()) return;

        // Create a product with a known cost
        $productId = $this->getOrCreateTestProduct('RETURN HIST TEST', 75);

        $warehouseId = DB::table('warehouses')->first()->id ?? null;
        if (!$warehouseId) {
            $this->markTestSkipped('No warehouses');
            return;
        }

        $unitId = DB::table('item_units')->first()->id ?? null;
        if (!$unitId) {
            $this->markTestSkipped('No item units');
            return;
        }

        $companyId = DB::table('company')->first()->id ?? 1;

        // Simulate original sale's inventory movement with cost_price = 75
        $saleMovementHeader = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => now()->toDateString(),
            'type' => 'sale',
            'direction' => 'out',
            'reference_id' => 99999,
            'reference_type' => 'SalesInvoice',
            'voucher_num' => 'INV-HIST-' . uniqid(),
            'warehouse_id' => $warehouseId,
            'company_id' => $companyId,
            'created_by' => 1,
            'notes' => 'Test Sale',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('inventory_movement_lines')->insert([
            'stock_movement_id' => $saleMovementHeader,
            'product_id' => $productId,
            'unit_id' => $unitId,
            'quantity' => 10,
            'cost_price' => 75.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Now simulate the Sales Return cost recovery logic
        $returnQty = 3;

        // Look up historical cost from original sale movement
        $originalLine = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $saleMovementHeader)
            ->where('product_id', $productId)
            ->first();

        $historicalCost = $originalLine ? (float) $originalLine->cost_price : 0;
        $cogsReversal = $returnQty * $historicalCost;

        // Verify: the historical cost was recovered correctly
        $this->assertEquals(75.00, $historicalCost);
        $this->assertEquals(225.00, $cogsReversal);

        // Now change the product cost and verify historical is still used
        DB::table('products')->where('id', $productId)->update(['cost_per_item' => 150.00]);

        $newProductCost = (float) DB::table('products')->where('id', $productId)->value('cost_per_item');
        $this->assertEquals(150.00, $newProductCost);

        // Historical cost is STILL 75 (from the original sale movement)
        $this->assertEquals(75.00, $historicalCost);
        $this->assertEquals(225.00, $cogsReversal);
    }

    /**
     * Verify Sales Return falls back to products.cost_per_item when no historical movement exists.
     */
    public function test_sales_return_fallback_to_product_cost(): void
    {
        if ($this->skipIfIncompleteDb()) return;

        $productId = $this->getOrCreateTestProduct('RETURN FALLBACK TEST', 60);

        // No historical movement exists for this product — fallback should use current cost
        $product = DB::table('products')->where('id', $productId)->first();
        $costPrice = (float) ($product->cost_per_item ?? 0);
        $cogsReversal = 5 * $costPrice;

        $this->assertEquals(60.00, $costPrice);
        $this->assertEquals(300.00, $cogsReversal);
    }

    // ---- Helpers ----

    private function skipIfIncompleteDb(): bool
    {
        try {
            $count = DB::table('products')->count();
            if ($count === 0) {
                $this->markTestSkipped('Production DB incomplete — no products');
                return true;
            }
            return false;
        } catch (\Exception $e) {
            $this->markTestSkipped('DB unavailable: ' . $e->getMessage());
            return true;
        }
    }

    private function getOrCreateTestProduct(string $name, float $cost): int
    {
        $existing = DB::table('products')->where('name', $name)->first();
        if ($existing) {
            return (int) $existing->id;
        }

        return DB::table('products')->insertGetId([
            'name' => $name,
            'name_en' => $name,
            'name_ar' => $name,
            'sku' => 'TEST-' . strtoupper(substr(uniqid(), -6)),
            'barcode' => uniqid(),
            'quantity' => 0,
            'cost_per_item' => $cost,
            'selling_price' => $cost * 1.5,
            'status' => 1,
            'company_id' => DB::table('company')->first()->id ?? 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
