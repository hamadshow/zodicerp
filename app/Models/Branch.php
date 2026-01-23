<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $table = 'branches';
    protected $guarded = [];

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

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
