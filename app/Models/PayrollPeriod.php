<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasFactory;

    public const STATUSES = ['draft', 'calculated', 'reviewed', 'approved', 'posted', 'closed'];

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'status',
        'company_id',
        'overtime_rate_per_hour',
        'absence_deduction_per_day',
        'late_deduction_per_incident',
        'unpaid_leave_deduction_per_day',
        'created_by',
        'reviewed_by',
        'reviewed_at',
        'approved_by',
        'approved_at',
        'posted_by',
        'posted_at',
        'closed_by',
        'closed_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'overtime_rate_per_hour' => 'decimal:2',
        'absence_deduction_per_day' => 'decimal:2',
        'late_deduction_per_incident' => 'decimal:2',
        'unpaid_leave_deduction_per_day' => 'decimal:2',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'posted_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function results(): HasMany
    {
        return $this->hasMany(PayrollResult::class);
    }

    public function journals()
    {
        return $this->belongsToMany(\App\Models\Accounting\JournalEntry::class, 'payroll_period_journal', 'payroll_period_id', 'journal_entry_id')
            ->withPivot('posted_by')
            ->withTimestamps();
    }
}
