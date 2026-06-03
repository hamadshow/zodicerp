<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Egypt (Country)
            $egypt = Location::create([
                'location_type' => 'country',
                'code' => '01',
                'name_json' => ['ar' => 'مصر', 'en' => 'Egypt'],
                'status' => true,
                'sort_order' => 1,
            ]);

            // Cairo Governorate (State)
            $cairoGovernorate = Location::create([
                'parent_id' => $egypt->id,
                'location_type' => 'state',
                'code' => '01-01',
                'name_json' => ['ar' => 'محافظة القاهرة', 'en' => 'Cairo Governorate'],
                'status' => true,
                'sort_order' => 1,
            ]);

            // Cairo (City)
            $cairo = Location::create([
                'parent_id' => $cairoGovernorate->id,
                'location_type' => 'city',
                'code' => '01-01-01',
                'name_json' => ['ar' => 'القاهرة', 'en' => 'Cairo'],
                'status' => true,
                'sort_order' => 1,
            ]);

            // Maadi (District)
            $maadi = Location::create([
                'parent_id' => $cairo->id,
                'location_type' => 'district',
                'code' => '01-01-01-01',
                'name_json' => ['ar' => 'المعادي', 'en' => 'Maadi'],
                'status' => true,
                'sort_order' => 1,
            ]);

            // Zahraa Maadi (Area)
            $zahraaMaadi = Location::create([
                'parent_id' => $maadi->id,
                'location_type' => 'area',
                'code' => '01-01-01-01-01',
                'name_json' => ['ar' => 'زهراء المعادي', 'en' => 'Zahraa Maadi'],
                'status' => true,
                'sort_order' => 1,
            ]);

            // Giza Governorate (State)
            $gizaGovernorate = Location::create([
                'parent_id' => $egypt->id,
                'location_type' => 'state',
                'code' => '01-02',
                'name_json' => ['ar' => 'محافظة الجيزة', 'en' => 'Giza Governorate'],
                'status' => true,
                'sort_order' => 2,
            ]);

            // Giza (City)
            $giza = Location::create([
                'parent_id' => $gizaGovernorate->id,
                'location_type' => 'city',
                'code' => '01-02-01',
                'name_json' => ['ar' => 'الجيزة', 'en' => 'Giza'],
                'status' => true,
                'sort_order' => 1,
            ]);
        });
    }
}
