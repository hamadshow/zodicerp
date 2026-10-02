<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Phase 11 — the bulkImport quantity-on-update remainder is closed
 * (docs/inventory/inventory-source-of-truth.md, §11 rule 3).
 *
 * Product catalog import is a MASTER-DATA surface. products.quantity is
 * maintained by the movement engine only:
 *
 *   - CREATE: the row's quantity is the new product's implicit opening stock
 *     (creation-time initial state, same class as the store flow).
 *   - UPDATE: an existing product's stock is NEVER touched by an import —
 *     the quantity column is deliberately ignored, however stale the
 *     snapshot. Corrections go through Opening Stock, Stock Adjustment,
 *     GRN, or the update-stock API.
 *
 * Before Phase 11 an import overwrite wrote products.quantity raw
 * (updateOrCreate carried 'quantity' on both branches — even zeroing stock
 * when the column was absent), bypassing WAC and the movement ledger.
 */
class ProductImportStockPolicyTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $otherCompanyId = 2;

    protected int $userId;

    protected int $productId;

    protected string $productName;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('company')->insertOrIgnore([
            'id' => $this->companyId,
            'company_name' => 'PI11 Co',
            'company_code' => 'PI11',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('company')->insertOrIgnore([
            'id' => $this->otherCompanyId,
            'company_name' => 'PI11 Other Co',
            'company_code' => 'PI11O',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->userId = DB::table('users')->insertGetId([
            'username' => 'pi11_'.$suffix,
            'fullname' => 'Import Policy Tester',
            'email' => 'pi11_'.$suffix.'@zodicerp-test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->actingAs(User::find($this->userId));

        $this->productName = 'PI11 Product '.$suffix;
        $this->productId = Products::query()->insertGetId([
            'product_code' => 'PI11-PRD-'.$suffix,
            'name' => $this->productName,
            'slug' => 'pi11-product-'.$suffix,
            'sku' => 'PI11-SKU-'.$suffix,
            'quantity' => 33,
            'price' => 20,
            'company_id' => $this->companyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /* -----------------------------------------------------------------
     | Residue-safe engine-artifact helpers
     ----------------------------------------------------------------- */

    private function engineArtifactsFor(int $productId): int
    {
        $adjustmentItems = DB::table('stock_adjustment_items')->where('product_id', $productId)->count();
        $adjustmentTxs = DB::table('inventory_cost_transactions')
            ->where('product_id', $productId)
            ->where('source_type', 'stock_adjustment_line')
            ->count();

        return $adjustmentItems + $adjustmentTxs;
    }

    private function importRows(array $rows)
    {
        return $this->actingAs(User::find($this->userId))
            ->post(route('admin.inventory.products.bulkImport', [
                'country' => 'sa',
                'lang' => 'ar',
            ]), ['rows' => $rows]);
    }

    /* =====================================================================
     |  UPDATE branch: import never mutates existing stock
     ===================================================================== */

    /** @test */
    public function import_update_never_touches_existing_product_stock()
    {
        $this->importRows([
            [
                'name' => $this->productName,
                'product_code' => 'PI11-UPD-'.uniqid(),
                'price' => 55,
                'quantity' => 999, // stale snapshot — must be ignored
            ],
        ])->assertRedirect()->assertSessionHas('success');

        $product = Products::find($this->productId);
        $this->assertSame(33.0, (float) $product->quantity, 'Import must never overwrite an existing product\'s engine-maintained stock.');
        $this->assertSame(55.0, (float) $product->price, 'Master data (price) must still be updated by the import.');
        $this->assertSame(0, $this->engineArtifactsFor($this->productId), 'No movement/adjustment artifacts may be emitted by an import.');
    }

    /** @test */
    public function import_update_without_quantity_does_not_zero_stock()
    {
        $this->importRows([
            [
                'name' => $this->productName,
                'price' => 21,
                // no quantity key at all
            ],
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertSame(33.0, (float) Products::find($this->productId)->quantity,
            'Before Phase 11 the missing column defaulted to 0 and zeroed live stock.');
        $this->assertSame(0, $this->engineArtifactsFor($this->productId));
    }

    /** @test */
    public function import_create_then_update_preserves_stock()
    {
        $name = 'PI11 Roundtrip '.uniqid();

        // Row 1 creates the product with initial (opening) stock 7.
        // Row 2 re-imports it with a stale quantity of 500.
        $this->importRows([
            ['name' => $name, 'quantity' => 7, 'price' => 10],
            ['name' => $name, 'quantity' => 500, 'price' => 11],
        ])->assertRedirect()->assertSessionHas('success');

        $product = Products::query()->where('name', $name)->where('company_id', $this->companyId)->first();
        $this->assertNotNull($product);
        $this->assertSame(7.0, (float) $product->quantity, 'Create = opening stock 7; the re-import must not clobber it.');
        $this->assertSame(11.0, (float) $product->price, 'Master data from the second row still applies.');
        $this->assertSame(0, $this->engineArtifactsFor($product->id));
    }

    /* =====================================================================
     |  CREATE branch: quantity = implicit opening stock (documented)
     ===================================================================== */

    /** @test */
    public function import_create_takes_initial_quantity()
    {
        $name = 'PI11 New '.uniqid();

        $this->importRows([
            ['name' => $name, 'product_code' => 'PI11-NEW-'.uniqid(), 'quantity' => 7],
        ])->assertRedirect()->assertSessionHas('success');

        $product = Products::query()->where('name', $name)->where('company_id', $this->companyId)->first();
        $this->assertNotNull($product, 'Import must create the new product.');
        $this->assertSame(7.0, (float) $product->quantity, 'A new product\'s row quantity is its implicit opening stock.');
        $this->assertSame(0, $this->engineArtifactsFor($product->id), 'Creation-time initial state emits no movement documents (documented remainder).');
    }

    /** @test */
    public function import_create_without_quantity_defaults_to_zero()
    {
        $name = 'PI11 New NoQty '.uniqid();

        $this->importRows([
            ['name' => $name],
        ])->assertRedirect()->assertSessionHas('success');

        $product = Products::query()->where('name', $name)->where('company_id', $this->companyId)->first();
        $this->assertNotNull($product);
        $this->assertSame(0.0, (float) $product->quantity);
    }

    /* =====================================================================
     |  Company isolation of the import lookup
     ===================================================================== */

    /** @test */
    public function import_same_name_in_other_company_is_isolated()
    {
        // Same product name exists in company 2; the import runs as company 1.
        Products::query()->insertGetId([
            'product_code' => 'PI11O-PRD-'.uniqid(),
            'name' => $this->productName,
            'slug' => 'pi11o-product-'.uniqid(),
            'sku' => 'PI11O-SKU-'.uniqid(),
            'quantity' => 44,
            'company_id' => $this->otherCompanyId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->importRows([
            ['name' => $this->productName, 'quantity' => 999, 'price' => 60],
        ])->assertRedirect()->assertSessionHas('success');

        // Company 1's product: master data updated, stock untouched.
        $own = Products::find($this->productId);
        $this->assertSame(33.0, (float) $own->quantity);
        $this->assertSame(60.0, (float) $own->price);

        // Company 2's same-name product: completely untouched.
        $foreign = Products::query()->where('name', $this->productName)->where('company_id', $this->otherCompanyId)->first();
        $this->assertNotNull($foreign);
        $this->assertSame(44.0, (float) $foreign->quantity);
        $this->assertSame(0.0, (float) $foreign->price, 'The import lookup is scoped to the caller\'s company.');
        $this->assertSame(0, $this->engineArtifactsFor($foreign->id));
    }
}
