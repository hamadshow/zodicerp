<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * GL Audit Phase 7 — company scoping of the General Ledger pipeline.
 *
 * The live endpoint previously ignored company_id entirely: Company A
 * could select Company B's account and read Company B's journal lines.
 * The contract pinned here:
 *
 *   - a foreign account is invisible to the GL (404, the standard
 *     multi-company boundary);
 *   - ledger queries (opening, movement, totals, closing) only see the
 *     caller's company's journals — a foreign journal hitting the SAME
 *     account_id must never contribute;
 *   - NULL-company accounts are SHARED master data (the documented
 *     convention) and stay visible to every company;
 *   - NULL-company journals are pre-stamping legacy rows and stay visible
 *     (the test DB has none today, the fixture pins the predicate);
 *   - the account dropdown (index + tree) respects the same boundary —
 *     and the `ids` re-inclusion branch cannot smuggle a foreign id past
 *     the company filter;
 *   - journals created through the API are stamped with the creator's
 *     company (the stamp the scoped GL bulk-posting depends on).
 */
class GeneralLedgerCompanyScopeTest extends TestCase
{
    use DatabaseTransactions;

    private const CO_A = 1;

    private const CO_B = 2;

    private User $userA;

    private User $userB;

    private int $accA;

    private int $accB;

    private int $sharedAcc;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        foreach ([self::CO_A, self::CO_B] as $cid) {
            DB::table('company')->insertOrIgnore([
                'id' => $cid,
                'company_name' => 'GLSCOPE Co '.$cid,
                'company_code' => 'GLS'.$cid,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $suffix = uniqid();
        foreach ([['A', self::CO_A], ['B', self::CO_B]] as [$label, $cid]) {
            $user = User::create([
                'username' => 'glscope_'.$label.'_'.$suffix,
                'email' => 'glscope_'.$label.'_'.$suffix.'@test.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'company_id' => $cid,
            ]);
            if ($label === 'A') {
                $this->userA = $user;
            } else {
                $this->userB = $user;
            }
        }

        $this->accA = $this->createAccount('A', self::CO_A);
        $this->accB = $this->createAccount('B', self::CO_B);
        $this->sharedAcc = $this->createAccount('SHARED', null);

        // J1: company A's own journal on its account.
        $this->postJournal('GLS-J1-', now()->toDateString(), self::CO_A, [
            [$this->accA, 100, 0],
            [$this->otherLine($this->accA), 0, 100],
        ]);
        // J2: company B's journal on B's account.
        $this->postJournal('GLS-J2-', now()->toDateString(), self::CO_B, [
            [$this->accB, 500, 0],
            [$this->otherLine($this->accB), 0, 500],
        ]);
        // J3: THE LEAK CASE — company B's journal hitting company A's account.
        $this->postJournal('GLS-J3-', now()->toDateString(), self::CO_B, [
            [$this->accA, 300, 0],
            [$this->otherLine($this->accA), 0, 300],
        ]);
        // J4: a company A journal on the SHARED (NULL-company) account.
        $this->postJournal('GLS-J4-', now()->toDateString(), self::CO_A, [
            [$this->sharedAcc, 700, 0],
            [$this->otherLine($this->sharedAcc), 0, 700],
        ]);
        // J5: a NULL-stamped pre-stamping legacy journal on A's account.
        $this->postJournal('GLS-J5-', now()->toDateString(), null, [
            [$this->accA, 900, 0],
            [$this->otherLine($this->accA), 0, 900],
        ]);
        // J6: company A unposted draft on its account.
        $this->postJournal('GLS-J6-', now()->toDateString(), self::CO_A, [
            [$this->accA, 250, 0],
            [$this->otherLine($this->accA), 0, 250],
        ], 'UnPost');
    }

    private function createAccount(string $label, ?int $companyId): int
    {
        return (int) DB::table('accounts')->insertGetId([
            'AccCode' => '9'.random_int(1000000, 9999999),
            'AccName' => 'GLSCOPE-'.$label.'-'.uniqid(),
            'AccType' => 1,
            'AccFinal' => 1,
            'AccDmType' => 0,
            'AccStopped' => 0,
            'company_id' => $companyId,
        ]);
    }

    private function otherLine(int $exclude): int
    {
        // A second account as counterparty — company A owned, like the GL
        // fixtures' "other" account (never queried directly).
        static $cache = [];
        if (! isset($cache[$exclude])) {
            $cache[$exclude] = $this->createAccount('OTH'.count($cache), self::CO_A);
        }

        return $cache[$exclude];
    }

    private function postJournal(string $prefix, string $date, ?int $companyId, array $lines, string $status = 'Post'): void
    {
        $code = $prefix.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => 'Regular',
            'date' => $date,
            'description' => 'GLSCOPE fixture',
            'total_amount' => array_sum(array_column($lines, 1)),
            'status' => $status,
            'company_id' => $companyId,
        ]);
        foreach ($lines as [$accountId, $debit, $credit]) {
            DB::table('journal_entry_lines')->insert([
                'journal_entry_code' => $code,
                'account_id' => $accountId,
                'debit' => $debit,
                'credit' => $credit,
                'company_id' => $companyId,
            ]);
        }
    }

