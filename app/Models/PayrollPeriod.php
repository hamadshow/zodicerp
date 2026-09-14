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
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'posted_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function results(): HasMany
    {
        return $this->hasMany(PayrollResult::class);
    }
}
