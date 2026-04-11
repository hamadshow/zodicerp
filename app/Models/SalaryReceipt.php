<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'receipt_no',
        'period',
        'gross_salary',
        'total_deductions',
        'total_advances',
        'total_rewards',
        'net_salary',
        'payment_date',
        'payment_method',
        'bank_account',
        'status',
        'company_id',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'gross_salary' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_advances' => 'decimal:2',
        'total_rewards' => 'decimal:2',
        'net_salary' => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