    private function ledger(User $user, int $accountId, string $status = 'all'): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($user, 'sanctum')
            ->getJson('/api/reports/general-ledger?account_id='.$accountId.'&status='.$status);
    }

    private function accountIdsInDropdown(User $user, string $endpoint): array
    {
        $response = $this->actingAs($user, 'sanctum')->getJson($endpoint);
        $response->assertStatus(200);

        return array_map('intval', array_column($response->json(), 'AccID'));
    }

    /** @test */
    public function ledger_scopes_accounts_and_journals_to_the_callers_company(): void
    {
        // Company A sees its own journals (J1 100, J6 250 UnPost) plus the
        // legacy NULL-stamped row (J5 900) on its account — but NOT J3
        // (300), company B's journal that hits the same account_id.
        $response = $this->ledger($this->userA, $this->accA);
        $response->assertStatus(200);

        $amounts = array_map(fn ($e) => (float) $e['debit'], $response->json('entries'));
        $this->assertEqualsWithDelta([100.0, 900.0, 250.0], $amounts, 0.001, 'Foreign journals must not leak; legacy NULL rows stay visible (order: entry_code tiebreak).');
        $this->assertEqualsWithDelta(1250.0, (float) $response->json('total_debit'), 0.001);
        $this->assertEqualsWithDelta(1250.0, (float) $response->json('closing_balance'), 0.001);

        // A foreign account is invisible: 404, the standard boundary.
        $this->ledger($this->userA, $this->accB)->assertStatus(404);
        $this->ledger($this->userB, $this->accA)->assertStatus(404);

        // Company B sees only its own journal on its own account.
        $own = $this->ledger($this->userB, $this->accB);
        $own->assertStatus(200);
        $this->assertEqualsWithDelta([500.0], array_map(fn ($e) => (float) $e['debit'], $own->json('entries')), 0.001);

        // The status filter keeps scoping: posted-only for A excludes the
        // unposted J6 AND the foreign J3.
        $posted = $this->ledger($this->userA, $this->accA, 'posted');
        $posted->assertStatus(200);
        $this->assertEqualsWithDelta([100.0, 900.0], array_map(fn ($e) => (float) $e['debit'], $posted->json('entries')), 0.001);
    }

    /** @test */
    public function shared_null_company_accounts_stay_visible_to_every_company(): void
    {
        // NULL-company accounts are shared master data (the documented
        // convention behind the posting resolvers): both companies can read
        // their GL — each seeing only their OWN journals on it.
        $forA = $this->ledger($this->userA, $this->sharedAcc);
        $forA->assertStatus(200);
        $this->assertEqualsWithDelta([700.0], array_map(fn ($e) => (float) $e['debit'], $forA->json('entries')), 0.001);

        $forB = $this->ledger($this->userB, $this->sharedAcc);
        $forB->assertStatus(200);
        $this->assertSame([], $forB->json('entries'), 'Company B has no journals on the shared account.');
    }

    /** @test */
    public function account_dropdown_scopes_to_the_callers_company_and_shared_rows(): void
    {
        $forA = $this->accountIdsInDropdown($this->userA, '/api/accounts');
        $this->assertContains($this->accA, $forA);
        $this->assertContains($this->sharedAcc, $forA, 'Shared NULL-company accounts stay visible.');
        $this->assertNotContains($this->accB, $forA, 'Foreign accounts must not leak into the dropdown.');

        $forB = $this->accountIdsInDropdown($this->userB, '/api/accounts');
        $this->assertContains($this->accB, $forB);
        $this->assertContains($this->sharedAcc, $forB);
        $this->assertNotContains($this->accA, $forB);

        // tree(): the same boundary.
        $treeForB = $this->accountIdsInDropdown($this->userB, '/api/accounts/tree');
        $this->assertContains($this->accB, $treeForB);
        $this->assertNotContains($this->accA, $treeForB);
    }

    /** @test */
    public function dropdown_ids_reinclusion_cannot_smuggle_a_foreign_id(): void
    {
        // The ids parameter exists to re-include a selected row hidden by
        // filters — it must not override the company boundary.
        $response = $this->actingAs($this->userA, 'sanctum')
            ->getJson('/api/accounts?ids='.$this->accB);
        $response->assertStatus(200);

        $ids = array_map('intval', array_column($response->json(), 'AccID'));
        $this->assertNotContains($this->accB, $ids, 'A foreign id must not be smuggled past the company filter.');
    }

    /** @test */
    public function gl_rows_expose_is_balanced_per_journal(): void
    {
        // Phase 8: the per-journal debit/credit equality flag (ported from
        // the dead FinancialReportController duplicate before its removal)
        // drives the UI's unbalanced-icon/status contract.
        $unbalancedCode = 'GLSCOPE-UB-'.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $unbalancedCode,
            'entry_type' => 'Regular',
            'date' => now()->toDateString(),
            'description' => 'GLSCOPE unbalanced probe',
            'total_amount' => 100,
            'status' => 'Post',
            'company_id' => self::CO_A,
        ]);
        DB::table('journal_entry_lines')->insert([
            'journal_entry_code' => $unbalancedCode,
            'account_id' => $this->accA,
            'debit' => 100,
            'credit' => 0,
            'company_id' => self::CO_A,
        ]);

        $response = $this->ledger($this->userA, $this->accA);
        $response->assertStatus(200);

        $rows = collect($response->json('entries'))->keyBy('journal_code');
        $unbalanced = $rows->first(fn ($row) => str_starts_with((string) $row['journal_code'], 'GLSCOPE-UB-'));
        $this->assertSame(0, $unbalanced['is_balanced'], 'A journal whose lines do not net to zero is flagged unbalanced.');

        $balancedRow = $rows->first(fn ($row) => str_starts_with((string) $row['journal_code'], 'GLS-J1-'));
        $this->assertSame(1, $balancedRow['is_balanced'], 'A balanced journal is flagged balanced.');
    }

    /** @test */
    public function api_created_journals_are_company_stamped_and_visible_in_gl(): void
    {
        // store() now stamps the creator's company — the stamp the scoped
        // GL and bulk posting depend on (previously new journals were
        // NULL-company and would be invisible to company-scoped queries).
        $this->actingAs($this->userA, 'sanctum');
        $store = $this->postJson('/api/journals', [
            'date' => now()->toDateString(),
            'status' => 'UnPost',
            'description' => 'GLSCOPE stamp probe',
            'lines' => [
                ['account_id' => $this->accA, 'debit' => 75, 'credit' => 0],
                ['account_id' => $this->sharedAcc, 'debit' => 0, 'credit' => 75],
            ],
        ])->assertStatus(200);

        $this->assertNotNull($store->json('data.entry_code'));

        $stampedCompanyId = DB::table('journal_entries')
            ->where('entry_code', $store->json('data.entry_code'))
            ->value('company_id');
        $this->assertSame(self::CO_A, (int) $stampedCompanyId, 'API-created journals must be stamped with the creator company.');

        // Bulk post is company scoped: company A's bulk post must NOT touch
        // company B's drafts. Create a B draft:
        $this->postJournal('GLS-J7-', now()->toDateString(), self::CO_B, [
            [$this->accB, 42, 0],
            [$this->otherLine($this->accB), 0, 42],
        ], 'UnPost');

        $this->postJson('/api/reports/post-journal', [])->assertStatus(200);

        // Every company A unposted journal got posted...
        $this->assertSame(
            'Post',
            DB::table('journal_entries')->where('entry_code', $store->json('data.entry_code'))->value('status')
        );
        // ...and the company B draft stayed untouched.
        $bDraft = DB::table('journal_entries')
            ->where('description', 'GLSCOPE fixture')
            ->where('company_id', self::CO_B)
            ->where('total_amount', 42)
            ->value('status');
        $this->assertSame('UnPost', $bDraft, 'Bulk posting must stay inside the caller company.');
    }
}
