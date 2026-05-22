<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BankReceipt extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sales_invoice_id',
        'bank_account_id',
        'receipt_no',
        'receipt_date',
        'payer_type',
        'payer_id',
        'amount',
        'reference',
        'notes',
        'status',
        'created_by',
        'company_id',
    ];

    protected $casts = [
        'receipt_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
