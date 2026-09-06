<?php

namespace App\Models\Accounting;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use LogicException;

class JournalEntryLine extends Model
{
    use HasFactory;

    protected $table = 'journal_entry_lines';

    // protected $primaryKey = 'id'; // Default is id
    public $timestamps = true; // Enabled in migration

    protected $fillable = [
        'journal_entry_code',
        'account_id',
        'debit',
        'credit',
        'related_id_name',
        'related_name_details',
        'description',
        'cost_center_code',
        'company_id',
    ];

    protected $casts = [
        'debit' => 'double',
        'credit' => 'double',
        'account_id' => 'integer',
    ];

    protected $appends = ['account_name'];

    protected static function booted(): void
    {
        static::creating(function (self $line): void {
            $entryCode = trim((string) $line->journal_entry_code);

            if ($entryCode === '' || ! JournalEntry::where('entry_code', $entryCode)->exists()) {
                throw new LogicException('Journal line requires an existing journal entry code.');
            }

            if ($line->account_id && ! Account::where('AccID', $line->account_id)->exists()) {
                throw new LogicException('Journal line account_id must reference accounts.AccID.');
            }

            $line->journal_entry_code = $entryCode;
        });
    }

    public function getAccountNameAttribute()
    {
        return $this->account ? $this->account->AccName : null;
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_code', 'entry_code');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }
}
