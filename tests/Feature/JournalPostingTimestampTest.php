<?php

namespace Tests\Feature;

use App\Models\Accounting\JournalEntry;
use App\Models\User;
use App\Services\Accounting\JournalReversalService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * GL Audit Phase 2 — journal_entries.posted_at lifecycle.
 *
 * The critical accounting date model, now enforced by the application:
 *
 *   journal_entries.date       = accounting/journal date (business meaning)
 *   journal_entries.created_at = record creation timestamp (never posting)
 *   journal_entries.posted_at  = the actual posting timestamp
 *
 * Contract pinned here:
 *   - Creating directly as Posted records posted_at = now().
 *   - Posting a draft (update, bulk post) records posted_at = now().
 *   - Merely EDITING an unposted draft never writes posted_at.
 *   - UNPOSTING never destroys the historical posting timestamp.
 *   - REPOSTING records the NEW posting time (every real transition to
 *     Posted sets posted_at = now()).
 *   - Pre-existing historical rows (no authoritative posting source) keep
 *     posted_at = NULL — the migration backfills NOTHING.
 *   - The central model hooks cover every Eloquent create/transition
 *     app-wide (document services, reversal service); query-builder mass
 *     updates set posted_at explicitly at their call sites.
 *
 * Historical simulation uses direct DB::table inserts so model events do
 * not fire — exactly like pre-migration rows.
 */
class JournalPostingTimestampTest extends TestCase
{
    use DatabaseTransactions;

    private int $companyId = 1;

    private User $user;

    private int $debitAccountId;

    private int $creditAccountId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        $this->user = User::create([
            'username' => 'glpost_'.uniqid(),
            'email' => 'glpost_'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company_id' => $this->companyId,
        ]);
        $this->actingAs($this->user, 'sanctum');

