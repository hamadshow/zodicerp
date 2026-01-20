<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bank extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'bank_code',
        'name',
        'short_name',
        'swift_code',
        'iban_prefix',
        'country',
        'currency',
        'logo',
        'status',
    ];

    public function accounts()
    {
        return $this->hasMany(BankAccount::class);
    }
}
