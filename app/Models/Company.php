<?php

namespace App\Models;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $table = 'company';

    protected $guarded = [];

    public function countryData()
    {
        return $this->belongsTo(Location::class, 'country');
    }

    public function cityData()
    {
        return $this->belongsTo(Location::class, 'city');
    }

    public function areaData()
    {
        return $this->belongsTo(Location::class, 'area');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'company_id');
    }
}
