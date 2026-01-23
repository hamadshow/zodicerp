<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetRevaluation extends Model
{
    use HasFactory;

    protected $table = 'asset_revaluation';

    protected $fillable = [
        'asset_id',
        'revaluation_date',
        'previous_cost',
        'previous_accumulated_depreciation',
        'previous_net_book_value',
        'new_cost',
        'new_accumulated_depreciation',
        'new_net_book_value',
        'cost_increase',
        'cost_decrease',
        'revaluation_surplus',
        'revaluation_deficit',
        'reason',
        'notes',
        'journal_entry_id',
        'is_posted',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'revaluation_date' => 'date',
        'previous_cost' => 'decimal:4',
        'previous_accumulated_depreciation' => 'decimal:4',
        'previous_net_book_value' => 'decimal:4',
        'new_cost' => 'decimal:4',
        'new_accumulated_depreciation' => 'decimal:4',
        'new_net_book_value' => 'decimal:4',
        'cost_increase' => 'decimal:4',
        'cost_decrease' => 'decimal:4',
        'revaluation_surplus' => 'decimal:4',
        'revaluation_deficit' => 'decimal:4',
        'is_posted' => 'boolean',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(\App\Models\Accounting\JournalEntry::class, 'journal_entry_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }
}
