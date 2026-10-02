<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * PHASE 0 — General Ledger CHARACTERIZATION test suite (safety net).
 *
 * Target under test:
 *   LIVE endpoint  JournalController::generalLedger()
 *   GET /api/reports/general-ledger   (routes/api.php)
 *
 * These tests PIN THE CURRENT BEHAVIOUR of the live General Ledger before
 * any audit fix is applied. They intentionally assert what the code does
 * TODAY, including the defects confirmed by the READ-ONLY audit:
 *
 *   [Phase 1]  FIXED in Phase 1: `date` is presented DATE-ONLY
 *              (YYYY-MM-DD) by the API; the underlying DATETIME of
 *              journal_entries.date still drives SQL filtering/sorting.
 *   [Phase 4 APPLIED] date_to = YYYY-MM-DD now includes the ENTIRE final
 *              day (exclusive next-midnight comparison); same-day rows at
 *              10:00/17:00/23:00 are returned. Next-day midnight is still
 *              excluded. An explicitly timed date_to keeps its exact bound.
 *   [Phase 3 APPLIED] posted_at — the real posting timestamp (Phase 2
 *              column) — is presented per row as YYYY-MM-DD HH:mm:ss;
 *              historical rows keep NULL (the UI shows an em-dash, never
 *              a fabricated value). Ledger ordering still runs on the
 *              accounting date.
 *   [Phase 7]  No company scoping (cross-company tests arrive with
 *              Phase 7; out of scope for Phase 0).
 *   [Phase 9 APPLIED] Real server-side pagination: page/per_page are
 *              honored (per_page=-1 = full-ledger export contract); the
 *              pagination payload ({total, per_page, current_page,
 *              last_page}) exists; running balance stays continuous
 *              across pages; totals/closing are page-independent.
 *   [Phase 10] Opening Balance = ALL posted activity before date_from,
 *              regardless of entry_type (Rule A: an entry_type='Opening'
 *              journal and a 'Regular' journal both contribute, and an
 *              Opening-type journal inside the period is a normal
 *              movement row). This differs from Trial Balance, which
 *              special-cases entry_type='Opening'.
 *   [Phase 12] Status literals persisted include Post, UnPost, Posted,
 *              lowercase 'posted' and the import default 'Unposted'.
 *              journal_entries.status uses the utf8mb4_unicode_ci
 *              collation, so whereIn(['Post','Posted']) also matches
 *              'posted' (ci-equal to 'Posted'), while whereNotIn(...)
 *              still keeps 'Unposted' (not equal to 'UnPost'). Filters
 *              behave consistently on MySQL today; canonicalisation is
 *              still required for portability and cross-report parity.
 *   [Phase 6 APPLIED] AccDmType follows the canonical convention
 *              credit iff 1 (App\Support\AccountNature): 0-legacy, 2
 *              (Debit, the 46 expense accounts) and null are Debit.
 *   [Phase 8 APPLIED] The dead FinancialReportController GL duplicate was
 *              removed; its is_balanced per-row flag was ported into the
 *              canonical live endpoint (JournalController::generalLedger).
 *
 * RULES:
 *   - Do NOT "fix" a failing assertion here casually. A failing
 *     characterization test means the phase that intentionally changes
 *     that behaviour must update the assertion AND the annotation above.
 *   - Fixtures are GLT-prefixed and removed in tearDown; nothing else in
 *     the database is touched.
 */
class GeneralLedgerCharacterizationTest extends TestCase
{
    /** @var array<string,int> label => AccID */
    private array $accounts = [];

    /** @var array<string,string> label => entry_code */
    private array $codes = [];

    private int $companyId = 1;

    private ?User $glUser = null;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        // Safety net: characterization fixtures must never touch a live
        // database. The repo's .env.testing points at *_testing databases.
        $databaseName = (string) config('database.connections.mysql.database');
        $this->assertStringContainsString(
            'testing',
            strtolower($databaseName),
            'General Ledger tests must run against the isolated test database, got: '.$databaseName
        );

        $this->companyId = (int) (DB::table('users')->value('company_id') ?: 1);

        $this->glUser = User::create([
            'username' => 'gl_admin_'.uniqid(),
            'email' => 'gl_admin_'.uniqid().'@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
        ]);

