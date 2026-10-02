<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vacation extends Model
{
    use HasFactory;

    public const LEAVE_TYPES = ['annual', 'sick', 'maternity', 'unpaid'];

    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'employee_id',
        'leave_type',
        'start_date',
        'end_date',
        'total_days',
        'status',
        'notes',
        'company_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }
}
