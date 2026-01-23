<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetDisposal extends Model
{
    use HasFactory;

    protected $table = 'asset_disposals';

    protected $fillable = [
        'asset_id',
        'disposal_date',
        'disposal_method',
        'net_book_value',
        'accumulated_depreciation',
        'original_cost',
        'disposal_amount',
        'disposal_currency_id',
        'gain_loss_amount',
        'buyer_name',
        'buyer_contact',
        'invoice_number',
        'journal_entry_id',
        'is_posted',
        'notes',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'disposal_date' => 'date',
        'net_book_value' => 'decimal:4',
        'accumulated_depreciation' => 'decimal:4',
        'original_cost' => 'decimal:4',
        'disposal_amount' => 'decimal:4',
        'gain_loss_amount' => 'decimal:4',
        'is_posted' => 'boolean',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function currency()
    {
        return $this->belongsTo(\App\Models\Currency::class, 'disposal_currency_id');
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
