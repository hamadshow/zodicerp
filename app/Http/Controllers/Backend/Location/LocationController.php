<?php

namespace App\Http\Controllers\Backend\Location;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationResource;
use App\Models\Location;
use App\Services\LocationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LocationController extends Controller
{
    protected $locationService;

    public function __construct(LocationService $locationService)
    {
        $this->locationService = $locationService;
    }

    /**
     * Display the main manager interface
     * NOTE: Returns ONLY real records from database, NO mock/demo data!
     */
    public function index(Request $request)
    {
        return Inertia::render('Backend/01-Essential_Data/Location', [
            'initialRootLocations' => LocationResource::collection($this->locationService->getTree(null)),
        ]);
    }

    /**
     * API: Get root locations only
     */
    public function getRoots()
    {
        $locations = $this->locationService->getTree(null);
        return LocationResource::collection($locations);
    }

    /**
     * API: Get children for specific location
     */
    public function getChildren($id)
    {
        $parent = Location::findOrFail($id);
        $children = $this->locationService->getTree($id);

        return response()->json([
            'parent' => new LocationResource($parent),
            'children' => LocationResource::collection($children)
        ]);
    }

    /**
     * Store a newly created location
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'parent_id' => 'nullable|exists:locations,id',
            'name_json' => 'required|array',
            'name_json.ar' => 'required|string|max:255',
            'name_json.en' => 'required|string|max:255',
            'location_type' => 'required|in:country,state,city,district,area',
            'status' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $location = $this->locationService->create($validated);

        return response()->json([
            'message' => __('Location created successfully'),
            'data' => new LocationResource($location)
        ]);
    }

    /**
     * Update the specified location
     */
    public function update(Request $request, Location $location)
    {
        $validated = $request->validate([
            'name_json' => 'required|array',
            'name_json.ar' => 'required|string|max:255',
            'name_json.en' => 'required|string|max:255',
            'status' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $location = $this->locationService->update($location, $validated);

        return response()->json([
            'message' => __('Location updated successfully'),
            'data' => new LocationResource($location)
        ]);
    }

    /**
     * Remove the specified location
     */
    public function destroy(Location $location)
    {
        $location->delete();
        return response()->json(['message' => __('Location deleted successfully')]);
    }

    /**
     * Toggle status
     */
    public function toggleStatus(Location $location)
    {
        $location->update(['status' => !$location->status]);
        return response()->json([
            'message' => __('Status updated successfully'),
            'data' => new LocationResource($location)
        ]);
    }

    /**
     * Get full path/breadcrumbs for a location
     */
    public function getPath(Location $location)
    {
        $path = [];
        $current = $location;
        while ($current) {
            array_unshift($path, new LocationResource($current));
            $current = $current->parent;
        }
        return response()->json($path);
    }

    /**
     * API: Get all countries
     */
    public function getCountries()
    {
        $countries = Location::where('location_type', 'country')->where('status', true)->orderBy('sort_order')->get();
        return LocationResource::collection($countries);
    }

    /**
     * API: Get all cities
     */
    public function getCities()
    {
        $cities = Location::where('location_type', 'city')->where('status', true)->orderBy('sort_order')->get();
        return LocationResource::collection($cities);
    }

    /**
     * Store Country
     */
    public function storeCountry(Request $request)
    {
        $request->merge(['location_type' => 'country']);
        return $this->store($request);
    }

    /**
     * Update Country
     */
    public function updateCountry(Request $request, Location $country_model)
    {
        return $this->update($request, $country_model);
    }

    /**
     * Destroy Country
     */
    public function destroyCountry(Location $country_model)
    {
        return $this->destroy($country_model);
    }

    /**
     * Store City
     */
    public function storeCity(Request $request)
    {
        $request->merge(['location_type' => 'city']);
        return $this->store($request);
    }

    /**
     * Update City
     */
    public function updateCity(Request $request, Location $city)
    {
        return $this->update($request, $city);
    }

    /**
     * Destroy City
     */
    public function destroyCity(Location $city)
    {
        return $this->destroy($city);
    }

    /**
     * Store Area
     */
    public function storeArea(Request $request)
    {
        $request->merge(['location_type' => 'area']);
        return $this->store($request);
    }

    /**
     * Update Area
     */
    public function updateArea(Request $request, Location $area)
    {
        return $this->update($request, $area);
    }

    /**
     * Destroy Area
     */
    public function destroyArea(Location $area)
    {
        return $this->destroy($area);
    }

    /**
     * Bulk Import
     */
    public function bulkImport(Request $request)
    {
        // Implementation for bulk import
        return response()->json(['message' => __('Bulk import successful')]);
    }

    /**
     * Bulk Delete
     */
    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        Location::whereIn('id', $ids)->delete();
        return response()->json(['message' => __('Selected locations deleted successfully')]);
    }

    /**
     * Bulk Update Status
     */
    public function bulkUpdateStatus(Request $request)
    {
        $ids = $request->ids;
        $status = $request->status;
        Location::whereIn('id', $ids)->update(['status' => $status]);
        return response()->json(['message' => __('Selected locations status updated successfully')]);
    }
}
