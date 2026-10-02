<?php

namespace App\Services\Accounting;

use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Accounting\JournalReversal;
use App\Traits\EnsuresFiscalPeriod;
use Illuminate\Support\Facades\DB;

/**
 * P0-06: Journal Reversal Service.
 *
 * Creates reversal journal entries for posted financial documents.
 * Preserves original accounting history — never deletes posted journals.
 *
 * Reversal entry_code convention: {original}-REV
 * Reversal status: Post (immediately posted)
 * Reversal lines: debit↔credit swapped, all other fields preserved.
 */
class JournalReversalService
{
    use EnsuresFiscalPeriod;

    protected string $journalCodePrefix = 'QID-';
    protected int $journalCodeStart = 10001;

    /**
     * Create a reversal journal for an existing posted journal entry.
     *
     * @param string $originalEntryCode The entry_code of the journal to reverse
     * @param string $reason Description of why the reversal is being created
     * @param string|null $reversalDate Override date (defaults to today)
     * @return JournalEntry|null The reversal journal, or null if no reversal needed
     */
    public function createReversal(
        string $originalEntryCode,
        string $reason = 'Cancellation reversal',
        ?string $reversalDate = null,
    ): ?JournalEntry {
        $original = JournalEntry::where('entry_code', $originalEntryCode)->first();

        if (!$original) {
            return null;
        }

        // Only reverse posted journals
        if (!in_array($original->status, ['Post', 'posted'])) {
            return null;
        }

        // Check if reversal already exists (idempotency — Phase 17: via the
        // link table instead of probing for a '-REV' suffix sibling).
        if ($this->hasReversal($original->entry_code)) {
            return $this->getReversal($original->entry_code); // Already reversed
        }

        $reversalEntryCode = $original->entry_code . '-REV';

        // Validate fiscal period for the reversal
        $postingDate = $reversalDate ?? now()->toDateString();
        $this->ensureOpenFiscalPeriod($postingDate);

        // Create reversal journal
        $reversalDateObj = $reversalDate ? \Carbon\Carbon::parse($reversalDate) : now();

        $reversal = DB::transaction(function () use ($original, $reversalEntryCode, $reason, $postingDate, $reversalDateObj) {
            $reversal = JournalEntry::create([
                'entry_code' => $reversalEntryCode,
                'entry_type' => $original->entry_type,
                'reference' => $original->reference,
                'date' => $postingDate,
                'description' => $reason . ' (reversal of ' . $original->entry_code . ')',
                'total_amount' => $original->total_amount,
                'status' => 'Post',
                'company_id' => $original->company_id,
            ]);

            // Copy and swap debit↔credit for each line
            $originalLines = JournalEntryLine::where('journal_entry_code', $original->entry_code)->get();

            foreach ($originalLines as $line) {
                JournalEntryLine::create([
                    'journal_entry_code' => $reversalEntryCode,
                    'account_id' => $line->account_id,
                    'debit' => $line->credit,  // Swap
                    'credit' => $line->debit,  // Swap
                    'related_id_name' => $line->related_id_name,
                    'related_name_details' => $line->related_name_details,
                    'description' => $reason . ' (reversal of ' . $original->entry_code . ')',
                    'cost_center_code' => $line->cost_center_code,
                    'company_id' => $line->company_id ?? $original->company_id, // Phase 13: reversal lines inherit the company stamp
                ]);
            }

            // Phase 17: record the original → reversal EDGE. updateOrCreate,
            // not firstOrCreate: reversal codes are '<original>-REV', so if an
            // entry is deleted and a new one is later posted into the SAME
            // code slot, the edge must follow the new original — exactly the
            // suffix-probing semantics this table replaces (the -REV slot
            // stays occupied; a reversed slot is never silently resurrected).
            JournalReversal::query()->updateOrCreate(
                ['reversal_entry_code' => $reversal->entry_code],
                [
                    'original_entry_code' => $original->entry_code,
                    'company_id' => $original->company_id,
                ]
            );

            return $reversal;
        });

        // Recalculate postings if we have a company_id
        if ($reversal->company_id) {
            app(PostingService::class)->recalculatePostings($reversal->company_id);
        }

        return $reversal;
    }

