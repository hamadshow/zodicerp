<?php

/**
 * Deterministic two-process concurrency harness for the Weighted Average engine.
 *
 * TEST INFRASTRUCTURE ONLY — never used by production.
 *
 * The proof requires REAL database-level blocking on the inventory_cost_balances
 * row. Two independent PHP processes coordinate through file markers so the
 * overlap window is guaranteed rather than timing-dependent:
 *
 *   Process A (role A):
 *     BEGIN
 *     SELECT ... FOR UPDATE on the WA balance row   (lock acquired)
 *     write A_LOCKED
 *     wait for RELEASE marker (test-controlled)
 *     apply its operation (inbound / outbound)
 *     COMMIT                                        (lock released)
 *     write A_DONE
 *
 *   Process B (role B):
 *     wait for A_LOCKED                             (A still holds the lock)
 *     write B_LOCK_ATTEMPT (timestamp t0)
 *     BEGIN
 *     SELECT same WA balance row ... FOR UPDATE     (MUST block until A commits)
 *     write B_GOT_LOCK (timestamp t1)               (observable proof: t1 > t0)
 *     apply its operation
 *     COMMIT
 *     write B_DONE
 *
 * The PHPUnit test releases A only after B_LOCK_ATTEMPT is observed, then
 * asserts t1 is after the release, proving B really waited on the row lock.
 */

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Support\Facades\DB;

$command = $argv[1] ?? null;

/**
 * Block until a marker file exists, or return false after $timeoutSec.
 */
function waitForMarker(string $file, int $timeoutSec = 60): bool
{
    $deadline = microtime(true) + $timeoutSec;
    while (microtime(true) < $deadline) {
        if (file_exists($file)) {
            return true;
        }
        usleep(100000); // 100ms
    }
    return false;
}

function writeMarker(string $file): void
{
    file_put_contents($file, (string) microtime(true));
}

