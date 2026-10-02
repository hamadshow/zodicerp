<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\TransferStock;
use App\Models\User;
use App\Models\Warehouses;
use App\Services\Inventory\OpeningStockService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class StockTransferCrudTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }
    }

    protected function ensureCompanyTwoExists(): int
    {
        $exists = DB::table('company')->where('id', 2)->exists();
        if (! $exists) {
            DB::table('company')->insert([
                'id' => 2,
                'company_name' => 'Company 2',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return 2;
    }

    protected function createUser(int $companyId): User
    {
        $suffix = (string) uniqid();

        return User::create([
            'username' => 'testuser_'.$suffix,
            'fullname' => 'Test User '.$suffix,
            'email' => 'testuser_'.$suffix.'@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'status' => 'active',
            'company_id' => $companyId,
        ]);
    }

    protected function createWarehouse(int $companyId, string $code, string $name): Warehouses
    {
        $suffix = substr(uniqid(), -6);
        $branch = Branch::query()->create([
            'branch_name' => 'Test Branch',
            'company_id' => $companyId,
        ]);

        return Warehouses::query()->create([
            'name' => $name,
            'warehouse_code' => $code.'-'.$suffix,
            'status' => 'active',
            'company_id' => $companyId,
            'branch_id' => $branch->id,
        ]);
    }

    protected function createUnit(int $companyId, string $name = 'Piece'): ItemUnit
    {
        return ItemUnit::query()->create([
            'name' => $name,
            'active' => 1,
            'company_id' => $companyId,
            'conversion_factor' => 1,
            'unit_type' => 1,
            'base_unit' => 1,
        ]);
    }

    protected function createProduct(int $companyId, string $code = 'PRD-TST', string $name = 'Test Product', ?int $unitId = null): Products
    {
        $suffix = substr(uniqid(), -6);

        return Products::query()->create([
            'name' => $name,
            'product_code' => $code.'-'.$suffix,
            'slug' => Str::slug($name.'-'.$code.'-'.uniqid()),
            'status' => 'active',
            'company_id' => $companyId,
            'cost_per_item' => 0,
            'unit_id' => $unitId,
        ]);
    }

    public function test_stock_transfer_store_creates_records(): void
    {
        $companyId = $this->ensureCompanyTwoExists();
        $user = $this->createUser($companyId);
        $wh1 = $this->createWarehouse($companyId, 'WH1', 'Warehouse 1');
        $wh2 = $this->createWarehouse($companyId, 'WH2', 'Warehouse 2');

        $unit = $this->createUnit($companyId);
        $productA = $this->createProduct($companyId, 'PRD-A', 'Product A', $unit->id);
        $date = Carbon::now()->toDateString();

        // The transfer ledger applies at save, so the source warehouse needs
        // real WAC stock (seeded through the Phase 3 opening-stock engine).
        $this->actingAs($user);
        app(OpeningStockService::class)->create([
            'warehouse_id' => $wh1->id,
            'items' => [
                ['product_id' => $productA->id, 'unit_id' => $unit->id, 'quantity' => 20, 'cost_price' => 4],
            ],
        ]);

        $params = ['country' => 'sa', 'lang' => 'ar'];

        $payload = [
            'movement_date' => $date,
            'from_warehouse_id' => $wh1->id,
            'to_warehouse_id' => $wh2->id,
            'notes' => 'Test transfer',
            'items' => [
                [
                    'product_id' => $productA->id,
                    'unit_id' => $unit->id,
                    'quantity' => 10,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('admin.inventory.stock-transfers.store', $params), $payload);
        $response->assertStatus(302);
        $response->assertSessionHas('success');

        $transfer = DB::table('inventory_movement_headers')
            ->where('company_id', $companyId)
            ->where('from_warehouse_id', $wh1->id)
            ->where('to_warehouse_id', $wh2->id)
            ->orderByDesc('id')
            ->first();

        $this->assertNotNull($transfer);
        $this->assertSame($date, $transfer->movement_date);
        $this->assertSame('transfer', $transfer->type);
        $this->assertStringStartsWith('TR-', $transfer->voucher_num);
        $this->assertSame($user->id, $transfer->created_by);

        $itemsCount = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $transfer->id)
            ->count();
        $this->assertSame(1, $itemsCount);

        $row = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $transfer->id)
            ->first();
        $this->assertNotNull($row);
        $this->assertSame($productA->id, (int) $row->product_id);
        $this->assertSame($unit->id, (int) $row->unit_id);
    }

    public function test_stock_transfer_update_works(): void
    {
        $companyId = $this->ensureCompanyTwoExists();
        $user = $this->createUser($companyId);
        $wh1 = $this->createWarehouse($companyId, 'WH1', 'Warehouse 1');
        $wh2 = $this->createWarehouse($companyId, 'WH2', 'Warehouse 2');
        $unit = $this->createUnit($companyId);
        $productA = $this->createProduct($companyId, 'PRD-A', 'Product A', $unit->id);

        // Create initial record
        $transfer = TransferStock::create([
            'movement_date' => Carbon::now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'voucher_num' => 'TR-INIT',
            'warehouse_id' => $wh1->id,
            'from_warehouse_id' => $wh1->id,
            'to_warehouse_id' => $wh2->id,
            'company_id' => $companyId,
            'created_by' => $user->id,
        ]);

        $params = ['country' => 'sa', 'lang' => 'ar'];
        $newDate = Carbon::now()->addDay()->toDateString();
        
        $payload = [
            'movement_date' => $newDate,
            'from_warehouse_id' => $wh1->id,
            'to_warehouse_id' => $wh2->id,
            'notes' => 'Updated notes',
            'items' => [
                [
                    'product_id' => $productA->id,
                    'unit_id' => $unit->id,
                    'quantity' => 50, // Updated quantity
                ],
            ],
        ];

        $response = $this->actingAs($user)->put(route('admin.inventory.stock-transfers.update', array_merge($params, ['stock_transfer' => $transfer->id])), $payload);
        
        $response->assertStatus(302);
        
        $transfer->refresh();
        $this->assertSame($newDate, $transfer->movement_date);
        $this->assertStringContainsString('Updated notes', $transfer->notes);

        $item = $transfer->items()->first();
        $this->assertEquals(50, $item->quantity);
    }

    public function test_stock_transfer_destroy_works(): void
    {
        $companyId = $this->ensureCompanyTwoExists();
        $user = $this->createUser($companyId);
        $wh1 = $this->createWarehouse($companyId, 'WH1', 'Warehouse 1');
        $wh2 = $this->createWarehouse($companyId, 'WH2', 'Warehouse 2');

        $transfer = TransferStock::create([
            'movement_date' => Carbon::now()->toDateString(),
            'type' => 'transfer',
            'direction' => 'out',
            'voucher_num' => 'TR-TO-DELETE',
            'warehouse_id' => $wh1->id,
            'from_warehouse_id' => $wh1->id,
            'to_warehouse_id' => $wh2->id,
            'company_id' => $companyId,
            'created_by' => $user->id,
        ]);

        $params = ['country' => 'sa', 'lang' => 'ar'];
        $response = $this->actingAs($user)->delete(route('admin.inventory.stock-transfers.destroy', array_merge($params, ['stock_transfer' => $transfer->id])));

        $response->assertStatus(302);
        $this->assertDatabaseMissing('inventory_movement_headers', ['id' => $transfer->id]);
    }
}
