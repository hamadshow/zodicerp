<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    use HasFactory;

    protected $table = 'accounts';

    protected $primaryKey = 'AccID';

    public $timestamps = false;

    protected $fillable = [
        'AccCode',
        'AccName',
        'AccType',
        'AccParent',
        'AccDmType',
        'AccFinal',
        'AccMaxLimt',
        'AccMaxDuration',
        'AccBranch',
        'AddUser',
        'AddDate',
        'EditUser',
        'EditDate',
        'NumOfEdit',
        'AccStopped',
        'AccNote',
    ];

    protected $casts = [
        'AccCode' => 'integer',
        'AccType' => 'integer',
        'AccParent' => 'integer',
        'AccDmType' => 'integer',
        'AccFinal' => 'integer',
        'AccMaxLimt' => 'integer',
        'AccMaxDuration' => 'integer',
        'AccBranch' => 'integer',
        'AddUser' => 'integer',
        'AddDate' => 'date',
        'EditUser' => 'integer',
        'EditDate' => 'date',
        'NumOfEdit' => 'integer',
        'AccStopped' => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(self::class, 'AccParent', 'AccCode');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'AccParent', 'AccCode');
    }
}