if ($command === 'init') {
    // init <companyId> <initialQty> <initialUnitCost>
    $companyId = (int) ($argv[2] ?? 1);
    $initialQty = (string) ($argv[3] ?? '100');
    $initialCost = (string) ($argv[4] ?? '100');

    $userId = DB::table('users')->insertGetId([
        'username' => 'wa-harness-'.uniqid(),
        'email' => 'wa-harness-'.uniqid().'@zodicerp-test.com',
        'password' => bcrypt('password'),
        'role' => 'admin',
        'company_id' => $companyId,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $branchId = DB::table('branches')->insertGetId([
        'company_id' => $companyId,
        'branch_code' => 'WA-HARN-BR-'.uniqid(),
        'branch_name' => 'WA Harness Branch',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $warehouseId = DB::table('warehouses')->insertGetId([
        'warehouse_code' => 'WA-HARN-WH-'.uniqid(),
        'name' => 'WA Harness Warehouse '.uniqid(),
        'branch_id' => $branchId,
        'company_id' => $companyId,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $productId = DB::table('products')->insertGetId([
        'product_code' => 'WA-HARN-PR-'.uniqid(),
        'name' => 'WA Harness Product',
        'slug' => 'wa-harness-'.uniqid(),
        'sku' => 'WA-HARN-SKU-'.uniqid(),
        'quantity' => 0,
        'cost_per_item' => 0,
        'company_id' => $companyId,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    auth()->loginUsingId($userId);
    if (bccomp($initialQty, '0') > 0) {
        app(WeightedAverageCostService::class)->applyInbound(
            $productId,
            $warehouseId,
            $initialQty,
            $initialCost,
            'wa_harness_seed',
            $productId,
            now()->toDateString(),
        );
    }

    echo json_encode(compact('userId', 'branchId', 'warehouseId', 'productId'), JSON_THROW_ON_ERROR);
    exit(0);
}

if ($command === 'run') {
    // run <role:A|B> <userId> <productId> <warehouseId> <mode:inbound|outbound> <qty> <costOrSourceId> <sourceType> <markerDir>
    [, , $role, $userId, $productId, $warehouseId, $mode, $qty, $costOrSourceId, $sourceType, $markerDir] = $argv;

    $marker = fn (string $name): string => rtrim($markerDir, '/\\').DIRECTORY_SEPARATOR.$name;

    auth()->loginUsingId((int) $userId);
    $service = app(WeightedAverageCostService::class);
    $apply = function () use ($service, $productId, $warehouseId, $mode, $qty, $costOrSourceId, $sourceType): void {
        if ($mode === 'inbound') {
            $service->applyInbound((int) $productId, (int) $warehouseId, (string) $qty, (string) $costOrSourceId, (string) $sourceType, (int) $costOrSourceId, now()->toDateString());
        } elseif ($mode === 'outbound') {
            $service->applyOutbound((int) $productId, (int) $warehouseId, (string) $qty, (string) $sourceType, (int) $costOrSourceId, now()->toDateString());
        }
    };

    if ($role === 'A') {
        // Hold the row lock, signal, wait for release, then apply INSIDE the
        // lock-holding transaction so the operation commits before B proceeds.
        DB::transaction(function () use ($marker, $productId, $warehouseId, $apply) {
            DB::table('inventory_cost_balances')
                ->where('company_id', 1)
                ->where('product_id', (int) $productId)
                ->where('warehouse_id', (int) $warehouseId)
                ->lockForUpdate()
                ->first();
            writeMarker($marker('A_LOCKED'));
            if (! waitForMarker($marker('RELEASE'), 60)) {
                throw new RuntimeException('Timed out waiting for RELEASE marker.');
            }
            usleep(700000); // safety buffer: keep B blocked inside its SELECT before we mutate+commit
            $apply();
        });
        writeMarker($marker('A_DONE'));
        echo "A-ok\n";
        exit(0);
    }

    if ($role === 'B') {
        // Wait for A to hold the lock, then attempt the same row lock.
        // The SELECT ... FOR UPDATE below blocks until A commits.
        if (! waitForMarker($marker('A_LOCKED'), 90)) {
            file_put_contents($marker('B_ERROR'), 'A_LOCKED never appeared');
            exit(1);
        }
        writeMarker($marker('B_LOCK_ATTEMPT'));
        DB::transaction(function () use ($marker, $productId, $warehouseId, $apply) {
            DB::table('inventory_cost_balances')
                ->where('company_id', 1)
                ->where('product_id', (int) $productId)
                ->where('warehouse_id', (int) $warehouseId)
                ->lockForUpdate()
                ->first();
            // We only reach this point after A has committed/released the lock.
            writeMarker($marker('B_GOT_LOCK'));
            $apply();
        });
        writeMarker($marker('B_DONE'));
        echo "B-ok\n";
        exit(0);
    }

    fwrite(STDERR, "Unknown role: {$role}\n");
    exit(1);
}

if ($command === 'state') {
    // state <productId> <warehouseId>
    [, , $productId, $warehouseId] = $argv;
    $balance = DB::table('inventory_cost_balances')
        ->where('company_id', 1)
        ->where('product_id', (int) $productId)
        ->where('warehouse_id', (int) $warehouseId)
        ->first();
    if (! $balance) {
        echo "NO_BALANCE\n";
        exit(1);
    }
    $balance->quantity = rtrim(rtrim((string) $balance->quantity, '0'), '.');
    $balance->inventory_value = rtrim(rtrim((string) $balance->inventory_value, '0'), '.');
    $balance->average_cost = rtrim(rtrim((string) $balance->average_cost, '0'), '.');
    echo json_encode([
        'quantity' => (float) $balance->quantity,
        'inventory_value' => (float) $balance->inventory_value,
        'average_cost' => (float) $balance->average_cost,
    ], JSON_THROW_ON_ERROR);
    exit(0);
}

if ($command === 'cleanup') {
    // cleanup <userId> <productId> <warehouseId> <branchId> <sourceTypesJson>
    [, , $userId, $productId, $warehouseId, $branchId] = $argv;
    DB::table('inventory_cost_transactions')->where('product_id', (int) $productId)->delete();
    DB::table('inventory_cost_balances')->where('product_id', (int) $productId)->delete();
    DB::table('products')->where('id', (int) $productId)->delete();
    DB::table('warehouses')->where('id', (int) $warehouseId)->delete();
    DB::table('branches')->where('id', (int) $branchId)->delete();
    DB::table('users')->where('id', (int) $userId)->delete();
    exit(0);
}

fwrite(STDERR, "Unknown command: {$command}\n");
exit(1);
