<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * GL Audit Phase 9 — real server-side pagination of the General Ledger.
 *
 * Contract pinned here:
 *
 *   - page / per_page are honored; the response carries the project's
 *     pagination payload {total, per_page, current_page, last_page};
 *   - the RUNNING BALANCE never restarts at a page boundary: page 2
 *     continues from page 1's last row because the backend accumulates
 *     every row up to the end of the requested page and slices only the
 *     payload;
 *   - opening balance is logically independent of slicing — page 1 and
 *     page 2 report the SAME opening balance and the SAME page-independent
 *     totals/closing;
 *   - per_page = -1 is the full-ledger export contract: every row, in the
 *     same order and with the same values as the concatenated pages;
 *   - an out-of-range page returns an empty entries slice but keeps the
 *     page-independent aggregates intact.
 */
class GeneralLedgerPaginationTest extends TestCase
{
    use DatabaseTransactions;

    private int $companyId = 1;

    private User $user;

    private int $accountId;

    private int $otherAccountId;

    /** @var array<string,string> label => entry_code */
    private array $codes = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        $this->user = User::create([
            'username' => 'glpag_'.uniqid(),
            'email' => 'glpag_'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
        ]);
        $this->actingAs($this->user, 'sanctum');

        $suffix = uniqid();
        $this->accountId = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLPAG-ACC-'.$suffix,
            'AccType' => 1,
            'AccFinal' => 1,
            'AccDmType' => 0,
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);
        $this->otherAccountId = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLPAG-OTH-'.$suffix,
            'AccType' => 1,
            'AccFinal' => 1,
            'AccDmType' => 0,
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);

        // 12 posted journals of 100 each on consecutive minutes of one day —
        // deterministic ordering (same date, entry_code tiebreak is random
        // hex, so order by an increasing time component instead).
        $base = \Carbon\Carbon::parse('2025-06-01 09:00:00');
        for ($i = 1; $i <= 12; $i++) {
            $this->createEntry('p'.$i, $base->copy()->addMinutes($i)->toDateTimeString(), 100.0 * $i);
        }
    }

    private function createEntry(string $label, string $datetime, float $amount): void
    {
        $code = 'GLPAG-'.$label.'-'.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => 'Regular',
            'date' => $datetime,
            'description' => 'GLPAG fixture '.$label,
            'total_amount' => $amount,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);
        DB::table('journal_entry_lines')->insert([
            'journal_entry_code' => $code,
            'account_id' => $this->accountId,
            'debit' => $amount,
            'credit' => 0,
            'company_id' => $this->companyId,
        ]);
        DB::table('journal_entry_lines')->insert([
            'journal_entry_code' => $code,
            'account_id' => $this->otherAccountId,
            'debit' => 0,
            'credit' => $amount,
            'company_id' => $this->companyId,
        ]);
        $this->codes[$label] = $code;
    }

    private function ledger(int $accountId, array $params = []): \Illuminate\Testing\TestResponse
    {
        return $this->getJson('/api/reports/general-ledger?'.http_build_query(array_merge([
            'account_id' => $accountId,
            'date_from' => '2025-06-01',
            'date_to' => '2025-06-02',
            'status' => 'posted',
        ], $params)));
    }

    /** @test */
    public function pages_are_sliced_and_the_payload_uses_the_project_shape(): void
    {
        $page1 = $this->ledger($this->accountId, ['page' => 1, 'per_page' => 5]);
        $page1->assertStatus(200);

        $this->assertSame(12, $page1->json('pagination.total'));
        $this->assertSame(5, $page1->json('pagination.per_page'));
        $this->assertSame(1, $page1->json('pagination.current_page'));
        $this->assertSame(3, $page1->json('pagination.last_page'));
        $this->assertCount(5, $page1->json('entries'));

        // Rows 1..5 in time order (amounts 100..500).
        $this->assertSame(
            array_map(fn ($i) => $this->codes['p'.$i], range(1, 5)),
            array_column($page1->json('entries'), 'journal_code')
        );
    }

    /** @test */
    public function running_balance_is_continuous_across_pages(): void
    {
        $page1 = $this->ledger($this->accountId, ['page' => 1, 'per_page' => 5])->json();
        $page2 = $this->ledger($this->accountId, ['page' => 2, 'per_page' => 5])->json();
        $page3 = $this->ledger($this->accountId, ['page' => 3, 'per_page' => 5])->json();

        // Running at p5 = 100+200+300+400+500 = 1500 (page 1's last row);
        // p6 on page 2 continues: 1500 + 600 = 2100; p12 = 1200 closes the
        // ledger at 7800 = the closing balance.
        $this->assertEqualsWithDelta(1500, (float) $page1['entries'][4]['running_balance'], 0.001);
        $this->assertEqualsWithDelta(2100, (float) $page2['entries'][0]['running_balance'], 0.001,
            'Page 2 MUST continue from page 1 — never restart at zero.');
        $this->assertEqualsWithDelta(7800, (float) $page3['entries'][1]['running_balance'], 0.001,
            'The last row of the last page equals the closing balance.');

        // Page-independent aggregates: identical on every page.
        foreach ([$page1, $page2, $page3] as $page) {
            $this->assertEqualsWithDelta(0, (float) $page['opening_balance'], 0.001);
            $this->assertEqualsWithDelta(7800, (float) $page['total_debit'], 0.001);
            $this->assertEqualsWithDelta(7800, (float) $page['closing_balance'], 0.001);
        }

        // Concatenated pages reproduce the full ledger in order.
        $all = array_merge(
            array_column($page1['entries'], 'journal_code'),
            array_column($page2['entries'], 'journal_code'),
            array_column($page3['entries'], 'journal_code'),
        );
        $this->assertSame(
            array_map(fn ($i) => $this->codes['p'.$i], range(1, 12)),
            $all
        );
    }

    /** @test */
    public function export_contract_per_page_minus_one_returns_the_full_ledger(): void
    {
        $export = $this->ledger($this->accountId, ['per_page' => -1]);
        $export->assertStatus(200);

        $this->assertCount(12, $export->json('entries'));
        $this->assertEqualsWithDelta(7800, (float) $export->json('closing_balance'), 0.001);
        $this->assertEqualsWithDelta(7800, (float) $export->json('entries.11.running_balance'), 0.001);

        // Same order the paged slices produce.
        $this->assertSame(
            array_map(fn ($i) => $this->codes['p'.$i], range(1, 12)),
            array_column($export->json('entries'), 'journal_code')
        );

        // The export payload still exposes pagination (total + effective
        // per_page) so the client can show "exported N rows".
        $this->assertSame(12, $export->json('pagination.total'));
        $this->assertSame(12, $export->json('pagination.per_page'));
    }

    /** @test */
    public function an_out_of_range_page_keeps_the_page_independent_aggregates(): void
    {
        $response = $this->ledger($this->accountId, ['page' => 99, 'per_page' => 5]);
        $response->assertStatus(200);

        $this->assertSame([], $response->json('entries'));
        $this->assertSame(12, $response->json('pagination.total'));
        $this->assertEqualsWithDelta(7800, (float) $response->json('closing_balance'), 0.001);
        $this->assertEqualsWithDelta(7800, (float) $response->json('total_debit'), 0.001);
    }

    /** @test */
    public function opening_balance_is_identical_on_every_page(): void
    {
        // Pre-period opening: one journal before date_from.
        $this->createEntry('pre', '2025-05-20 10:00:00', 3000.0);

        $page1 = $this->ledger($this->accountId, ['page' => 1, 'per_page' => 5])->json();
        $page2 = $this->ledger($this->accountId, ['page' => 2, 'per_page' => 5])->json();

        $this->assertEqualsWithDelta(3000, (float) $page1['opening_balance'], 0.001);
        $this->assertEqualsWithDelta(3000, (float) $page2['opening_balance'], 0.001,
            'The opening balance must not be affected by page slicing.');

        // And the running balance on page 2 row 1 (p6) continues from it:
        // 3000 opening + page 1 (100+…+500 = 1500) + 600 = 5100.
        $this->assertEqualsWithDelta(5100, (float) $page2['entries'][0]['running_balance'], 0.001);
    }
}