    /**
     * Phase 17: the LIVE journal entry for a document reference — the
     * earliest entry of the type without a recorded reversal, falling back
     * to the last entry when history is ambiguous (legacy deleted-entry
     * slots). Backfills legacy '-REV' rows first so the join is
     * authoritative for pre-table history too.
     */
    public function liveEntryFor(string $reference, string $entryType, ?int $companyId = null): ?JournalEntry
    {
        $candidates = $this->reversalCandidatesFor($reference, $entryType, $companyId);

        return $candidates->first(fn (JournalEntry $e) => ! $this->hasReversal($e->entry_code))
            ?? $candidates->last();
    }

    /**
     * Phase 18: the journal entry for a document reference that is both
     * live (not itself a reversal) and NOT yet reversed. The strict twin
     * of liveEntryFor for UPSERT-style flows: when every candidate is
     * already reversed there is nothing left to amend — the caller must
     * post a FRESH entry (a reversed slot is never resurrected) — so this
     * returns null instead of falling back to the last candidate.
     *
     * @param bool $lock When true, rows are locked FOR UPDATE (callers
     *                   inside a transaction, e.g. invoice posting).
     */
    public function unreversedEntryFor(string $reference, string $entryType, ?int $companyId = null, bool $lock = false): ?JournalEntry
    {
        $candidates = $this->reversalCandidatesFor($reference, $entryType, $companyId, $lock);

        return $candidates->first(fn (JournalEntry $e) => ! $this->hasReversal($e->entry_code));
    }

    /**
     * Live-document candidates for a reference: every entry of the type
     * that is not itself a reversal — link-table recorded or legacy
     * '-REV'-suffixed rows are excluded — after backfilling legacy
     * reversal edges so the join is authoritative for pre-table history.
     *
     * @return \Illuminate\Support\Collection<int, JournalEntry>
     */
    private function reversalCandidatesFor(string $reference, string $entryType, ?int $companyId, bool $lock = false): \Illuminate\Support\Collection
    {
        $scoped = fn () => JournalEntry::query()
            ->where('reference', $reference)
            ->where('entry_type', $entryType)
            ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
            ->when($lock, fn ($q) => $q->lockForUpdate())
            ->orderBy('id');

        // One-time legacy backfill per entry code.
        $scoped()->get()->each(fn (JournalEntry $e) => $this->findReversalEdge($e->entry_code));

        $entries = $scoped()->get();

        // A REVERSAL entry is history, never the live document: exclude
        // entries recorded as reversals in the link table (and legacy
        // '-REV'-suffixed rows) from candidacy. Without this, a retract →
        // re-approve round trip would re-adopt the retraction's own -REV
        // entry as the live note (it never has a reversal of its own) and
        // overwrite the retraction's audit trail.
        $reversalCodes = JournalReversal::query()->pluck('reversal_entry_code')->all();

        return $entries->filter(fn (JournalEntry $e) => ! in_array($e->entry_code, $reversalCodes, true)
            && ! str_ends_with($e->entry_code, '-REV'));
    }

    /**
     * Phase 17: check if a journal already has a reversal — answered from
     * the journal_reversals link table (with a one-time legacy backfill),
     * no longer by probing for a '-REV' code suffix.
     */
    public function hasReversal(string $entryCode): bool
    {
        return $this->findReversalEdge($entryCode) !== null;
    }

    /**
     * Phase 17: get the reversal journal for a given journal, if it exists —
     * resolved through the link table, not the suffix convention.
     */
    public function getReversal(string $entryCode): ?JournalEntry
    {
        $edge = $this->findReversalEdge($entryCode);
        if (! $edge) {
            return null;
        }

        return JournalEntry::where('entry_code', $edge->reversal_entry_code)->first();
    }

