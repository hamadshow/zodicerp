<?php

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\Inventory\WeightedAverageCostService;
use App\Models\User;
use Illuminate\Support\Facades\DB;

$command = $argv[1] ?? null;

if ($command === 'setup') {
    $companyId = 1;
    $userId = DB::table('users')->insertGetId([
        'username' => 'wa-concurrency-'.uniqid(),
        'email' => 'wa-concurrency-'.uniqid().'@zodicerp-test.com',
        'password' => bcrypt('password'),
        'role' => 'admin',
        'company_id' => $companyId,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $branchId = DB::table('branches')->insertGetId([
        'company_id' => $companyId,
        'branch_code' => 'WA-CON-BR-'.uniqid(),
        'branch_name' => 'WA Concurrency Branch',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $warehouseId = DB::table('warehouses')->insertGetId([
        'warehouse_code' => 'WA-CON-WH-'.uniqid(),
        'name' => 'WA Concurrency Warehouse',
        'branch_id' => $branchId,
        'company_id' => $companyId,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $productId = DB::table('products')->insertGetId([
        'product_code' => 'WA-CON-PR-'.uniqid(),
        'name' => 'WA Concurrency Product',
        'slug' => 'wa-concurrency-'.uniqid(),
        'sku' => 'WA-CON-SKU-'.uniqid(),
        'quantity' => 0,
        'cost_per_item' => 0,
        'company_id' => $companyId,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    auth()->loginUsingId($userId);
    app(WeightedAverageCostService::class)->applyInbound($productId, $warehouseId, '100', '100', 'wa_concurrency_setup', $productId, now()->toDateString());
    echo json_encode(compact('userId', 'branchId', 'warehouseId', 'productId'), JSON_THROW_ON_ERROR);
    exit(0);
}

if ($command === 'inbound') {
    [, , $userId, $productId, $warehouseId, $sourceId, $unitCost, $marker] = $argv;
    auth()->loginUsingId((int) $userId);
    $service = app(WeightedAverageCostService::class);

    DB::transaction(function () use ($service, $productId, $warehouseId, $sourceId, $unitCost, $marker) {
        DB::table('inventory_cost_balances')
            ->where('company_id', 1)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->lockForUpdate()
            ->first();
        if ($marker) {
            file_put_contents($marker, 'locked');
            usleep(500000);
        }
        $service->applyInbound($productId, $warehouseId, '50', $unitCost, 'wa_concurrency_inbound', $sourceId, now()->toDateString());
    });
    echo "ok\n";
    exit(0);
}

if ($command === 'cleanup') {
    [, , $userId, $productId, $warehouseId, $branchId] = $argv;
    DB::table('inventory_cost_transactions')->where('product_id', $productId)->delete();
    DB::table('inventory_cost_balances')->where('product_id', $productId)->delete();
    DB::table('products')->where('id', $productId)->delete();
    DB::table('warehouses')->where('id', $warehouseId)->delete();
    DB::table('branches')->where('id', $branchId)->delete();
    DB::table('users')->where('id', $userId)->delete();
    exit(0);
}

fwrite(STDERR, "Unknown command\n");
exit(1);
