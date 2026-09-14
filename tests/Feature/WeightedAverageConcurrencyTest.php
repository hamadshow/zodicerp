<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * REAL two-process concurrency proof for the Weighted Average cost engine.
 *
 * Two independent PHP processes (worker processes boot their own Laravel app)
 * operate on the SAME company+product+warehouse balance row. Process A takes a
 * SELECT ... FOR UPDATE row lock and holds it until the test releases it;
 * Process B attempts the same lock and MUST block until A commits. File markers
 * carry microtime timestamps so the blocking window is observable evidence:
 *
 *   A_LOCKED < B_LOCK_ATTEMPT < RELEASE < B_GOT_LOCK
 *
 * The final balance assertions prove no lost update: the outcome must be
 * exactly equivalent to serial execution regardless of interleaving.
 *
 * A skipped test is NOT a pass: if the two-process harness cannot run in the
 * environment, each test fails loudly instead of being skipped.
 */
class WeightedAverageConcurrencyTest extends TestCase
{
    private const WORKER = 'tests/Support/WeightedAverageConcurrencyHarness.php';
    private const COMPANY_ID = 1;

    private string $markerDir;
    private array $fixture = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->fail('Real concurrency requires MySQL/MariaDB row locking (InnoDB).');
        }
        $this->markerDir = sys_get_temp_dir().'/wa-harness-'.uniqid();
        mkdir($this->markerDir, 0777, true);
    }

    protected function tearDown(): void
    {
        if (! empty($this->fixture)) {
            // The harness contract is: cleanup <userId> <productId> <warehouseId> <branchId>.
            // Pass them explicitly — positional order matters.
            $this->runWorker(['cleanup',
                (string) $this->fixture['userId'],
                (string) $this->fixture['productId'],
                (string) $this->fixture['warehouseId'],
                (string) $this->fixture['branchId'],
            ]);
        }
        if (is_dir($this->markerDir)) {
            array_map('unlink', glob($this->markerDir.'/*') ?: []);
            @rmdir($this->markerDir);
        }
        parent::tearDown();
    }

    private function runWorker(array $args): string
    {
        $process = new Process([PHP_BINARY, base_path(self::WORKER), ...$args]);
        $process->setTimeout(120);
        $process->run();
        if (! $process->isSuccessful()) {
            throw new \RuntimeException('Worker failed: '.$process->getErrorOutput().' '.$process->getOutput());
        }
        return trim($process->getOutput());
    }

    private function startWorker(array $args): Process
    {
        $process = new Process([PHP_BINARY, base_path(self::WORKER), ...$args]);
        $process->setTimeout(120);
        $process->start();
        return $process;
    }

    private function waitMarker(string $name, int $timeoutSec = 90): float
    {
        $file = $this->markerDir.'/'.$name;
        $deadline = microtime(true) + $timeoutSec;
        while (microtime(true) < $deadline) {
            if (file_exists($file)) {
                return (float) file_get_contents($file);
            }
            usleep(100000);
        }
        $this->fail("Marker {$name} never appeared (timeout {$timeoutSec}s). A.out: ".$this->procOut('A').' B.out: '.$this->procOut('B'));
    }

    private function procOut(string $role): string
    {
        $f = $this->markerDir.'/'.$role.'.out';
        return is_file($f) ? file_get_contents($f) : '(no output)';
    }

    private function initFixture(string $qty, string $cost): void
    {
        $json = $this->runWorker(['init', (string) self::COMPANY_ID, $qty, $cost]);
        $this->fixture = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * Run the A/B lock choreography for a scenario.
     * Returns ['aDone' => float, 'bLockAttempt' => float, 'bGotLock' => float, 'release' => float, 'procA' => Process, 'procB' => Process].
     */
    private function runChoreography(string $modeA, string $qtyA, string $costA, string $modeB, string $qtyB, string $costB, string $srcTypeA, string $srcTypeB): array
    {
        $uid = $this->fixture['userId'];
        $pid = $this->fixture['productId'];
        $wid = $this->fixture['warehouseId'];

        $procA = $this->startWorker(['run', 'A', (string) $uid, (string) $pid, (string) $wid, $modeA, $qtyA, $costA, $srcTypeA, $this->markerDir]);
        $aLocked = $this->waitMarker('A_LOCKED');

        $procB = $this->startWorker(['run', 'B', (string) $uid, (string) $pid, (string) $wid, $modeB, $qtyB, $costB, $srcTypeB, $this->markerDir]);
        $bAttempt = $this->waitMarker('B_LOCK_ATTEMPT');

        // Release A only once B is demonstrably attempting the row lock.
        $release = microtime(true);
        file_put_contents($this->markerDir.'/RELEASE', (string) $release);

        $this->waitMarker('A_DONE');
        $this->waitMarker('B_DONE');
        $procA->wait();
        $procB->wait();
        if (! $procA->isSuccessful() || ! $procB->isSuccessful()) {
            $this->fail('Worker failed. A: '.$procA->getErrorOutput().' B: '.$procB->getErrorOutput());
        }
        $bGotLock = (float) file_get_contents($this->markerDir.'/B_GOT_LOCK');

        return [
            'aLocked' => $aLocked,
            'bLockAttempt' => $bAttempt,
            'bGotLock' => $bGotLock,
            'release' => $release,
            'procA' => $procA,
            'procB' => $procB,
        ];
    }

    private function assertBlockingEvidence(array $timing): void
    {
        // Real blocking proof: B attempted before release, and only acquired the
        // lock AFTER A was released/committed.
        $this->assertLessThan($timing['bLockAttempt'], $timing['aLocked'], 'A must lock before B attempts.');
        $this->assertLessThan($timing['release'], $timing['bLockAttempt'], 'B must attempt the lock before A is released.');
        $this->assertGreaterThanOrEqual($timing['release'], $timing['bGotLock'], 'B acquired the row lock only after A released it → B genuinely blocked.');
    }

    public function test_concurrent_two_inbound_receipts_serialize_without_lost_update(): void
    {
        $this->initFixture('100', '100'); // Q=100 V=10000 WA=100
        $timing = $this->runChoreography('inbound', '50', '120', 'inbound', '50', '140', 'wa_conc_a', 'wa_conc_b');
        $this->assertBlockingEvidence($timing);

        $state = json_decode($this->runWorker(['state', (string) $this->fixture['productId'], (string) $this->fixture['warehouseId']]), true, 512, JSON_THROW_ON_ERROR);
        $this->assertEqualsWithDelta(200.0, $state['quantity'], 0.0001);
        $this->assertEqualsWithDelta(23000.0, $state['inventory_value'], 0.0001);
        $this->assertEqualsWithDelta(115.0, $state['average_cost'], 0.0001);
    }

    public function test_concurrent_mixed_sale_and_inbound_serialize(): void
    {
        $this->initFixture('200', '115'); // Q=200 V=23000 WA=115
        // A: sale 50 @ current WA 115 ; B: inbound 50 @ 130
        $timing = $this->runChoreography('outbound', '50', '5001', 'inbound', '50', '130', 'wa_conc_sale', 'wa_conc_in2');
        $this->assertBlockingEvidence($timing);

        $state = json_decode($this->runWorker(['state', (string) $this->fixture['productId'], (string) $this->fixture['warehouseId']]), true, 512, JSON_THROW_ON_ERROR);
        $this->assertEqualsWithDelta(200.0, $state['quantity'], 0.0001);
        $this->assertEqualsWithDelta(23750.0, $state['inventory_value'], 0.0001);
        $this->assertEqualsWithDelta(118.75, $state['average_cost'], 0.0001);
    }

    public function test_concurrent_duplicate_source_has_single_effect(): void
    {
        $this->initFixture('100', '100'); // Q=100 V=10000
        // Both processes apply the SAME inbound source identity concurrently:
        // the harness derives the inbound source_id from the cost argument, so
        // both workers use source_type wa_conc_dup / source_id 120.
        $sameSource = 120;
        $timing = $this->runChoreography('inbound', '50', '120', 'inbound', '50', '120', 'wa_conc_dup', 'wa_conc_dup');
        $this->assertBlockingEvidence($timing);

        $state = json_decode($this->runWorker(['state', (string) $this->fixture['productId'], (string) $this->fixture['warehouseId']]), true, 512, JSON_THROW_ON_ERROR);
        // Exactly ONE effect: 100 + 50 = 150 (not 200).
        $this->assertEqualsWithDelta(150.0, $state['quantity'], 0.0001);
        $this->assertEqualsWithDelta(16000.0, $state['inventory_value'], 0.0001);

        $effectCount = DB::table('inventory_cost_transactions')
            ->where('company_id', self::COMPANY_ID)
            ->where('product_id', $this->fixture['productId'])
            ->where('source_type', 'wa_conc_dup')
            ->where('source_id', $sameSource)
            ->count();
        $this->assertSame(1, $effectCount, 'Duplicate concurrent source must produce exactly one costing transaction.');
        $valueDelta = DB::table('inventory_cost_transactions')
            ->where('company_id', self::COMPANY_ID)
            ->where('product_id', $this->fixture['productId'])
            ->where('source_type', 'wa_conc_dup')
            ->where('source_id', $sameSource)
            ->value('quantity_delta');
        $this->assertSame('50.0000', (string) $valueDelta, 'The single duplicate effect must be one +50 receipt.');
    }
}
