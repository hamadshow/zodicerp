<?php

namespace App\Models\Accounting;

use App\Support\JournalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use LogicException;

class JournalEntry extends Model
{
    use HasFactory;

    protected $table = 'journal_entries';

    // protected $primaryKey = 'id'; // Default is id
    public $timestamps = true; // Enabled in migration

    protected $fillable = [
        'entry_code',
        'entry_type',
        'reference',
        'date',
        'description',
        'total_amount',
        'status',
        'posted_at',
        'company_id',
    ];

    protected $casts = [
        'date' => 'date',
        'posted_at' => 'datetime',
        'total_amount' => 'double',
    ];

    /**
     * GL Audit Phase 2: whether a persisted status literal counts as
     * POSTED. The table stores the legacy trio 'Post' / 'Posted' / the
     * lowercase 'posted' (see the status-literal characterization tests);
     * comparison is collation-insensitive in MySQL but case-sensitive in
     * PHP, so the check normalizes case here. Phase 12 will canonicalize
     * the literals themselves.
     */
    public static function isPostedStatus(?string $status): bool
    {
        return JournalStatus::isPosted($status);
    }

    public static function normalizeStatus(?string $status): ?string
    {
        return JournalStatus::normalize($status);
    }

    protected static function booted(): void
    {
        static::creating(function (self $journal): void {
            $entryCode = trim((string) $journal->entry_code);

            if ($entryCode === '') {
                throw new LogicException('A journal entry code is required.');
            }

            if (self::where('entry_code', $entryCode)->exists()) {
                throw new LogicException('Journal entry code already exists: '.$entryCode);
            }

            $journal->entry_code = $entryCode;

            // GL Audit Phase 2: a journal CREATED directly as posted records
            // its real posting time — created_at is the record-creation
            // timestamp, never a substitute. Callers that set posted_at
            // explicitly (none today) are respected.
            if (! $journal->posted_at && self::isPostedStatus($journal->status)) {
                $journal->posted_at = now();
            }
        });

        // GL Audit Phase 2: an Eloquent transition from unposted to posted
        // records the actual posting moment (reposting overwrites with the
        // new posting time; unposting never touches the column, so the
        // historical value survives while the journal sits unposted).
        // Query-builder mass updates bypass model events and set posted_at
        // explicitly at their call sites (JournalController). Merely
        // editing an unposted draft never triggers this.
        static::updating(function (self $journal): void {
            if ($journal->isDirty('status')
                && self::isPostedStatus($journal->status)
                && ! self::isPostedStatus($journal->getOriginal('status'))
                && ! $journal->isDirty('posted_at')) {
                $journal->posted_at = now();
            }
        });
    }

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class, 'journal_entry_code', 'entry_code');
    }
}
