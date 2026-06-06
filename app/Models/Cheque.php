<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cheque extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'cheque_no',
        'bank_name',
        'account_id',
        'owner_name',
        'cheque_type',
        'amount',
        'issue_date',
        'due_date',
        'status',
        'reference_no',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'issue_date' => 'date',
        'due_date' => 'date',
    ];

    public function account()
    {
        return $this->belongsTo(BankAccount::class, 'account_id');
    }

    public function transactions()
    {
        return $this->hasMany(ChequeTransaction::class, 'cheque_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
