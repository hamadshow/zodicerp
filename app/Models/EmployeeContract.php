<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeContract extends Model
{
    use HasFactory;

    public const CONTRACT_TYPES = ['full_time', 'part_time', 'temporary', 'probation'];

    public const STATUSES = ['active', 'expired', 'terminated'];

    protected $fillable = [
        'employee_id',
        'contract_type',
        'start_date',
        'end_date',
        'salary',
        'status',
        'notes',
        'company_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'salary' => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function isExpired(): bool
    {
        return $this->end_date !== null && $this->end_date->isPast() && $this->status === 'active';
    }

    public function daysUntilExpiry(): ?int
    {
        return $this->end_date?->diffInDays(now(), false);
    }
}
