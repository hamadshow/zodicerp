<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\City;
use App\Models\Country;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create countries
        $egypt = Country::updateOrCreate(
            ['code' => 'EG'],
            [
                'name' => 'Egypt',
                'status' => 'active',
            ]
        );

        $usa = Country::updateOrCreate(
            ['code' => 'US'],
            [
                'name' => 'United States',
                'status' => 'active',
            ]
        );

        // Create cities
        $cairo = City::updateOrCreate(
            ['name' => 'Cairo', 'country_id' => $egypt->id],
            [
                'code' => 'CAI',
                'latitude' => 30.0444,
                'longitude' => 31.2357,
                'status' => 'active',
            ]
        );

        $alexandria = City::updateOrCreate(
            ['name' => 'Alexandria', 'country_id' => $egypt->id],
            [
                'code' => 'ALX',
                'latitude' => 31.2001,
                'longitude' => 29.9187,
                'status' => 'active',
            ]
        );

        $newYork = City::updateOrCreate(
            ['name' => 'New York', 'country_id' => $usa->id],
            [
                'code' => 'NYC',
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'status' => 'active',
            ]
        );

        $losAngeles = City::updateOrCreate(
            ['name' => 'Los Angeles', 'country_id' => $usa->id],
            [
                'code' => 'LAX',
                'latitude' => 34.0522,
                'longitude' => -118.2437,
                'status' => 'active',
            ]
        );

        // Create areas
        Area::updateOrCreate(
            ['name' => 'Downtown Cairo', 'city_id' => $cairo->id],
            [
                'country_id' => $egypt->id,
                'code' => 'DTC',
                'latitude' => 30.0444,
                'longitude' => 31.2357,
                'status' => 'active',
            ]
        );

        Area::updateOrCreate(
            ['name' => 'Zamalek', 'city_id' => $cairo->id],
            [
                'country_id' => $egypt->id,
                'code' => 'ZAM',
                'latitude' => 30.0667,
                'longitude' => 31.2167,
                'status' => 'active',
            ]
        );

        Area::updateOrCreate(
            ['name' => 'Manhattan', 'city_id' => $newYork->id],
            [
                'country_id' => $usa->id,
                'code' => 'MAN',
                'latitude' => 40.7831,
                'longitude' => -73.9712,
                'status' => 'active',
            ]
        );

        Area::updateOrCreate(
            ['name' => 'Brooklyn', 'city_id' => $newYork->id],
            [
                'country_id' => $usa->id,
                'code' => 'BRK',
                'latitude' => 40.6782,
                'longitude' => -73.9442,
                'status' => 'active',
            ]
        );
    }
}
