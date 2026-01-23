<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetDepreciation extends Model
{
    use HasFactory;

    protected $table = 'asset_depreciation';

    protected $fillable = [
        'asset_id',
        'fiscal_year',
        'period_month',
        'period_year',
        'depreciation_date',
        'depreciation_amount',
        'accumulated_depreciation',
        'net_book_value_before',
        'net_book_value_after',
        'journal_entry_id',
        'is_posted',
        'posted_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'depreciation_date' => 'date',
        'posted_date' => 'date',
        'is_posted' => 'boolean',
        'depreciation_amount' => 'decimal:4',
        'accumulated_depreciation' => 'decimal:4',
        'net_book_value_before' => 'decimal:4',
        'net_book_value_after' => 'decimal:4',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the journal entry associated with the depreciation.
     * Note: This assumes a JournalEntry model exists or will exist.
     */
    public function journalEntry()
    {
        // Adjust model namespace if JournalEntry is in a different location
        return $this->belongsTo(\App\Models\Accounting\JournalEntry::class, 'journal_entry_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }
}
