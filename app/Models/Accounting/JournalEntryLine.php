<?php

namespace App\Models\Accounting;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
    ];

    protected $casts = [
        'debit' => 'double',
        'credit' => 'double',
        'account_id' => 'integer',
    ];

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_code', 'entry_code');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }
}
