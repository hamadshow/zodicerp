<?php

namespace Tests\Feature;

use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\TreasuryTransaction;
use App\Services\Accounting\JournalReversalService;
use App\Services\TreasuryService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 17 — the journal_reversals link table.
 *
 * 'Which journal entry is the LIVE one for a document reference' used to be
 * answered by probing for a '<entry_code>-REV' sibling (code-suffix
 * convention). The relationship is now a real edge:
 *
 *   - createReversal records the edge (updateOrCreate: a reused code slot
 *     re-points the edge, preserving the suffix-probing semantics where a
 *     reversed slot is never silently resurrected);
 *   - legacy '-REV' siblings created before the table existed are
 *     backfilled on first read;
 *   - a STALE edge whose reversal entry no longer exists (legacy
 *     unposted-delete paths, cleanup jobs, non-transactional residue)
 *     self-heals instead of reporting a standing reversal — and thus
 *     blocking an idempotent re-reversal;
 *   - liveEntryFor() resolves the live entry by join: reversed entries are
 *     skipped, REVERSAL entries are never candidates (a retract →
 *     re-approve round trip must not re-adopt the retraction's own -REV
 *     document), and ambiguous history falls back to the last non-reversal
 *     candidate.
 *
 * Phase 18 adds the strict upsert-side twin unreversedEntryFor(): the
 * first live entry WITHOUT a recorded reversal, or null when the whole
 * history is reversed — upsert flows then post a FRESH entry, never
 * resurrecting a reversed slot.
 */
class JournalReversalLinkTableTest extends TestCase
{
    use DatabaseTransactions;

    protected int $companyId = 1;

