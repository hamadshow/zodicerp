<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'currency',
        'timezone',
        'phone_code',
        'latitude',
        'longitude',
        'status',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
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
