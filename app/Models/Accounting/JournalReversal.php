<?php

namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;

/**
 * Phase 17 — an edge row linking a journal entry to its reversal.
 *
 * The reversal ENTRY CODE still follows the '<original>-REV' naming
 * convention (readable stock cards, existing assertions), but the
 * live/reversed relationship is answered through this table:
 * JournalReversalService::liveEntryFor() joins here instead of probing
 * for '-REV' suffix siblings.
 */
class JournalReversal extends Model
{
    protected $table = 'journal_reversals';

    protected $fillable = [
        'original_entry_code',
        'reversal_entry_code',
        'company_id',
    ];
}
