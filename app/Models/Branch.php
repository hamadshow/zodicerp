<?php

namespace App\Models;

use App\Models\Location;
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

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

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
}
