<?php

namespace App\Services;

use App\Models\Location;
use Illuminate\Support\Facades\DB;

class LocationService
{
    /**
     * Get tree data for navigation
     * NOTE: Uses ONLY real Eloquent queries, NO mock data injected!
     */
    public function getTree(?int $parentId = null)
    {
        return Location::where('parent_id', $parentId)
            ->withCount('children')
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Create a new location with automatic code generation
     */
    public function create(array $data)
    {
        return DB::transaction(function () use ($data) {
            $data['code'] = Location::generateCode($data['parent_id'] ?? null);
            return Location::create($data);
        });
    }

    /**
     * Update a location
     */
    public function update(Location $location, array $data)
    {
        return DB::transaction(function () use ($location, $data) {
            $location->update($data);
            return $location;
        });
    }

    /**
     * Global search
     */
    public function search(string $term)
    {
        return Location::where('code', 'like', "%$term%")
            ->orWhere('name_json->ar', 'like', "%$term%")
            ->orWhere('name_json->en', 'like', "%$term%")
            ->limit(20)
            ->get();
    }
}
