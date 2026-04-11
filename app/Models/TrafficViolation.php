<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrafficViolation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'vehicle_plate',
        'vehicle_type',
        'driver_license',
        'violation_type',
        'severity',
        'violation_date',
        'fine_amount',
        'location',
        'officer_id',
        'status',
        'points',
        'description',
        'evidence_notes',
        'company_id',
    ];

    protected $casts = [
        'violation_date' => 'datetime',
        'fine_amount' => 'decimal:2',
        'points' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
