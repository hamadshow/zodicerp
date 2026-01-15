<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyInfo extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function countryData()
    {
        return $this->belongsTo(Country::class, 'country');
    }

    public function cityData()
    {
        return $this->belongsTo(City::class, 'city');
    }

    public function areaData()
    {
        return $this->belongsTo(Area::class, 'area');
    }
}