        $this->seedFixtures();
    }

    protected function tearDown(): void
    {
        if ($this->codes !== []) {
            DB::table('journal_entry_lines')
                ->whereIn('journal_entry_code', array_values($this->codes))
                ->delete();
            DB::table('journal_entries')
                ->whereIn('entry_code', array_values($this->codes))
                ->delete();
        }

        if ($this->accounts !== []) {
            DB::table('accounts')
                ->whereIn('AccID', array_values($this->accounts))
                ->delete();
        }

        if ($this->glUser) {
            DB::table('users')->where('id', $this->glUser->id)->delete();
        }

        parent::tearDown();
    }

    // =====================================================================
    // FIXTURES
    // =====================================================================

    private function createGlAccount(string $label, int $dmType): int
    {
        $id = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLT-TMP-'.$label.'-'.uniqid(),
            'AccType' => 1,
            'AccParent' => null,
            'AccDmType' => $dmType,
            'AccFinal' => 1,
            'Nature' => 'asset',
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);

        $this->accounts[$label] = $id;

        return $id;
    }

    /**
     * @param array<int,array{0:int,1:float,2:float}> $lines [accountId, debit, credit]
     */
    private function createGlEntry(string $label, string $date, string $status, string $entryType, array $lines): void
    {
        $code = 'GLT-'.$label.'-'.uniqid();

        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => $entryType,
            'reference' => 'GLT-REF-'.$label,
            'date' => $date,
            'description' => 'GLT fixture '.$label,
            'total_amount' => array_sum(array_column($lines, 1)),
            'status' => $status,
            'company_id' => $this->companyId,
        ]);

        foreach ($lines as [$accountId, $debit, $credit]) {
            DB::table('journal_entry_lines')->insert([
                'journal_entry_code' => $code,
                'account_id' => $accountId,
                'debit' => $debit,
                'credit' => $credit,
                'company_id' => $this->companyId,
            ]);
        }

        $this->codes[$label] = $code;
    }

    /**
     * Standard GLT fixture set.
     *
     * Accounts:
     *   debit  AccDmType=0  (GL: Debit nature)
     *   credit AccDmType=1  (GL: Credit nature)
     *   other  AccDmType=0  (counterparty; never queried directly)
     *   isod   AccDmType=0  (cross-account isolation debit side)
     *   isoc   AccDmType=0  (cross-account isolation credit side)
     *   status AccDmType=0  (status-literal probes)
     *   dm2    AccDmType=2  (audit conflict probe: 46 live accounts = 2)
     *
     * Journals on `debit` / `credit` (mirror amounts unless noted):
     *   j1     2025-01-01 08:00  Post     Regular   D/C 1000
     *   j2     2025-02-01 09:00  Post     Opening   D/C  700
     *   j3     2025-03-10 10:00  Post     Regular   D/C  500
     *   j4     2025-03-10 15:00  UnPost   Regular   D/C  300
     *   j11    2025-03-20 12:00  Post     Regular   debit account CREDITED 150
     *   j12    2025-03-25 08:00  Post     Regular   credit account DEBITED 250
     *   j5     2025-03-31 00:00  Post     Regular   D/C  100
     *   j6     2025-03-31 10:00  Post     Regular   D/C  400
     *   j7     2025-03-31 17:00  Post     Regular   D/C  200
     *   j15    2025-03-31 23:00  Post     Regular   D/C  300
     *   j8     2025-04-01 00:00  Post     Regular   D/C  800
     *   j9     2025-04-01 10:00  Posted   Regular   D/C  600
     *   j10    2025-04-02 11:00  UnPost   Regular   D/C  350
     *
     * Status probes on `status` account:
     *   jstat1 2025-03-05 09:00  'posted'    (lowercase) D 500
     *   jstat2 2025-03-06 09:00  'Unposted'  (import default) D 400
     *
     * Others:
     *   jiso   2025-03-15 09:00  Post     isod/isoc 999
     *   jdm2   2025-03-28 10:00  Post     dm2 D 50 / other C 50
     */
    private function seedFixtures(): void
    {
        $debit = $this->createGlAccount('debit', 0);
        $credit = $this->createGlAccount('credit', 1);
        $other = $this->createGlAccount('other', 0);
        $isod = $this->createGlAccount('isod', 0);
        $isoc = $this->createGlAccount('isoc', 0);
        $status = $this->createGlAccount('status', 0);
        $dm2 = $this->createGlAccount('dm2', 2);

        $pair = fn (float $amount): array => [
            [$debit, $amount, 0],
            [$credit, 0, $amount],
        ];

        $this->createGlEntry('j1', '2025-01-01 08:00:00', 'Post', 'Regular', $pair(1000));
        $this->createGlEntry('j2', '2025-02-01 09:00:00', 'Post', 'Opening', $pair(700));
        $this->createGlEntry('j3', '2025-03-10 10:00:00', 'Post', 'Regular', $pair(500));
        $this->createGlEntry('j4', '2025-03-10 15:00:00', 'UnPost', 'Regular', $pair(300));

        $this->createGlEntry('jstat1', '2025-03-05 09:00:00', 'posted', 'Regular', [
            [$status, 500, 0],
            [$other, 0, 500],
        ]);
        $this->createGlEntry('jstat2', '2025-03-06 09:00:00', 'Unposted', 'Regular', [
            [$status, 400, 0],
            [$other, 0, 400],
        ]);

        $this->createGlEntry('jiso', '2025-03-15 09:00:00', 'Post', 'Regular', [
            [$isod, 999, 0],
            [$isoc, 0, 999],
        ]);

        // Credit to the debit-nature account (running balance must decrease).
        $this->createGlEntry('j11', '2025-03-20 12:00:00', 'Post', 'Regular', [
            [$debit, 0, 150],
            [$other, 150, 0],
        ]);
        // Debit to the credit-nature account (running balance must decrease).
        $this->createGlEntry('j12', '2025-03-25 08:00:00', 'Post', 'Regular', [
            [$credit, 250, 0],
            [$other, 0, 250],
        ]);
        $this->createGlEntry('jdm2', '2025-03-28 10:00:00', 'Post', 'Regular', [
            [$dm2, 50, 0],
            [$other, 0, 50],
        ]);

        $this->createGlEntry('j5', '2025-03-31 00:00:00', 'Post', 'Regular', $pair(100));
        $this->createGlEntry('j6', '2025-03-31 10:00:00', 'Post', 'Regular', $pair(400));
        $this->createGlEntry('j7', '2025-03-31 17:00:00', 'Post', 'Regular', $pair(200));
        $this->createGlEntry('j15', '2025-03-31 23:00:00', 'Post', 'Regular', $pair(300));

        $this->createGlEntry('j8', '2025-04-01 00:00:00', 'Post', 'Regular', $pair(800));
        $this->createGlEntry('j9', '2025-04-01 10:00:00', 'Posted', 'Regular', $pair(600));
        $this->createGlEntry('j10', '2025-04-02 11:00:00', 'UnPost', 'Regular', $pair(350));
    }

    // =====================================================================
    // HELPERS
    // =====================================================================

    private function gl(array $params): TestResponse
    {
        return $this->actingAs($this->glUser, 'sanctum')
            ->getJson('/api/reports/general-ledger?'.http_build_query($params));
    }

    /** @return array<int,string> journal codes in response order */
    private function codes(TestResponse $response): array
    {
        return array_column($response->json('entries') ?? [], 'journal_code');
    }

    /**
     * Assert the ordered [label => running_balance] sequence of the entries.
     *
     * @param array<int,array{0:string,1:float}> $expected
     */
    private function assertRunningSequence(TestResponse $response, array $expected): void
    {
        $entries = $response->json('entries');
        $this->assertCount(count($expected), $entries, 'Unexpected number of ledger rows.');

        foreach ($expected as $index => [$label, $running]) {
            $this->assertSame(
                $this->codes[$label],
                $entries[$index]['journal_code'],
                "Row {$index} should be journal {$label}."
            );
            $this->assertEqualsWithDelta(
                $running,
                $entries[$index]['running_balance'],
                0.001,
                "Running balance of {$label} (row {$index})."
            );
        }
    }

    private function assertAmount(TestResponse $response, string $key, float $expected): void
    {
        $this->assertEqualsWithDelta(
            $expected,
            (float) $response->json($key),
            0.001,
            "Unexpected {$key}."
        );
    }

    private function entryByLabel(TestResponse $response, string $label): array
    {
        foreach ($response->json('entries') as $entry) {
            if ($entry['journal_code'] === $this->codes[$label]) {
                return $entry;
            }
        }

        $this->fail("Journal {$label} not found in ledger response.");
    }

    // =====================================================================
    // 1. AUTH / VALIDATION / ACCOUNT SELECTION
    // =====================================================================

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/reports/general-ledger?account_id='.$this->accounts['debit'])
            ->assertStatus(401);
    }

    public function test_missing_or_invalid_filters_are_rejected(): void
    {
        $this->actingAs($this->glUser, 'sanctum')
            ->getJson('/api/reports/general-ledger')
            ->assertStatus(422);

        $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'bogus'])
            ->assertStatus(422);

        $this->gl(['account_id' => 999999999])
            ->assertStatus(404);
    }

    public function test_account_selection_returns_only_selected_account_journals(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'all']);
        $response->assertStatus(200);

        // Account block reflects the requested account.
        $this->assertSame($this->accounts['debit'], $response->json('account.id'));
        $this->assertSame(0, $response->json('account.dm_type'));
        $this->assertSame('Debit', $response->json('account.dm_label'));

        // Exactly the journals containing a `debit` account line, in date order.
        $this->assertSame([
            $this->codes['j1'], $this->codes['j2'], $this->codes['j3'], $this->codes['j4'],
            $this->codes['j11'], $this->codes['j5'], $this->codes['j6'], $this->codes['j7'],
            $this->codes['j15'], $this->codes['j8'], $this->codes['j9'], $this->codes['j10'],
        ], $this->codes($response));

        // Totals are computed only from the selected account's lines.
        $this->assertAmount($response, 'total_debit', 5250); // 1000+700+500+300+100+400+200+300+800+600+350
        $this->assertAmount($response, 'total_credit', 150);  // j11 only

        // A different account sees only its own journals (isolation).
        $iso = $this->gl(['account_id' => $this->accounts['isod'], 'status' => 'all']);
        $iso->assertStatus(200);
        $this->assertSame([$this->codes['jiso']], $this->codes($iso));
        $this->assertAmount($iso, 'total_debit', 999);
        $this->assertAmount($iso, 'closing_balance', 999);
    }

    // =====================================================================
    // 2. STATUS FILTERS
    // =====================================================================

    public function test_default_status_is_posted(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit']]);
        $response->assertStatus(200);

        // The endpoint defaults to the posted view when no status is sent.
        $this->assertSame('posted', $response->json('filters.status'));

        $this->assertSame([
            $this->codes['j1'], $this->codes['j2'], $this->codes['j3'],
            $this->codes['j11'], $this->codes['j5'], $this->codes['j6'],
            $this->codes['j7'], $this->codes['j15'], $this->codes['j8'],
            $this->codes['j9'],
        ], $this->codes($response));

        $this->assertAmount($response, 'total_debit', 4600);
        $this->assertAmount($response, 'total_credit', 150);
        $this->assertAmount($response, 'closing_balance', 4450);
    }

    public function test_posted_filter_includes_post_and_posted_literals_and_excludes_unpost(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'posted']);
        $response->assertStatus(200);

        $codes = $this->codes($response);

        // 'Post' (j1) and 'Posted' (j9) are in the posted view...
        $this->assertContains($this->codes['j1'], $codes);
        $this->assertContains($this->codes['j9'], $codes);
        $this->assertSame('Posted', $this->entryByLabel($response, 'j9')['status']);

        // ...while 'UnPost' journals are excluded.
        $this->assertNotContains($this->codes['j4'], $codes);
        $this->assertNotContains($this->codes['j10'], $codes);

        $this->assertCount(10, $codes);
    }

    public function test_unposted_filter_returns_only_unposted_journals(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'unposted']);
        $response->assertStatus(200);

        $this->assertSame([$this->codes['j4'], $this->codes['j10']], $this->codes($response));
        $this->assertAmount($response, 'total_debit', 650); // 300 + 350
        $this->assertAmount($response, 'total_credit', 0);
        $this->assertAmount($response, 'opening_balance', 0);
        $this->assertAmount($response, 'closing_balance', 650);
    }

    public function test_all_status_returns_journals_with_every_persisted_status_literal(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'all']);
        $response->assertStatus(200);

        $this->assertCount(12, $response->json('entries'));

        // Raw persisted literals are echoed back per row (no normalisation).
        $this->assertSame('Post', $this->entryByLabel($response, 'j1')['status']);
        $this->assertSame('UnPost', $this->entryByLabel($response, 'j4')['status']);
        $this->assertSame('Posted', $this->entryByLabel($response, 'j9')['status']);

        $this->assertAmount($response, 'total_debit', 5250);
        $this->assertAmount($response, 'total_credit', 150);
        $this->assertAmount($response, 'closing_balance', 5100); // 5250 - 150
    }

    public function test_lowercase_posted_status_literal_matches_posted_view_via_ci_collation(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['status'], 'status' => 'posted']);
        $response->assertStatus(200);

        // CHARACTERIZATION (Phase 12): journal_entries.status is
        // varchar(20) with utf8mb4_unicode_ci, so whereIn(['Post','Posted'])
        // ALSO matches the lowercase literal 'posted' (ci-equal to
        // 'Posted'). The lowercase-posted journal DOES appear in the
        // posted view today; canonicalisation is still needed for
        // portability (other drivers / case-sensitive collations).
        $this->assertSame([$this->codes['jstat1']], $this->codes($response));
        $this->assertAmount($response, 'total_debit', 500);
        $this->assertAmount($response, 'closing_balance', 500);
        $this->assertSame('Debit', $response->json('account.dm_label'));
    }

    public function test_unposted_view_includes_import_default_unposted_literal(): void
    {
        // JournalImportService defaults status to 'Unposted'.
        $unposted = $this->gl(['account_id' => $this->accounts['status'], 'status' => 'unposted']);
        $unposted->assertStatus(200);

        // CHARACTERIZATION (Phase 12): whereNotIn(['Post','Posted']) under
        // utf8mb4_unicode_ci EXCLUDES 'posted' (ci-equal to 'Posted') but
        // KEEPS the import default 'Unposted' (not equal to 'UnPost' —
        // different length) alongside 'UnPost' journals.
        $this->assertSame(
            [$this->codes['jstat2']],
            $this->codes($unposted)
        );
        $this->assertAmount($unposted, 'total_debit', 400);

        $all = $this->gl(['account_id' => $this->accounts['status'], 'status' => 'all']);
        $all->assertStatus(200);
        $this->assertCount(2, $all->json('entries'));
        $this->assertAmount($all, 'total_debit', 900); // 500 + 400
        $this->assertSame('posted', $this->entryByLabel($all, 'jstat1')['status']);
        $this->assertSame('Unposted', $this->entryByLabel($all, 'jstat2')['status']);
    }

    // =====================================================================
    // 3. OPENING / RUNNING / CLOSING BALANCE
    // =====================================================================

    public function test_opening_balance_is_all_pre_period_activity_regardless_of_entry_type(): void
    {
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-03-01',
            'date_to' => '2025-03-31',
            'status' => 'posted',
        ]);
        $response->assertStatus(200);

        // CHARACTERIZATION (Phase 10, Rule A candidate): opening balance =
        // ALL posted activity before date_from. It includes the Regular j1
        // (1000) AND the entry_type='Opening' j2 (700). It is NOT limited
        // to entry_type='Opening' (700) as Trial Balance would compute.
        $this->assertAmount($response, 'opening_balance', 1700);

        // Phase 4 FIX APPLIED: the movement now includes every posted
        // journal of March — the 03-10 rows (j3, j11), the 03-20 credit
        // (j11 already listed), and ALL four 03-31 rows (00:00/10:00/17:00
        // /23:00), in date order. Under the old defective boundary only
        // the midnight journal (j5) of the final day qualified.
        $this->assertSame(
            [
                $this->codes['j3'], $this->codes['j11'], $this->codes['j5'],
                $this->codes['j6'], $this->codes['j7'], $this->codes['j15'],
            ],
            $this->codes($response)
        );
        $this->assertAmount($response, 'total_debit', 1500); // 500+100+400+200+300
        $this->assertAmount($response, 'total_credit', 150); // j11
        $this->assertAmount($response, 'closing_balance', 3050); // 1700 + 1500 - 150
    }

    public function test_opening_entry_inside_period_appears_as_movement_row(): void
    {
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-02-01',
            'date_to' => '2025-02-28',
            'status' => 'posted',
        ]);
        $response->assertStatus(200);

        // Pre-period Regular j1 becomes the opening balance.
        $this->assertAmount($response, 'opening_balance', 1000);

        // The entry_type='Opening' journal j2 (dated inside the period) is a
        // normal movement row — no synthetic opening row is injected by the
        // backend (the frontend adds the display-only "Opening balance" row).
        $this->assertSame([$this->codes['j2']], $this->codes($response));
        $this->assertEqualsWithDelta(700, $this->entryByLabel($response, 'j2')['debit'], 0.001);
        $this->assertAmount($response, 'closing_balance', 1700);
    }

    public function test_running_balance_accumulates_in_accounting_date_order(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'all']);
        $response->assertStatus(200);

        // CHARACTERIZATION: rows are ordered by journal_entries.date
        // (accounting date), then entry_code, then line id — NOT by
        // posting order. Opening balance with no date_from is 0.
        $this->assertAmount($response, 'opening_balance', 0);

        $this->assertRunningSequence($response, [
            ['j1', 1000],
            ['j2', 1700],
            ['j3', 2200],
            ['j4', 2500],
            ['j11', 2350], // credit of 150 to the debit-nature account decreases it
            ['j5', 2450],
            ['j6', 2850],
            ['j7', 3050],
            ['j15', 3350],
            ['j8', 4150],
            ['j9', 4750],
            ['j10', 5100],
        ]);

        $this->assertAmount($response, 'closing_balance', 5100);
    }

    public function test_debit_nature_account_uses_debit_minus_credit(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'posted']);
        $response->assertStatus(200);

        $this->assertSame(0, $response->json('account.dm_type'));
        $this->assertSame('Debit', $response->json('account.dm_label'));

        $this->assertRunningSequence($response, [
            ['j1', 1000],
            ['j2', 1700],
            ['j3', 2200],
            ['j11', 2050], // credit line => balance goes DOWN for a Debit account
            ['j5', 2150],
            ['j6', 2550],
            ['j7', 2750],
            ['j15', 3050],
            ['j8', 3850],
            ['j9', 4450],
        ]);

        $j11 = $this->entryByLabel($response, 'j11');
        $this->assertEqualsWithDelta(0, $j11['debit'], 0.001);
        $this->assertEqualsWithDelta(150, $j11['credit'], 0.001);

        $this->assertAmount($response, 'total_debit', 4600);
        $this->assertAmount($response, 'total_credit', 150);
        $this->assertAmount($response, 'closing_balance', 4450);
    }

    public function test_credit_nature_account_uses_credit_minus_debit(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['credit'], 'status' => 'posted']);
        $response->assertStatus(200);

        $this->assertSame(1, $response->json('account.dm_type'));
        $this->assertSame('Credit', $response->json('account.dm_label'));

        $this->assertRunningSequence($response, [
            ['j1', 1000],
            ['j2', 1700],
            ['j3', 2200],
            ['j12', 1950], // debit line => balance goes DOWN for a Credit account
            ['j5', 2050],
            ['j6', 2450],
            ['j7', 2650],
            ['j15', 2950],
            ['j8', 3750],
            ['j9', 4350],
        ]);

        $j12 = $this->entryByLabel($response, 'j12');
        $this->assertEqualsWithDelta(250, $j12['debit'], 0.001);
        $this->assertEqualsWithDelta(0, $j12['credit'], 0.001);

        $this->assertAmount($response, 'total_debit', 250);
        $this->assertAmount($response, 'total_credit', 4600);
        $this->assertAmount($response, 'closing_balance', 4350);
    }

    // =====================================================================
    // 4. DATE FROM / DATE TO BOUNDARIES
    // =====================================================================

    public function test_date_from_excludes_prior_activity_from_movement_but_keeps_it_in_opening(): void
    {
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-03-10',
            'status' => 'all',
        ]);
        $response->assertStatus(200);

        // Everything before 2025-03-10 00:00:00 is opening, not movement.
        $this->assertAmount($response, 'opening_balance', 1700); // j1 + j2

        $codes = $this->codes($response);
        $this->assertNotContains($this->codes['j1'], $codes);
        $this->assertNotContains($this->codes['j2'], $codes);

        // 2025-03-10 10:00:00 (j3) IS included: date_from compares the full
        // datetime against the date literal cast to 00:00:00.
        $this->assertSame($this->codes['j3'], $codes[0]);

        $this->assertAmount($response, 'total_debit', 3550);
        $this->assertAmount($response, 'total_credit', 150);
        $this->assertAmount($response, 'closing_balance', 5100); // 1700 + 3550 - 150
    }

    public function test_date_from_includes_midnight_entry_at_period_start(): void
    {
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-04-01',
            'status' => 'all',
        ]);
        $response->assertStatus(200);

        $this->assertAmount($response, 'opening_balance', 3350); // (3500 D - 150 C) before 2025-04-01

        $codes = $this->codes($response);
        $this->assertSame([$this->codes['j8'], $this->codes['j9'], $this->codes['j10']], $codes);

        // The journal stored at exactly midnight is part of the movement
        // and presents date-only (Phase 1).
        $this->assertSame('2025-04-01', $this->entryByLabel($response, 'j8')['date']);

        $this->assertAmount($response, 'total_debit', 1750); // 800 + 600 + 350
        $this->assertAmount($response, 'closing_balance', 5100);
    }

    public function test_date_to_final_day_includes_every_same_day_row(): void
    {
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-03-31',
            'date_to' => '2025-03-31',
            'status' => 'posted',
        ]);
        $response->assertStatus(200);

        // Opening: everything strictly before 2025-03-31 00:00:00.
        // j1 1000 + j2 700 + j3 500 debit, j11 150 credit => 2050.
        $this->assertAmount($response, 'opening_balance', 2050);

        // Phase 4 FIX APPLIED (was the confirmed HIGH defect):
        // journal_entries.date is DATETIME; a date-only date_to now covers
        // the ENTIRE final day (exclusive next-midnight comparison), so the
        // 00:00, 10:00, 17:00 and 23:00 journals all appear, in time order.
        $this->assertSame([
            $this->codes['j5'], $this->codes['j6'], $this->codes['j7'], $this->codes['j15'],
        ], $this->codes($response));

        $this->assertAmount($response, 'total_debit', 1000); // 100 + 400 + 200 + 300
        $this->assertAmount($response, 'closing_balance', 3050); // 2050 + 1000

        // Sanity: these journals exist, are posted, and share the final day.
        $this->assertSame('2025-03-31 10:00:00', DB::table('journal_entries')
            ->where('entry_code', $this->codes['j6'])->value('date'));
        $this->assertSame('Post', DB::table('journal_entries')
            ->where('entry_code', $this->codes['j7'])->value('status'));
    }

    public function test_date_to_final_day_includes_all_day_rows_and_excludes_other_days(): void
    {
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-04-01',
            'date_to' => '2025-04-01',
            'status' => 'posted',
        ]);
        $response->assertStatus(200);

        $this->assertAmount($response, 'opening_balance', 3050); // 3200 D - 150 C

        // Phase 4 FIX APPLIED: the ENTIRE selected final day is included —
        // the midnight journal (j8) AND the same-day 10:00 journal (j9,
        // persisted with the 'Posted' literal). The next-day journal (j10,
        // 2025-04-02) is excluded — by date, and it is also UnPost.
        $this->assertSame([$this->codes['j8'], $this->codes['j9']], $this->codes($response));

        $this->assertAmount($response, 'total_debit', 1400); // 800 + 600
        $this->assertAmount($response, 'closing_balance', 4450); // 3050 + 1400
    }

    public function test_same_day_entries_are_returned_in_time_order(): void
    {
        // date_to = '2025-03-11' keeps this test valid under BOTH the old
        // (Phase 4 defect) and the fixed boundary semantics; since the fix,
        // date_to = '2025-03-10' returns the same two rows (the whole final
        // day is included — see the Phase 4 boundary tests).
        $response = $this->gl([
            'account_id' => $this->accounts['debit'],
            'date_from' => '2025-03-10',
            'date_to' => '2025-03-11',
            'status' => 'all',
        ]);
        $response->assertStatus(200);

        // Same calendar day (2025-03-10), ordered by the time component of
        // the DATETIME: 10:00 (j3) before 15:00 (j4).
        $this->assertSame([$this->codes['j3'], $this->codes['j4']], $this->codes($response));

        $this->assertAmount($response, 'opening_balance', 1700);
        $this->assertRunningSequence($response, [
            ['j3', 2200],
            ['j4', 2500],
        ]);
        $this->assertAmount($response, 'total_debit', 800);
        $this->assertAmount($response, 'closing_balance', 2500);
    }

    // =====================================================================
    // 5. DATE PRESENTATION (Phase 1: date-only; underlying DATETIME kept)
    // =====================================================================

    public function test_date_field_returns_date_only_presentation_values(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'all']);
        $response->assertStatus(200);

        // Audit Phase 1 (required verification): every time-of-day variant
        // of journal_entries.date presents ONLY the calendar date in the
        // DATE column — midnight, 10:00, 12:00 and 23:00 alike.
        $this->assertSame('2025-03-31', $this->entryByLabel($response, 'j5')['date']); // 00:00:00
        $this->assertSame('2025-03-10', $this->entryByLabel($response, 'j3')['date']); // 10:00:00
        $this->assertSame('2025-03-20', $this->entryByLabel($response, 'j11')['date']); // 12:00:00
        $this->assertSame('2025-03-31', $this->entryByLabel($response, 'j15')['date']); // 23:00:00
        $this->assertSame('2025-04-01', $this->entryByLabel($response, 'j9')['date']);  // 10:00:00

        // Contract: date-only format, never a datetime artifact.
        foreach ($response->json('entries') as $entry) {
            $this->assertMatchesRegularExpression(
                '/^\d{4}-\d{2}-\d{2}$/',
                (string) $entry['date'],
                'DATE must be presented as YYYY-MM-DD.'
            );
        }
    }

    // =====================================================================
    // 6. EXPORT / PAGINATION CONTRACT (Phase 9 APPLIED: real pagination)
    // =====================================================================

    public function test_export_parity_full_ledger_returned_page_and_per_page_ignored(): void
    {
        $plain = $this->gl(['account_id' => $this->accounts['debit'], 'status' => 'all']);
        $plain->assertStatus(200);

        // Phase 9 APPLIED (was a characterization of the ignore): page and
        // per_page are honored. The default per_page is the project's page
        // size (15) — this fixture's 12 rows fit one page, so the plain
        // request still carries all 12 rows, and the pagination payload
        // now exists.
        $this->assertArrayHasKey('pagination', $plain->json(), 'Phase 9: the pagination payload exists.');
        $this->assertSame(12, $plain->json('pagination.total'));
        $this->assertSame(1, $plain->json('pagination.current_page'));
        $this->assertCount(12, $plain->json('entries'));

        $paged = $this->gl([
            'account_id' => $this->accounts['debit'],
            'status' => 'all',
            'page' => 2,
            'per_page' => 5,
        ]);
        $paged->assertStatus(200);
        // Page 2 carries ONLY its slice (the running balance stays
        // continuous — pinned in GeneralLedgerPaginationTest).
        $this->assertCount(5, $paged->json('entries'));
        $this->assertSame(2, $paged->json('pagination.current_page'));
        $this->assertSame(12, $paged->json('pagination.total'));
        $this->assertSame(3, $paged->json('pagination.last_page'));

        $export = $this->gl([
            'account_id' => $this->accounts['debit'],
            'status' => 'all',
            'per_page' => -1,
        ]);
        $export->assertStatus(200);

        // Export contract: per_page=-1 returns the FULL ledger — the exact
        // rows the client-side Excel export consumes, same values the
        // screen shows.
        $this->assertCount(12, $export->json('entries'));
        $this->assertSame(
            array_slice($this->codes($plain), 5, 5),
            $this->codes($paged),
            'Page 2 holds exactly the second slice of the full ledger.'
        );
        $this->assertSame($export->json('entries'), $plain->json('entries'));
        $this->assertSame($plain->json('opening_balance'), $export->json('opening_balance'));
        $this->assertSame($plain->json('closing_balance'), $export->json('closing_balance'));
        $this->assertSame($plain->json('total_debit'), $export->json('total_debit'));
        $this->assertSame($plain->json('total_credit'), $export->json('total_credit'));

        // Every field the Excel export consumes must be present per row...
        $row = $plain->json('entries.0');
        foreach (['date', 'posted_at', 'journal_code', 'reference', 'description', 'debit', 'credit', 'running_balance', 'status'] as $key) {
            $this->assertArrayHasKey($key, $row, "Export field {$key} missing.");
        }
        // Phase 1: the export's Date column comes from the same date-only
        // presentation value as the screen (parity by construction).
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', (string) $row['date']);

        // Phase 3 APPLIED: posted_at is now presented per row — the actual
        // posting timestamp as YYYY-MM-DD HH:mm:ss, or NULL for historical
        // rows (never fabricated). The top-level payload still carries no
        // aggregate posted_at.
        $this->assertArrayNotHasKey('posted_at', $plain->json());
        $this->assertArrayHasKey('posted_at', $row, 'Phase 3: POSTED AT is exposed per row.');
        $this->assertThat(
            $row['posted_at'],
            $this->logicalOr(
                $this->isNull(),
                $this->matchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/')
            ),
            'posted_at is a datetime string or NULL — never fabricated.'
        );
        // Phase 8 APPLIED: is_balanced (per-journal debit/credit equality,
        // ported from the dead duplicate before its removal) now ships in
        // every row; the frontend's unbalanced-icon/status contract reads
        // it.
        $this->assertArrayHasKey('is_balanced', $row, 'Phase 8: is_balanced is exposed per row.');
        $this->assertContains($row['is_balanced'], [0, 1], 'is_balanced is an integrity flag (0/1).');
    }

    // =====================================================================
    // 7. AccDmType CONVENTION (Phase 6 evidence)
    // =====================================================================

    public function test_account_with_dm_type_2_is_treated_as_debit_nature_by_live_gl(): void
    {
        $response = $this->gl(['account_id' => $this->accounts['dm2'], 'status' => 'all']);
        $response->assertStatus(200);

        // Phase 6 FIX APPLIED (was a characterization of the conflict): the
        // canonical convention is credit iff AccDmType == 1
        // (App\Support\AccountNature). The 46 live AccDmType = 2 accounts
        // are Debit-nature (all Nature='expense', code range 6xx) and were
        // misclassified as Credit by the old `(int)$x === 0` rule.
        $this->assertSame(2, $response->json('account.dm_type'));
        $this->assertSame('Debit', $response->json('account.dm_label'));

        // Debit-nature math: delta = debit - credit => the 50 debit row
        // produces a +50 running balance.
        $this->assertSame([$this->codes['jdm2']], $this->codes($response));
        $this->assertAmount($response, 'total_debit', 50);
        $this->assertAmount($response, 'total_credit', 0);
        $this->assertAmount($response, 'closing_balance', 50);
    }
}
