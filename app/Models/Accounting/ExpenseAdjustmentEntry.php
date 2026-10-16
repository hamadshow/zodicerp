<?php

namespace App\Models\Accounting;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Link between an expense adjustment, its report date and the
 * system-generated journal entry recorded for it (payroll_period_journal
 * pattern). One row per generation event:
 *
 * - UNIQUE (expense_adjustment_id, report_date) makes regeneration for the
 *   same report date idempotent — the update path reuses the referenced
 *   entry instead of creating a duplicate.
 * - Points only at entries the system created via this link, so manual
 *   journal entries are never a regeneration target.
 * - Rows are never mutated on regeneration: a new snapshot row is written
 *   (or the same date's row replaced in a transaction), giving an audit
 *   trail of generated / updated / cancelled generations, with actors.
 */
class ExpenseAdjustmentEntry extends Model
{
    use HasFactory;

    protected $table = 'expense_adjustment_entries';

    protected $guarded = [];

    protected $casts = [
        'report_date' => 'date',
        'recognized_through' => 'decimal:3',
        'remaining_after' => 'decimal:3',
    ];

    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(ExpenseAdjustment::class, 'expense_adjustment_id');
    }

    /** The journal entry this generation produced (or last updated). */
    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** Convenience: the reporting reference, matching module journal naming. */
    public function reportReference(): string
    {
        return 'EXPADJ-'.$this->expense_adjustment_id.'-'.$this->report_date->format('Ymd');
    }
}
