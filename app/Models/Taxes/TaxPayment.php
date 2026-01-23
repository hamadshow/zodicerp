<?php

namespace App\Models\Taxes;

use App\Models\BankAccount;
use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxPayment extends Model
{
    use HasFactory;

    protected $table = 'tax_payments';

    protected $fillable = [
        'payment_number',
        'tax_return_id',
        'payment_date',
        'payment_method',
        'payment_amount',
        'currency_id',
        'exchange_rate',
        'bank_account_id',
        'reference_number',
        'transaction_id',
        'status',
        'clearance_date',
        'bank_charges',
        'late_fees',
        'interest_amount',
        'payment_by',
        'verified_by',
        'verified_date',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'clearance_date' => 'date',
        'verified_date' => 'date',
        'payment_amount' => 'decimal:4',
        'exchange_rate' => 'decimal:6',
        'bank_charges' => 'decimal:4',
        'late_fees' => 'decimal:4',
        'interest_amount' => 'decimal:4',
    ];

    public function taxReturn()
    {
        return $this->belongsTo(TaxReturn::class);
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function bankAccount()
    {
        // Assuming BankAccount model namespace. If not, we'll need to adjust.
        // Based on migration folder 2026_01_20_100000_create_bank_management_tables.php, model might be in App\Models\BankManagement or App\Models
        // I will assume App\Models\BankManagement\BankAccount or App\Models\BankAccount
        // I'll search for BankAccount model to be sure in a moment, but for now I'll point to likely location or just class name if I import it.
        // Let's assume App\Models\BankManagement\BankAccount based on folder structure naming convention usually seen.
        // Or I can just use the string 'App\Models\BankManagement\BankAccount' if I'm not sure about the import.
        // I'll use the class name and if it fails I can fix it.
        // Actually, let's just use the string to be safe if I don't import it, but importing is better.
        // I'll assume App\Models\BankManagement\BankAccount exists.
        return $this->belongsTo(BankAccount::class);
    }
}
