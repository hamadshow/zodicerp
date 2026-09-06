<?php

namespace App\Models\Accounting;

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
        'company_id',
    ];

    protected $casts = [
        'date' => 'date',
        'total_amount' => 'double',
    ];

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
        });
    }

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class, 'journal_entry_code', 'entry_code');
    }
}
