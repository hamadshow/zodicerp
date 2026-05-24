<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\CashAccount;
use App\Models\BankAccount;
use App\Models\Company;

class TreasuryTransfer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference_number',
        'from_treasury_id',
        'to_treasury_id',
        'amount',
        'currency',
        'transfer_date',
        'notes',
        'status',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'created_by',
        'updated_by',
        'company_id',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function fromAccount()
    {
        $id = $this->from_treasury_id;
        if (str_starts_with($id, 'cash_')) {
            $actualId = str_replace('cash_', '', $id);
            return CashAccount::find($actualId);
        }
        return BankAccount::find($id);
    }

    public function toAccount()
    {
        $id = $this->to_treasury_id;
        if (str_starts_with($id, 'cash_')) {
            $actualId = str_replace('cash_', '', $id);
            return CashAccount::find($actualId);
        }
        return BankAccount::find($id);
    }

    public function fromTreasury()
    {
        return $this->belongsTo(CashAccount::class, 'from_treasury_id');
    }

    public function toTreasury()
    {
        return $this->belongsTo(CashAccount::class, 'to_treasury_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejector()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}
