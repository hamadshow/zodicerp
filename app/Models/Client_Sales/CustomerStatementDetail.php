<?php

namespace App\Models\Client_Sales;

use Illuminate\Database\Eloquent\Model;

class CustomerStatementDetail extends Model
{
    protected $table = 'customer_statement_details';

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
    ];

    public function statement()
    {
        return $this->belongsTo(CustomerStatement::class, 'statement_id');
    }

    // Polymorphic-like relationship helper
    // Note: Since documents are across different tables but not strictly polymorphic in Laravel standard way (due to ENUM type),
    // we might need custom accessor or just manual lookup if needed.
    // However, if we wanted to make it polymorphic, we'd need 'document_type' to be the class name.
    // For now, we'll keep it as is per schema.
}
