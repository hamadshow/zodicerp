<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationBalance extends Model
{
    use HasFactory;

    public const LEAVE_TYPES = ['annual', 'sick', 'maternity', 'unpaid'];

    protected $fillable = [
        'employee_id',
        'leave_type',
        'year',
        'entitlement_days',
        'company_id',
    ];

    protected $casts = [
        'entitlement_days' => 'decimal:1',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Days already consumed by approved vacations for this type/year.
     */
    public function usedDays(): float
    {
        return (float) Vacation::query()
            ->where('employee_id', $this->employee_id)
            ->where('leave_type', $this->leave_type)
            ->where('status', 'approved')
            ->whereYear('start_date', $this->year)
            ->sum('total_days');
    }

    public function remainingDays(): float
    {
        return round((float) $this->entitlement_days - $this->usedDays(), 1);
    }
}
