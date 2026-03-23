<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\User;
use App\Models\Warehouses;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class StockTransferCrudTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('database.default', 'mysql');
        $dbName = 'u244683233_Zodicerp';
        $dbUser = env('DB_USERNAME', 'root');
        $dbPass = env('DB_PASSWORD', '');
        $dbHost = env('DB_HOST', '127.0.0.1');
        $dbPort = env('DB_PORT', '3306');
        Config::set('database.connections.mysql.database', $dbName);
        Config::set('database.connections.mysql.username', $dbUser);
        Config::set('database.connections.mysql.password', $dbPass);
        Config::set('database.connections.mysql.host', $dbHost);
        Config::set('database.connections.mysql.port', $dbPort);
    }

    protected function ensureCompanyTwoExists(): int
    {
        $table = Schema::hasTable('company')
            ? 'company'
            : (Schema::hasTable('companies') ? 'companies' : 'companies_shares');
        $exists = DB::table($table)->where('id', 2)->exists();
        if (! $exists) {
            DB::table($table)->insert([
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

    protected function createProduct(int $companyId, string $code = 'PRD-TST', string $name = 'Test Product'): Products
    {
        $suffix = substr(uniqid(), -6);

        return Products::query()->create([
            'name' => $name,
            'product_code' => $code.'-'.$suffix,
            'slug' => Str::slug($name.'-'.$code.'-'.uniqid()),
            'status' => 'active',
            'company_id' => $companyId,
            'cost_per_item' => 0,
        ]);
    }

    public function test_opening_stock_store_creates_records(): void
    {
        $companyId = $this->ensureCompanyTwoExists();
        $user = $this->createUser($companyId);
        $wh = $this->createWarehouse($companyId, 'TST-WH', 'Main WH');
        $unit = $this->createUnit($companyId);
        $productA = $this->createProduct($companyId, 'PRD-A', 'Product A');

        $params = ['country' => 'sa', 'lang' => 'ar'];
        $date = Carbon::now()->toDateString();

        $payload = [
            'movement_date' => $date,
            'warehouse_id' => $wh->id,
            'notes' => 'Opening stock',
            'items' => [
                [
                    'product_id' => $productA->id,
                    'unit_id' => $unit->id,
                    'quantity' => 10,
                    'cost_price' => 3.5,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('admin.inventory.opening-stock.store', $params), $payload);
        $response->assertStatus(302);

        $openingStock = DB::table('stock_movements')
            ->where('company_id', $companyId)
            ->where('warehouse_id', $wh->id)
            ->orderByDesc('id')
            ->first();

        $this->assertNotNull($openingStock);
        $this->assertSame($date, $openingStock->movement_date);
        $this->assertSame($user->id, (int) $openingStock->created_by);

        $itemsCount = DB::table('stock_movements_items')
            ->where('stock_movement_id', $openingStock->id)
            ->count();
        $this->assertSame(1, $itemsCount);

        $row = DB::table('stock_movements_items')
            ->where('stock_movement_id', $openingStock->id)
            ->first();
        $this->assertNotNull($row);
        $this->assertSame($productA->id, (int) $row->product_id);
        $this->assertSame($unit->id, (int) $row->unit_id);
    }
}
