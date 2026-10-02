<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * GL Audit Phase 4 — the Date To boundary regression battery.
 *
 * journal_entries.date is DATETIME; the UI supplies date_to as a plain
 * date. The old `h.date <= '2025-12-31'` comparison cast the bound to
 * midnight and silently excluded every same-day journal posted after
 * 00:00:00 (audit: HIGH). The fixed contract, pinned here:
 *
 *   - Date To = D includes the ENTIRE day D: 00:00, 10:00, 17:00 and
 *     23:00 rows all appear, in time order;
 *   - the next day's midnight (D+1 00:00:00) is EXCLUDED;
 *   - totals and the closing balance stay consistent with exactly the
 *     included rows (they derive from the movement query);
 *   - Date From semantics are UNCHANGED: activity strictly before
 *     date_from 00:00:00 is opening, never movement;
 *   - an explicitly timed date_to keeps its exact inclusive bound.
 *
 * Rows are inserted directly (historical style, bypassing Eloquent) so
 * the fixture is independent of the posting-timestamp hooks.
 */
class GeneralLedgerDateBoundaryTest extends TestCase
{
    use DatabaseTransactions;

    private int $companyId = 1;

    private User $user;

    private int $accountId;

    private int $otherAccountId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        $this->user = User::create([
            'username' => 'glbnd_'.uniqid(),
            'email' => 'glbnd_'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
        ]);
        $this->actingAs($this->user, 'sanctum');

