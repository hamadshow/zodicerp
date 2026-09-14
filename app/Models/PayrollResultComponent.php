<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollResultComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_result_id',
        'component_key',
        'component_type',
        'source_type',
        'source_id',
        'description',
        'amount',
        'source_snapshot',
        'source_updated_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'source_snapshot' => 'array',
        'source_updated_at' => 'datetime',
    ];

    public function result(): BelongsTo
    {
        return $this->belongsTo(PayrollResult::class, 'payroll_result_id');
    }
}
