<?php

namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Accounting\JournalEntryLine;

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
    ];

    protected $casts = [
        'date' => 'date',
        'total_amount' => 'double',
    ];

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class, 'journal_entry_code', 'entry_code');
    }
}
