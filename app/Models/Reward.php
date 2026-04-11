<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reward extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'reward_type',
        'reward_value',
        'category',
        'award_date',
        'status',
        'badge',
        'reason',
        'awarded_by',
        'points',
        'notes',
        'company_id',
    ];

    protected $casts = [
        'award_date' => 'date',
        'points' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
