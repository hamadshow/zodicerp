<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'name_ar',
        'name_en',
        'code',
        'currency',
        'currency_id',
        'default_language',
        'timezone',
        'phone_code',
        'status',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'currency_id' => 'integer',
    ];

    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
}
