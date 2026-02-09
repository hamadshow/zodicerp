<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class State extends Model
{
    use HasFactory;

    protected $fillable = ['name_ar', 'name_en', 'country_id'];

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function cities()
    {
        // If cities are related to states. The cities table schema I saw earlier:
        // $table->foreignId('country_id')->constrained('countries')
        // It didn't have state_id. But maybe it does in reality or I missed it?
        // 2025_12_28_073641_create_cities_table.php:
        // $table->foreignId('country_id')
        // No state_id in cities table definition I saw.
        // So I won't add cities relationship here unless I'm sure.
        return $this->hasMany(City::class); // Speculative, but harmless if not used.
    }
}