        $suffix = uniqid();
        $this->accountId = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLBND-ACC-'.$suffix,
            'AccType' => 1,
            'AccFinal' => 1,
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);
        $this->otherAccountId = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLBND-OTH-'.$suffix,
            'AccType' => 1,
            'AccFinal' => 1,
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);

        // early  : 2025-03-15 09:00  500
        // four   : 2025-03-31 00:00 / 10:00 / 17:00 / 23:00  100/200/300/400
        // nextday: 2025-04-01 00:00  999  (next-day midnight)
        $this->createEntry('GLBND-EARLY-', '2025-03-15 09:00:00', 500);
        $this->createEntry('GLBND-D0-', '2025-03-31 00:00:00', 100);
        $this->createEntry('GLBND-D1-', '2025-03-31 10:00:00', 200);
        $this->createEntry('GLBND-D2-', '2025-03-31 17:00:00', 300);
        $this->createEntry('GLBND-D3-', '2025-03-31 23:00:00', 400);
        $this->createEntry('GLBND-NEXT-', '2025-04-01 00:00:00', 999);
    }

    private function createEntry(string $codePrefix, string $datetime, float $amount, string $entryType = 'Regular'): void
    {
        $code = $codePrefix.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => $entryType,
            'reference' => 'GLBND-REF',
            'date' => $datetime,
            'description' => 'GLBND fixture '.$datetime,
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
    }

    private function ledger(string $dateFrom, string $dateTo): TestResponse
    {
        return $this->getJson(
            '/api/reports/general-ledger?account_id='.$this->accountId
            .'&date_from='.$dateFrom.'&date_to='.$dateTo.'&status=posted'
        );
    }

    /**
     * The raw DATETIME of each returned row, in the exact order the API
     * returned them (ordering contract: accounting date, then code, then
     * line id).
     *
     * @return array<int,string>
     */
    private function rawDatesInResponseOrder(TestResponse $response): array
    {
        $codes = array_column($response->json('entries'), 'journal_code');
        $datesByCode = DB::table('journal_entries')
            ->whereIn('entry_code', $codes)
            ->pluck('date', 'entry_code');

        return array_map(fn (string $code) => (string) $datesByCode[$code], $codes);
    }

    /** @test */
    public function date_to_includes_the_entire_final_day_and_excludes_next_midnight(): void
    {
        // date_from = 2025-03-20 puts the early entry (03-15) into the
        // opening so the movement is exactly the four final-day rows.
        $response = $this->ledger('2025-03-20', '2025-03-31');
        $response->assertStatus(200);

        $this->assertCount(4, $response->json('entries'), 'All four same-day journals must be included.');
        $this->assertSame(
            [
                '2025-03-31 00:00:00',
                '2025-03-31 10:00:00',
                '2025-03-31 17:00:00',
                '2025-03-31 23:00:00',
            ],
            $this->rawDatesInResponseOrder($response),
            'Every time-of-day variant of the final day is included, in time order.'
        );

        $this->assertEqualsWithDelta(500, (float) $response->json('opening_balance'), 0.001, 'Pre-period activity stays opening.');
        $this->assertEqualsWithDelta(1000, (float) $response->json('total_debit'), 0.001, 'Totals cover exactly the included rows.');
        $this->assertEqualsWithDelta(1500, (float) $response->json('closing_balance'), 0.001, 'Closing = opening + movement.');
    }

    /** @test */
    public function next_day_midnight_is_excluded_from_the_final_day(): void
    {
        // The 2025-04-01 00:00:00 journal sits outside Date To = 2025-03-31
        // under the exclusive next-midnight bound.
        $response = $this->ledger('2025-03-01', '2025-03-31');
        $response->assertStatus(200);

        $this->assertNotContains(
            '2025-04-01 00:00:00',
            $this->rawDatesInResponseOrder($response),
            'Next-day midnight must be excluded.'
        );
    }

    /** @test */
    public function single_day_period_captures_every_same_day_row(): void
    {
        $response = $this->ledger('2025-03-31', '2025-03-31');
        $response->assertStatus(200);

        $this->assertCount(4, $response->json('entries'));
        $this->assertEqualsWithDelta(500, (float) $response->json('opening_balance'), 0.001);
        $this->assertEqualsWithDelta(1000, (float) $response->json('total_debit'), 0.001);
        $this->assertEqualsWithDelta(1500, (float) $response->json('closing_balance'), 0.001);
    }

    /** @test */
    public function a_day_without_entries_returns_opening_only(): void
    {
        // Nothing exists on 2025-04-02; the next-midnight journal
        // (2025-04-01 00:00:00) belongs to the OPENING (strictly before
        // date_from), never to the movement — Date From semantics unchanged.
        $response = $this->ledger('2025-04-02', '2025-04-02');
        $response->assertStatus(200);

        $this->assertSame([], $response->json('entries'));
        $this->assertEqualsWithDelta(2499, (float) $response->json('opening_balance'), 0.001); // 500+1000+999
        $this->assertEqualsWithDelta(0.0, (float) $response->json('total_debit'), 0.001);
        $this->assertEqualsWithDelta(2499, (float) $response->json('closing_balance'), 0.001);
    }

    /** @test */
    public function an_opening_type_journal_at_date_from_is_a_movement_row_not_opening(): void
    {
        // Phase 10 decision record (Rule A): the opening balance is bounded
        // by DATE, not by entry_type. An entry_type='Opening' journal dated
        // exactly AT date_from belongs to the movement — not the opening —
        // while an Opening journal BEFORE date_from is opening like any
        // other activity.
        $this->createEntry('GLBND-OPEN-', '2025-03-31 08:00:00', 55.0, 'Opening');

        $response = $this->ledger('2025-03-31', '2025-03-31');
        $response->assertStatus(200);

        $this->assertEqualsWithDelta(500, (float) $response->json('opening_balance'), 0.001,
            'Only the pre-period regular activity is opening.');
        $this->assertCount(5, $response->json('entries'), 'The Opening-type journal at date_from is a movement row.');
        $this->assertEqualsWithDelta(1055, (float) $response->json('total_debit'), 0.001); // 1000 + 55
    }

    /** @test */
    public function explicitly_timed_date_to_keeps_its_exact_bound(): void
    {
        // Non-UI callers may send a datetime bound; it keeps second-precision
        // inclusive semantics (documented Phase 4 behaviour). The window
        // 2025-03-01 .. 2025-03-31 10:00:00 holds the early entry and the
        // 00:00 + 10:00 final-day rows; 17:00/23:00 stay out.
        $response = $this->getJson(
            '/api/reports/general-ledger?account_id='.$this->accountId
            .'&date_from=2025-03-01&date_to='.urlencode('2025-03-31 10:00:00').'&status=posted'
        );
        $response->assertStatus(200);

        $this->assertCount(3, $response->json('entries'));
        $this->assertEqualsWithDelta(800, (float) $response->json('total_debit'), 0.001); // 500 + 100 + 200
        $this->assertEqualsWithDelta(0.0, (float) $response->json('opening_balance'), 0.001);
        $this->assertEqualsWithDelta(800, (float) $response->json('closing_balance'), 0.001);
    }
}
