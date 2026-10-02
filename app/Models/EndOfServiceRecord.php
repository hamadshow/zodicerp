<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EndOfServiceRecord extends Model
{
    use HasFactory;

    public const TYPES = ['resignation', 'termination', 'contract_end', 'retirement'];

    public const STATUSES = ['pending', 'processed', 'cancelled'];

    protected $fillable = [
        'employee_id',
        'type',
        'date',
        'reason',
        'amount',
        'status',
        'company_id',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
