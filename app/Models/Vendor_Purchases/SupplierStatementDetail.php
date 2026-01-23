<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierStatementDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'statement_id',
        'transaction_date',
        'document_type',
        'document_id',
        'document_number',
        'description',
        'debit_amount',
        'credit_amount',
        'balance',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'statement_id' => 'integer',
        'document_id' => 'integer',
    ];

    public function statement()
    {
        return $this->belongsTo(SupplierStatement::class, 'statement_id');
    }
}