    /**
     * Phase 17: the reversal EDGE for an entry, backfilling legacy '-REV'
     * rows (created before the table existed) on first read. The suffix
     * convention is unambiguous in practice — '<code>-REV' — so the backfill
     * is safe, and every later question is answered with a join.
     */
    private function findReversalEdge(string $originalEntryCode): ?JournalReversal
    {
        $edge = JournalReversal::query()
            ->where('original_entry_code', $originalEntryCode)
            ->first();

        if ($edge) {
            // Self-healing (Phase 17): an edge whose reversal ENTRY no longer
            // exists is stale — the reversal row was deleted outside this
            // service (legacy unposted-delete paths, cleanup jobs, residue
            // from non-transactional suites). Such an edge must NOT report a
            // standing reversal; drop it so the reference reads unreversed
            // again and idempotent re-reversal can proceed.
            if (JournalEntry::query()->where('entry_code', $edge->reversal_entry_code)->exists()) {
                return $edge;
            }

            $edge->delete();

            return null;
        }

        $original = JournalEntry::where('entry_code', $originalEntryCode)->first();
        if (! $original) {
            return null;
        }

        $legacyCodes = JournalEntry::query()
            ->where('entry_code', 'like', $originalEntryCode.'-REV%')
            ->pluck('entry_code');

        foreach ($legacyCodes as $reversalCode) {
            JournalReversal::query()->firstOrCreate(
                ['reversal_entry_code' => $reversalCode],
                [
                    'original_entry_code' => $originalEntryCode,
                    'company_id' => $original->company_id,
                ]
            );
        }

        return JournalReversal::query()
            ->where('original_entry_code', $originalEntryCode)
            ->orderBy('id')
            ->first();
    }

    /**
     * Verify that original + reversal net to zero.
     */
    public function verifyReversalBalance(string $originalEntryCode): bool
    {
        $original = JournalEntry::where('entry_code', $originalEntryCode)->first();
        $reversal = $this->getReversal($originalEntryCode); // Phase 17: via the link table

        if (!$original || !$reversal) {
            return false;
        }

        $originalDebit = (float) JournalEntryLine::where('journal_entry_code', $originalEntryCode)->sum('debit');
        $originalCredit = (float) JournalEntryLine::where('journal_entry_code', $originalEntryCode)->sum('credit');

        $reversalDebit = (float) JournalEntryLine::where('journal_entry_code', $reversal->entry_code)->sum('debit');
        $reversalCredit = (float) JournalEntryLine::where('journal_entry_code', $reversal->entry_code)->sum('credit');

        // Net should be zero: original debit + reversal debit = original credit + reversal credit
        $netDebit = $originalDebit + $reversalDebit;
        $netCredit = $originalCredit + $reversalCredit;

        return abs($netDebit - $netCredit) < 0.01;
    }

    /**
     * Phase 20: a fresh, collision-free QID- entry code for callers that
     * must post a NEW document (upsert flows whose reference history is
     * fully reversed). Same generation convention as the reversal fallback
     * — distinct method so the reversal fallback stays overridable.
     */
    public function nextFreshEntryCode(): string
    {
        return $this->generateNextEntryCode();
    }

    /**
     * Generate the next entry code for a reversal (uses the same convention).
     * This is a fallback — the primary convention is {original}-REV.
     */
    protected function generateNextEntryCode(): string
    {
        $nextNumber = $this->journalCodeStart;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, (int) $this->nextNumericPart($entryCode, $this->journalCodeStart));
        }

        return $this->journalCodePrefix . $nextNumber;
    }

    protected function nextNumericPart(?string $code, int $fallbackStart): int
    {
        if (!$code) {
            return $fallbackStart;
        }

        if (preg_match('/(\d+)\s*$/', $code, $matches)) {
            return (int) $matches[1] + 1;
        }

        return $fallbackStart;
    }
}
