<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'basic_salary',
        'allowances',
        'overtime',
        'total_rewards',
        'gross_salary',
        'attendance_deductions',
        'leave_deductions',
        'manual_deductions',
        'total_advances',
        'traffic_violations',
        'total_deductions',
        'net_salary',
        'calculated_at',
        'reviewed_at',
        'approved_at',
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'allowances' => 'decimal:2',
        'overtime' => 'decimal:2',
        'total_rewards' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'attendance_deductions' => 'decimal:2',
        'leave_deductions' => 'decimal:2',
        'manual_deductions' => 'decimal:2',
        'total_advances' => 'decimal:2',
        'traffic_violations' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'calculated_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(PayrollResultComponent::class);
    }
}
