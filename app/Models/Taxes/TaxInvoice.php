<?php

namespace App\Models\Taxes;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;

class TaxInvoice extends Model
{
    use HasFactory;

    protected $table = 'tax_invoices';

    protected $fillable = [
        'invoice_number',
        'original_invoice_id',
        'document_type',
        'transaction_type',
        'issuer_id',
        'issuer_type',
        'recipient_id',
        'recipient_type',
        'tax_group_id',
        'tax_amount',
        'taxable_amount',
        'total_amount',
        'invoice_date',
        'due_date',
        'tax_point_date',
        'tax_authority_number',
        'qr_code_data',
        'digital_signature',
        'status',
        'is_export',
        'is_reverse_charge',
        'created_by',
        'issued_by',
        'issued_date',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'tax_point_date' => 'date',
        'issued_date' => 'date',
        'tax_amount' => 'decimal:4',
        'taxable_amount' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'is_export' => 'boolean',
        'is_reverse_charge' => 'boolean',
    ];

    public function taxGroup()
    {
        return $this->belongsTo(TaxGroup::class);
    }

    public function originalInvoice()
    {
        return $this->belongsTo(TaxInvoice::class, 'original_invoice_id');
    }

    public function childInvoices()
    {
        return $this->hasMany(TaxInvoice::class, 'original_invoice_id');
    }

    // Polymorphic Relationships
    // Note: Since we are using ENUM for types, standard morphTo might need 'morphMap' configuration in AppServiceProvider.
    // Assuming the map keys are 'customer', 'vendor', 'company'.
    
    public function issuer()
    {
        return $this->morphTo();
    }

    public function recipient()
    {
        return $this->morphTo();
    }

    public function details()
    {
        return $this->hasMany(TaxInvoiceDetail::class, 'tax_invoice_id');
    }
}