        // An open period covering today so posting is allowed regardless of
        // which committed fixture periods exist (rolled back with the test).
        $fyId = DB::table('fiscal_years')->insertGetId([
            'name' => 'GLPOST-FY-'.uniqid(),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'status' => 'open',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('accounting_periods')->insert([
            'fiscal_year_id' => $fyId,
            'name' => 'GLPOST-AP-'.uniqid(),
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->endOfMonth()->toDateString(),
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $suffix = uniqid();
        $this->debitAccountId = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLPOST-DR-'.$suffix,
            'AccType' => 1,
            'AccFinal' => 1,
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);
        $this->creditAccountId = (int) DB::table('accounts')->insertGetId([
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'GLPOST-CR-'.$suffix,
            'AccType' => 1,
            'AccFinal' => 1,
            'AccStopped' => 0,
            'company_id' => $this->companyId,
        ]);
    }

    // =====================================================================
    // helpers
    // =====================================================================

    private function storeJournal(string $status = 'UnPost'): string
    {
        $response = $this->postJson('/api/journals', [
            'date' => now()->toDateString(),
            'status' => $status,
            'description' => 'GLPOST journal',
            'lines' => [
                ['account_id' => $this->debitAccountId, 'debit' => 100, 'credit' => 0],
                ['account_id' => $this->creditAccountId, 'debit' => 0, 'credit' => 100],
            ],
        ]);
        $response->assertStatus(200);

        return (string) $response->json('data.entry_code');
    }

    private function updateStatus(string $entryCode, string $status, array $extra = []): void
    {
        $this->putJson("/api/journals/{$entryCode}", array_merge([
            'date' => now()->toDateString(),
            'status' => $status,
            'description' => 'GLPOST journal (edited)',
            'lines' => [
                ['account_id' => $this->debitAccountId, 'debit' => 100, 'credit' => 0],
                ['account_id' => $this->creditAccountId, 'debit' => 0, 'credit' => 100],
            ],
        ], $extra))->assertStatus(200);
    }

    private function postAll(array $journalIds): void
    {
        $this->postJson('/api/reports/post-journal', ['ids' => $journalIds])
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    private function unpostAll(array $journalIds): void
    {
        $this->postJson('/api/reports/unpost-journal', ['ids' => $journalIds])
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    private function journalId(string $entryCode): int
    {
        return (int) DB::table('journal_entries')->where('entry_code', $entryCode)->value('id');
    }

    private function postedAtOf(string $entryCode): ?string
    {
        return DB::table('journal_entries')->where('entry_code', $entryCode)->value('posted_at');
    }

    private function statusOf(string $entryCode): string
    {
        return (string) DB::table('journal_entries')->where('entry_code', $entryCode)->value('status');
    }

    // =====================================================================
    // create paths
    // =====================================================================

    /** @test */
    public function store_as_draft_leaves_posted_at_null(): void
    {
        $code = $this->storeJournal('UnPost');

        $this->assertSame('UnPost', $this->statusOf($code));
        $this->assertNull($this->postedAtOf($code), 'A draft is not posted — no posted_at.');
    }

    /** @test */
    public function store_as_posted_records_the_real_posting_time(): void
    {
        $code = $this->storeJournal('Post');

        $this->assertSame('Post', $this->statusOf($code));
        $postedAt = $this->postedAtOf($code);
        $this->assertNotNull($postedAt, 'Created-as-posted must record posted_at.');
        $this->assertEqualsWithDelta(
            now()->timestamp,
            strtotime((string) $postedAt),
            65,
            'posted_at is the actual posting moment, not a fabricated value.'
        );
    }

    /** @test */
    public function eloquent_create_as_posted_records_posted_at(): void
    {
        // The path every document service and the reversal service use:
        // JournalEntry::create(['status' => 'Post']).
        $entry = JournalEntry::create([
            'entry_code' => 'GLPOST-C-'.uniqid(),
            'entry_type' => 'Regular',
            'date' => now()->toDateString(),
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        $this->assertNotNull($entry->fresh()->posted_at, 'Eloquent create-as-posted must record posted_at.');
    }

    /** @test */
    public function eloquent_draft_edit_never_sets_posted_at(): void
    {
        $entry = JournalEntry::create([
            'entry_code' => 'GLPOST-D-'.uniqid(),
            'entry_type' => 'Regular',
            'date' => now()->toDateString(),
            'status' => 'UnPost',
            'company_id' => $this->companyId,
        ]);

        $entry->update(['description' => 'draft edit only']);

        $this->assertSame('UnPost', $entry->fresh()->status);
        $this->assertNull($entry->fresh()->posted_at, 'Editing a draft must not fabricate a posting time.');
    }

    // =====================================================================
    // update path (draft → Posted)
    // =====================================================================

    /** @test */
    public function updating_a_draft_to_posted_records_posted_at(): void
    {
        $code = $this->storeJournal('UnPost');
        $this->assertNull($this->postedAtOf($code));

        $this->updateStatus($code, 'Post');

        $this->assertSame('Post', $this->statusOf($code));
        $this->assertNotNull($this->postedAtOf($code), 'The draft→Posted transition records posted_at.');
    }

    /** @test */
    public function merely_editing_a_draft_keeps_posted_at_null(): void
    {
        $code = $this->storeJournal('UnPost');

        $this->updateStatus($code, 'UnPost', ['description' => 'just a draft edit']);

        $this->assertSame('UnPost', $this->statusOf($code));
        $this->assertNull($this->postedAtOf($code), 'Editing a draft must NOT set posted_at.');
    }

    // =====================================================================
    // bulk post / unpost / repost
    // =====================================================================

    /** @test */
    public function bulk_post_records_posted_at_for_every_selected_journal(): void
    {
        $codeA = $this->storeJournal('UnPost');
        $codeB = $this->storeJournal('UnPost');

        $this->postAll([$this->journalId($codeA), $this->journalId($codeB)]);

        $this->assertSame('Post', $this->statusOf($codeA));
        $this->assertSame('Post', $this->statusOf($codeB));
        $this->assertNotNull($this->postedAtOf($codeA));
        $this->assertNotNull($this->postedAtOf($codeB));
    }

    /** @test */
    public function unposting_preserves_the_historical_posted_at(): void
    {
        $code = $this->storeJournal('Post');
        $id = $this->journalId($code);

        // Simulate a known historical posting time.
        DB::table('journal_entries')->where('id', $id)->update(['posted_at' => '2025-01-01 08:00:00']);

        $this->unpostAll([$id]);

        $this->assertSame('UnPost', $this->statusOf($code));
        $this->assertSame(
            '2025-01-01 08:00:00',
            $this->postedAtOf($code),
            'Unposting must NOT destroy the historical posting timestamp.'
        );
    }

    /** @test */
    public function reposting_records_the_new_posting_time(): void
    {
        $code = $this->storeJournal('Post');
        $id = $this->journalId($code);

        DB::table('journal_entries')->where('id', $id)->update(['posted_at' => '2025-01-01 08:00:00']);
        $this->unpostAll([$id]);
        $this->postAll([$id]);

        $this->assertSame('Post', $this->statusOf($code));
        $repostedAt = (string) $this->postedAtOf($code);
        $this->assertNotSame('2025-01-01 08:00:00', $repostedAt, 'A repost is a new posting event.');
        $this->assertEqualsWithDelta(
            now()->timestamp,
            strtotime($repostedAt),
            65,
            'posted_at reflects the most recent real posting.'
        );
    }

    // =====================================================================
    // historical data safety
    // =====================================================================

    /** @test */
    public function pre_existing_historical_rows_keep_posted_at_null(): void
    {
        // A row inserted the way pre-migration data exists — bypassing
        // Eloquent, status Post, no posted_at. Nothing may fabricate a
        // posting time for it.
        $code = 'GLPOST-HIST-'.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => 'Regular',
            'date' => '2025-01-05 10:00:00',
            'description' => 'GLPOST historical row',
            'total_amount' => 100,
            'status' => 'Post',
            'company_id' => $this->companyId,
            'created_at' => '2025-01-05 10:00:05',
            'updated_at' => '2025-01-05 10:00:05',
        ]);

        $this->assertSame('Post', $this->statusOf($code));
        $this->assertNull(
            $this->postedAtOf($code),
            'Historical rows keep posted_at NULL — no backfill from created_at/updated_at.'
        );
    }

    // =====================================================================
    // reversal service (accounting-core create-as-posted path)
    // =====================================================================

    /** @test */
    public function reversal_entries_record_posted_at(): void
    {
        $code = 'GLPOST-REV-'.uniqid();
        $entry = JournalEntry::create([
            'entry_code' => $code,
            'entry_type' => 'Regular',
            'date' => now()->toDateString(),
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);
        DB::table('journal_entry_lines')->insert([
            'journal_entry_code' => $code,
            'account_id' => $this->debitAccountId,
            'debit' => 100,
            'credit' => 0,
            'company_id' => $this->companyId,
        ]);

        $reversal = app(JournalReversalService::class)->createReversal($code, 'GLPOST reversal test');

        $this->assertNotNull($reversal);
        $this->assertNotNull(
            $reversal->fresh()->posted_at,
            'A reversal journal is created directly as Posted and must record posted_at.'
        );
        $this->assertNotNull($entry->fresh()->posted_at);
    }

    // =====================================================================
    // GL Audit Phase 3 — the General Ledger exposes POSTED AT
    // =====================================================================

    /** @test */
    public function general_ledger_exposes_posted_at_per_row_without_fabricating_history(): void
    {
        // A freshly posted journal (Eloquent → hook records posted_at) and
        // a historical row inserted the pre-migration way (posted_at NULL).
        $liveCode = 'GLPOST-GL-'.uniqid();
        JournalEntry::create([
            'entry_code' => $liveCode,
            'entry_type' => 'Regular',
            'date' => now()->toDateString().' 10:00:00',
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);
        DB::table('journal_entry_lines')->insert([
            'journal_entry_code' => $liveCode,
            'account_id' => $this->debitAccountId,
            'debit' => 100,
            'credit' => 0,
            'company_id' => $this->companyId,
        ]);

        $histCode = 'GLPOST-GLH-'.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $histCode,
            'entry_type' => 'Regular',
            'date' => now()->toDateString().' 11:00:00',
            'status' => 'Post',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('journal_entry_lines')->insert([
            'journal_entry_code' => $histCode,
            'account_id' => $this->debitAccountId,
            'debit' => 50,
            'credit' => 0,
            'company_id' => $this->companyId,
        ]);

        $response = $this->getJson('/api/reports/general-ledger?account_id='.$this->debitAccountId.'&status=all');
        $response->assertStatus(200);

        $rows = collect($response->json('entries'))
            ->whereIn('journal_code', [$liveCode, $histCode])
            ->values();
        $this->assertCount(2, $rows);

        $live = $rows->firstWhere('journal_code', $liveCode);
        $hist = $rows->firstWhere('journal_code', $histCode);

        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/',
            (string) $live['posted_at'],
            'The live journal exposes its real posting timestamp as YYYY-MM-DD HH:mm:ss.'
        );
        $this->assertNull(
            $hist['posted_at'],
            'Historical rows expose NULL — the UI renders an em-dash, never a fabricated value.'
        );

        // The Phase 1 contract is untouched: DATE stays date-only while
        // POSTED AT carries the time component.
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', (string) $live['date']);
    }
}