    protected int $inventoryAccountId;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        DB::table('accounts')->insertOrIgnore([
            'AccCode' => '11401',
            'AccName' => 'Inventory Asset',
            'AccType' => 1,
            'AccFinal' => 1,
            'company_id' => $this->companyId,
        ]);
        $this->inventoryAccountId = (int) DB::table('accounts')->where('AccCode', '11401')->value('AccID');
    }

    /* -----------------------------------------------------------------
     | Helpers
     ----------------------------------------------------------------- */

    private function service(): JournalReversalService
    {
        return app(JournalReversalService::class);
    }

    private function makePostedEntry(string $code, string $reference, string $entryType = 'SalesReturn'): JournalEntry
    {
        $entry = JournalEntry::create([
            'entry_code' => $code,
            'entry_type' => $entryType,
            'reference' => $reference,
            'date' => now()->toDateString(),
            'description' => 'P17 fixture '.$code,
            'total_amount' => 100,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $code,
            'account_id' => $this->inventoryAccountId,
            'debit' => 100,
            'credit' => 0,
            'related_id_name' => $entryType,
            'related_name_details' => $reference,
            'description' => 'P17 fixture line',
            'company_id' => $this->companyId,
        ]);

        return $entry;
    }

    /* =====================================================================
     |  The link-table contract
     ===================================================================== */

    /** @test */
    public function create_reversal_records_the_edge_and_answers_from_it()
    {
        $code = 'P17-'.uniqid();
        $this->makePostedEntry($code, 'P17REF-'.uniqid());

        $reversal = $this->service()->createReversal($code, 'P17 cancellation');
        $this->assertNotNull($reversal);

        $edge = DB::table('journal_reversals')->where('original_entry_code', $code)->first();
        $this->assertNotNull($edge, 'The reversal must be recorded as a link-table edge.');
        $this->assertSame($reversal->entry_code, $edge->reversal_entry_code);

        $this->assertTrue($this->service()->hasReversal($code));
        $this->assertSame($reversal->entry_code, $this->service()->getReversal($code)?->entry_code);

        // Idempotent: the second call returns the SAME reversal via the edge.
        $again = $this->service()->createReversal($code, 'P17 cancellation 2');
        $this->assertSame($reversal->entry_code, $again?->entry_code);
        $this->assertSame(1, DB::table('journal_reversals')->where('original_entry_code', $code)->count());
    }

    /** @test */
    public function legacy_rev_siblings_are_backfilled_on_first_read()
    {
        $code = 'P17L-'.uniqid();
        $reference = 'P17REFL-'.uniqid();
        $this->makePostedEntry($code, $reference);

        // A pre-table reversal: the '-REV' entry exists, no edge row does.
        $revCode = $code.'-REV';
        JournalEntry::create([
            'entry_code' => $revCode,
            'entry_type' => 'SalesReturn',
            'reference' => $reference,
            'date' => now()->toDateString(),
            'description' => 'P17 legacy reversal',
            'total_amount' => 100,
            'status' => 'Post',
            'company_id' => $this->companyId,
        ]);

        $this->assertSame(0, DB::table('journal_reversals')->where('original_entry_code', $code)->count());

        $this->assertTrue($this->service()->hasReversal($code), 'Legacy -REV siblings must be backfilled into the link table.');
        $this->assertSame($revCode, $this->service()->getReversal($code)?->entry_code);
        $this->assertSame(1, DB::table('journal_reversals')->where('original_entry_code', $code)->count(), 'Exactly one edge is backfilled.');
    }

    /** @test */
    public function stale_edges_self_heal_instead_of_blocking_re_reversal()
    {
        $code = 'P17S-'.uniqid();
        $this->makePostedEntry($code, 'P17REFS-'.uniqid());

        // A stale edge: recorded, but the reversal ENTRY is long gone.
        DB::table('journal_reversals')->insert([
            'original_entry_code' => $code,
            'reversal_entry_code' => $code.'-REV',
            'company_id' => $this->companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertFalse($this->service()->hasReversal($code), 'A stale edge must not report a standing reversal.');
        $this->assertSame(0, DB::table('journal_reversals')->where('original_entry_code', $code)->count(), 'The stale edge is healed away.');

        // The entry can be reversed again — the stale edge no longer blocks it.
        $reversal = $this->service()->createReversal($code, 'P17 post-heal reversal');
        $this->assertNotNull($reversal);
        $this->assertSame($reversal->entry_code, DB::table('journal_reversals')->where('original_entry_code', $code)->value('reversal_entry_code'));
    }

    /** @test */
    public function live_entry_for_skips_reversed_entries_and_never_returns_a_reversal_document()
    {
        $reference = 'P17REFX-'.uniqid();

        $first = $this->makePostedEntry('P17X1-'.uniqid(), $reference);
        $this->service()->createReversal($first->entry_code, 'P17 retract');

        $second = $this->makePostedEntry('P17X2-'.uniqid(), $reference);

        $live = $this->service()->liveEntryFor($reference, 'SalesReturn');

        $this->assertNotNull($live);
        $this->assertSame($second->entry_code, $live->entry_code, 'The live entry is the unreversed one.');
        $this->assertStringEndsNotWith('-REV', $live->entry_code, 'A reversal document is history, never the live entry.');
    }

    /** @test */
    public function live_entry_for_falls_back_to_history_without_adopting_the_reversal_entry()
    {
        $reference = 'P17REFY-'.uniqid();

        // Everything reversed: candidates exist, none live. The fallback is
        // the reversed ORIGINAL — never its reversal document.
        $original = $this->makePostedEntry('P17Y1-'.uniqid(), $reference);
        $reversal = $this->service()->createReversal($original->entry_code, 'P17 retract all');

        $live = $this->service()->liveEntryFor($reference, 'SalesReturn');

        $this->assertNotNull($live);
        $this->assertSame($original->entry_code, $live->entry_code, 'Ambiguous history falls back to the (reversed) original.');
        $this->assertNotSame($reversal->entry_code, $live->entry_code);
    }

    /* =====================================================================
     |  Phase 18 — the strict upsert-side lookup
     ===================================================================== */

    /** @test */
    public function unreversed_entry_for_returns_null_when_every_candidate_is_reversed()
    {
        $reference = 'P18REFZ-'.uniqid();

        $original = $this->makePostedEntry('P18Z1-'.uniqid(), $reference);
        $reversal = $this->service()->createReversal($original->entry_code, 'P18 retract all');
        $this->assertNotNull($reversal);

        // The strict upsert-side contract: everything reversed → NOTHING to
        // amend; the caller must post a FRESH entry, never resurrect the
        // reversed slot. (liveEntryFor falls back for the retract side;
        // unreversedEntryFor deliberately does not.)
        $this->assertNull($this->service()->unreversedEntryFor($reference, 'SalesReturn'));
    }

    /** @test */
    public function unreversed_entry_for_returns_the_unreversed_entry_among_mixed_history()
    {        $reference = 'P18REFM-'.uniqid();

        $first = $this->makePostedEntry('P18M1-'.uniqid(), $reference);
        $this->service()->createReversal($first->entry_code, 'P18 retract');

        $second = $this->makePostedEntry('P18M2-'.uniqid(), $reference);

        $live = $this->service()->unreversedEntryFor($reference, 'SalesReturn');

        $this->assertNotNull($live);
        $this->assertSame($second->entry_code, $live->entry_code, 'The unreversed entry is the amendable one.');
        $this->assertStringEndsNotWith('-REV', $live->entry_code, 'A reversal document is never the amendable entry.');
    }

    /** @test */
    public function each_lifecycle_of_a_reused_reference_reverses_independently()
    {
        $reference = 'P18REFR-'.uniqid();

        // Reused-number discriminator: the SAME reference is posted, deleted
        // (reversed), re-posted and deleted again. Entry CODES differ, so
        // each lifecycle records its own edge — the second reversal is
        // never blocked by the first.
        $first = $this->makePostedEntry('P18R1-'.uniqid(), $reference);
        $this->service()->createReversal($first->entry_code, 'P18 delete #1');

        $this->assertNull(
            $this->service()->unreversedEntryFor($reference, 'SalesReturn'),
            'A fully reversed reference amends nothing.'
        );

        $second = $this->makePostedEntry('P18R2-'.uniqid(), $reference);
        $secondReversal = $this->service()->createReversal($second->entry_code, 'P18 delete #2');

        $this->assertNotNull($secondReversal, 'The second lifecycle reverses independently — entry codes differ.');
        $this->assertSame(
            2,
            DB::table('journal_reversals')
                ->where('original_entry_code', $first->entry_code)
                ->orWhere('original_entry_code', $second->entry_code)
                ->count()
        );
        $this->assertNotSame(
            DB::table('journal_reversals')->where('original_entry_code', $first->entry_code)->value('reversal_entry_code'),
            DB::table('journal_reversals')->where('original_entry_code', $second->entry_code)->value('reversal_entry_code')
        );
        $this->assertNull($this->service()->unreversedEntryFor($reference, 'SalesReturn'));
    }

    /** @test */
    public function treasury_delete_and_reverse_resolve_through_the_link_table()
    {
        // Phase 19: TreasuryService's delete/reverse lookups are migrated to
        // the link table — this is their first direct coverage.
        $reference = 'P19TRX-'.uniqid();
        $tx = (new TreasuryTransaction)->forceFill(['transaction_no' => $reference, 'transaction_type' => 'deposit']);

        // Delete path: an UnPost treasury journal is deleted by reference…
        $draft = $this->makePostedEntry('P19T1-'.uniqid(), $reference, 'BnkReceipt');
        $draft->update(['status' => 'UnPost']);

        app(TreasuryService::class)->deleteJournalEntry($tx);

        $this->assertFalse(
            JournalEntry::where('entry_code', $draft->entry_code)->exists(),
            'The UnPost treasury journal is deleted with its transaction.'
        );

        // …and the reverse path reverses a POSTED one exactly once, through
        // the link table — a second call never re-reverses the slot.
        $posted = $this->makePostedEntry('P19T2-'.uniqid(), $reference, 'BnkReceipt');

        app(TreasuryService::class)->reverseJournalEntry($tx);

        $this->assertSame(
            $posted->entry_code.'-REV',
            DB::table('journal_reversals')->where('original_entry_code', $posted->entry_code)->value('reversal_entry_code')
        );

        app(TreasuryService::class)->reverseJournalEntry($tx);

        $this->assertSame(
            1,
            DB::table('journal_entries')->where('entry_code', $posted->entry_code.'-REV')->count(),
            'A reversed slot is never reversed again — no -REV-REV is ever born.'
        );
    }
}
