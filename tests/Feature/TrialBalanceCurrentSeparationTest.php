<?php

namespace Tests\Feature;

use App\Http\Controllers\Backend\Accounting\FinancialReportController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Trial Balance CURRENT separation regression tests.
 *
 * Canonical semantics (fixed in the previous task, must not change):
 *   Opening = opening balance / opening entry
 *   Regular (+ domain types) = normal in-year transaction
 *
 * getTrialBalanceData() must classify by journal_entries.entry_type:
 *   BEGINNING = 'Opening' entries only (up to as_of_date)
 *   CURRENT   = every non-Opening entry dated within the period
 * and must preserve: ending = opening + current movement, per-account
 * calculation on journal lines, parent aggregation without double counting.
 *
 * Runs against the application database; cleans up after itself
 * (same pattern as JournalEntryTypeSemanticsTest).
 */
class TrialBalanceCurrentSeparationTest extends TestCase
{
    private int $companyId;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        $this->companyId = (int) (User::first()?->company_id ?? 1);
    }

    private function createAccount(string $suffix, int $accType = 1, ?string $parentCode = null): array
    {
        $code = (string) random_int(10000000, 99999999);
        $id = DB::table('accounts')->insertGetId([
            'AccCode' => $code,
            'AccName' => 'JETB-TMP-'.$suffix.'-'.uniqid(),
            'AccType' => $accType,
            'AccParent' => $parentCode,
            'AccDmType' => 1,
            'AccFinal' => 1,
            'Nature' => 'asset',
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);

        return ['id' => (int) $id, 'code' => $code];
    }

    private function insertEntry(string $code, string $type, string $date, array $lines): void
    {
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => $type,
            'reference' => 'JETB-REF-'.uniqid(),
            'date' => $date,
            'description' => 'JETB fixture',
            'total_amount' => array_sum(array_column($lines, 'debit')),
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        foreach ($lines as $line) {
            DB::table('journal_entry_lines')->insert([
                'journal_entry_code' => $code,
                'account_id' => $line[0],
                'debit' => $line[1],
                'credit' => $line[2],
            ]);
        }
    }

    private function fetchReportRows(array $params = []): array
    {
        $request = Request::create('/api/reports/trial-balance', 'GET', $params);
        $request->setUserResolver(fn () => User::first());

        $response = app(FinancialReportController::class)
            ->getTrialBalanceData($request)
            ->getContent();

        return json_decode($response, true) ?? [];
    }

    private function rowFor(array $rows, int $accountId): ?array
    {
        foreach ($rows as $row) {
            if ((int) $row['AccID'] === $accountId) {
                return $row;
            }
        }

        return null;
    }

    /**
     * Cases 1, 2, 4 + the required example numbers:
     *   Opening  Dr 100,000 / Regular Dr 25,000 + Cr 10,000.
     * BEGINNING and CURRENT must be disjoint and Ending must reconcile.
     */
    public function test_opening_and_regular_are_separated_per_account(): void
    {
        // Baseline grand totals BEFORE fixtures: the legacy opening entry in
        // this dataset is itself unbalanced (Dr 6,450,000 / Cr 4,340,000 —
        // data imported from the old system), so balance is asserted on the
        // DELTA our balanced fixtures introduce, not on absolute totals.
        $baseline = ['bd' => 0.0, 'bc' => 0.0, 'cd' => 0.0, 'cc' => 0.0, 'ed' => 0.0, 'ec' => 0.0];
        foreach ($this->fetchReportRows(['start_date' => '2025-01-01', 'as_of_date' => '2025-12-31']) as $row) {
            if (($row['depth'] ?? 0) === 0) {
                $baseline['bd'] += $row['beginning_debit'];
                $baseline['bc'] += $row['beginning_credit'];
                $baseline['cd'] += $row['current_debit'];
                $baseline['cc'] += $row['current_credit'];
                $baseline['ed'] += $row['ending_debit'];
                $baseline['ec'] += $row['ending_credit'];
            }
        }

        $a = $this->createAccount('A');
        $b = $this->createAccount('B'); // balancing partner

        // Opening entry: A Dr 100,000 / B Cr 100,000
        $this->insertEntry('JETB-OPEN-'.uniqid(), 'Opening', '2025-01-01', [
            [$a['id'], 100000, 0],
            [$b['id'], 0, 100000],
        ]);

        // Regular in-year entries: A Dr 25,000 / B Cr 25,000 and B Dr 10,000 / A Cr 10,000
        $this->insertEntry('JETB-REG1-'.uniqid(), 'Regular', '2025-06-15', [
            [$a['id'], 25000, 0],
            [$b['id'], 0, 25000],
        ]);
        $this->insertEntry('JETB-REG2-'.uniqid(), 'Regular', '2025-08-20', [
            [$b['id'], 10000, 0],
            [$a['id'], 0, 10000],
        ]);

        $rows = $this->fetchReportRows(['start_date' => '2025-01-01', 'as_of_date' => '2025-12-31']);
        $ra = $this->rowFor($rows, $a['id']);
        $rb = $this->rowFor($rows, $b['id']);

        $this->assertNotNull($ra);
        $this->assertNotNull($rb);

        // Account A: Opening in BEGINNING only, Regular in CURRENT only.
        $this->assertSame(100000.0, (float) $ra['beginning_debit'], 'Opening debit must land in BEGINNING.');
        $this->assertSame(0.0, (float) $ra['beginning_credit'], 'Opening must not leak into CURRENT.');
        $this->assertSame(25000.0, (float) $ra['current_debit'], 'Regular debit must land in CURRENT.');
        $this->assertSame(10000.0, (float) $ra['current_credit'], 'Regular credit must land in CURRENT.');
        $this->assertSame(115000.0, (float) $ra['ending_debit'], 'Ending = Opening + Current movement (A).');

        // Account B mirrors the movements on the credit side.
        $this->assertSame(100000.0, (float) $rb['beginning_credit']);
        $this->assertSame(25000.0, (float) $rb['current_credit']);
        $this->assertSame(10000.0, (float) $rb['current_debit']);
        $this->assertSame(115000.0, (float) $rb['ending_credit']);

        // Grand totals (depth-0 roots only): the fixture delta must keep the
        // trial balance equalities intact in every bucket.
        $t = ['bd' => 0.0, 'bc' => 0.0, 'cd' => 0.0, 'cc' => 0.0, 'ed' => 0.0, 'ec' => 0.0];
        foreach ($rows as $row) {
            if (($row['depth'] ?? 0) === 0) {
                $t['bd'] += $row['beginning_debit'];
                $t['bc'] += $row['beginning_credit'];
                $t['cd'] += $row['current_debit'];
                $t['cc'] += $row['current_credit'];
                $t['ed'] += $row['ending_debit'];
                $t['ec'] += $row['ending_credit'];
            }
        }
        $this->assertEqualsWithDelta(0.0, ($t['bd'] - $t['bc']) - ($baseline['bd'] - $baseline['bc']), 0.01, 'Fixture delta must keep BEGINNING balanced.');
        $this->assertEqualsWithDelta(0.0, ($t['cd'] - $t['cc']) - ($baseline['cd'] - $baseline['cc']), 0.01, 'Fixture delta must keep CURRENT balanced.');
        $this->assertEqualsWithDelta(0.0, ($t['ed'] - $t['ec']) - ($baseline['ed'] - $baseline['ec']), 0.01, 'Fixture delta must keep ENDING balanced.');
    }

    /** Case 5: CURRENT respects the selected period start (pre-period Regular excluded). */
    public function test_current_respects_period_start(): void
    {
        $a = $this->createAccount('P');
        $b = $this->createAccount('P2');

        $this->insertEntry('JETB-OPEN-'.uniqid(), 'Opening', '2025-01-01', [
            [$a['id'], 40000, 0],
            [$b['id'], 0, 40000],
        ]);
        // Pre-period Regular movement: must NOT appear in CURRENT.
        $this->insertEntry('JETB-PRE-'.uniqid(), 'Regular', '2024-12-15', [
            [$a['id'], 9000, 0],
            [$b['id'], 0, 9000],
        ]);
        // In-period Regular movement: must appear in CURRENT.
        $this->insertEntry('JETB-IN-'.uniqid(), 'Regular', '2025-05-05', [
            [$a['id'], 5000, 0],
            [$b['id'], 0, 5000],
        ]);

        $rows = $this->fetchReportRows(['start_date' => '2025-01-01', 'as_of_date' => '2025-12-31']);
        $ra = $this->rowFor($rows, $a['id']);

        $this->assertNotNull($ra);
        $this->assertSame(40000.0, (float) $ra['beginning_debit'], 'BEGINNING = Opening only.');
        $this->assertSame(5000.0, (float) $ra['current_debit'], 'CURRENT must include only in-period Regular movement.');
        $this->assertSame(45000.0, (float) $ra['ending_debit'], 'Ending = Opening + in-period movement.');
    }

    /** Case 6: parent CURRENT aggregates children only — its own direct postings must not double-count. */
    public function test_parent_current_aggregates_children_without_double_counting(): void
    {
        $parent = $this->createAccount('PAR', 0);
        $c1 = $this->createAccount('C1', 1, $parent['code']);
        $c2 = $this->createAccount('C2', 1, $parent['code']);
        $partner = $this->createAccount('PART');

        // Children movements: C1 Dr 12,000 / partner Cr; partner Dr 3,000 / C2 Cr.
        $this->insertEntry('JETB-K1-'.uniqid(), 'Regular', '2025-04-10', [
            [$c1['id'], 12000, 0],
            [$partner['id'], 0, 12000],
        ]);
        $this->insertEntry('JETB-K2-'.uniqid(), 'Regular', '2025-07-10', [
            [$partner['id'], 3000, 0],
            [$c2['id'], 0, 3000],
        ]);
        // Parent's own DIRECT posting (double-count hazard).
        $this->insertEntry('JETB-PD-'.uniqid(), 'Regular', '2025-09-10', [
            [$parent['id'], 7000, 0],
            [$partner['id'], 0, 7000],
        ]);

        $rows = $this->fetchReportRows(['start_date' => '2025-01-01', 'as_of_date' => '2025-12-31']);
        $rp = $this->rowFor($rows, $parent['id']);

        $this->assertNotNull($rp);
        // Existing tree architecture: parent direct balances are zeroed and
        // totals aggregate strictly from children (double-count guard).
        // Children: C1 Dr 12,000 (entry 1), C2 Cr 3,000 (entry 2). The
        // parent's own DIRECT 7,000/7,000 posting must be excluded entirely.
        $this->assertSame(
            12000.0,
            (float) $rp['current_debit'],
            'Parent CURRENT debit = children only (C1 12,000); its direct 7,000 must not double-count.'
        );
        $this->assertSame(
            3000.0,
            (float) $rp['current_credit'],
            'Parent CURRENT credit = children only (C2 3,000); its direct 7,000 must not double-count.'
        );
    }

    /** Case 3: domain transaction types are in-year movements — they belong to CURRENT. */
    public function test_domain_transaction_type_counts_as_current(): void
    {
        $a = $this->createAccount('DOM');
        $b = $this->createAccount('DOM2');

        $this->insertEntry('JETB-DOM-'.uniqid(), 'SalesInvoice', '2025-06-01', [
            [$a['id'], 8000, 0],
            [$b['id'], 0, 8000],
        ]);

        $rows = $this->fetchReportRows(['start_date' => '2025-01-01', 'as_of_date' => '2025-12-31']);
        $ra = $this->rowFor($rows, $a['id']);

        $this->assertNotNull($ra);
        $this->assertSame(
            8000.0,
            (float) $ra['current_debit'],
            'Domain in-year transaction types (e.g. SalesInvoice) must count as CURRENT movement.'
        );
        $this->assertSame(0.0, (float) $ra['beginning_debit'], 'Domain types must not leak into BEGINNING.');
    }

    protected function tearDown(): void
    {
        DB::table('journal_entry_lines')
            ->whereIn('journal_entry_code', function ($q) {
                $q->select('entry_code')->from('journal_entries')
                    ->where('entry_code', 'like', 'JETB-%');
            })->delete();
        DB::table('journal_entries')->where('entry_code', 'like', 'JETB-%')->delete();
        DB::table('accounts')->where('AccName', 'like', 'JETB-TMP-%')->delete();

        parent::tearDown();
    }
}
