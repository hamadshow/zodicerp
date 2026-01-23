<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxAuditLog extends Model
{
    use HasFactory;

    protected $table = 'tax_audit_log';
    public $timestamps = false;

    protected $fillable = [
        'log_date',
        'user_id',
        'action_type',
        'table_name',
        'record_id',
        'old_values',
        'new_values',
        'changed_fields',
        'ip_address',
        'user_agent',
        'session_id',
        'created_at',
    ];

    protected $casts = [
        'log_date' => 'datetime',
        'old_values' => 'array',
        'new_values' => 'array',
        'changed_fields' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }
}
