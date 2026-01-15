<?php

namespace App\Http\Controllers\Location;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\City;
use App\Models\Country;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Location\StoreCountryRequest;
use App\Http\Requests\Location\UpdateCountryRequest;
use App\Http\Requests\Location\StoreCityRequest;
use App\Http\Requests\Location\UpdateCityRequest;
use App\Http\Requests\Location\StoreAreaRequest;
use App\Http\Requests\Location\UpdateAreaRequest;

class LocationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Backend/01-Essential_Data/Location', [
            'countries' => Country::all(),
            'cities' => City::with('country')->get(),
            'areas' => Area::with('city', 'country')->get(),
        ]);
    }

    // API Methods for Dependent Dropdowns
    public function getCountries()
    {
        return response()->json(Country::where('status', 'active')->get());
    }

    public function getCities(Request $request)
    {
        $countryId = $request->query('country_id');
        if (!$countryId) {
            return response()->json([]);
        }
        return response()->json(City::where('country_id', $countryId)->where('status', 'active')->get());
    }

    public function getAreas(Request $request)
    {
        $cityId = $request->query('city_id');
        if (!$cityId) {
            return response()->json([]);
        }
        return response()->json(Area::where('city_id', $cityId)->where('status', 'active')->get());
    }

    // Countries CRUD
    public function storeCountry(StoreCountryRequest $request)
    {
        $country = Country::create($request->validated());

        return redirect()->back()->with('success', 'Country created successfully');
    }

    public function updateCountry(UpdateCountryRequest $request, Country $country)
    {
        $country->update($request->validated());

        return redirect()->back()->with('success', 'Country updated successfully');
    }

    public function destroyCountry(Country $country)
    {
        $country->delete();
        return redirect()->back()->with('success', 'Country deleted successfully');
    }

    // Cities CRUD
    public function storeCity(StoreCityRequest $request)
    {
        $city = City::create($request->validated());

        return redirect()->back()->with('success', 'City created successfully');
    }

    public function updateCity(UpdateCityRequest $request, City $city)
    {
        $city->update($request->validated());

        return redirect()->back()->with('success', 'City updated successfully');
    }

    public function destroyCity(City $city)
    {
        $city->delete();
        return redirect()->back()->with('success', 'City deleted successfully');
    }

    // Areas CRUD
    public function storeArea(StoreAreaRequest $request)
    {
        $area = Area::create($request->validated());

        return redirect()->back()->with('success', 'Area created successfully');
    }

    public function updateArea(UpdateAreaRequest $request, Area $area)
    {
        $area->update($request->validated());

        return redirect()->back()->with('success', 'Area updated successfully');
    }

    public function destroyArea(Area $area)
    {
        $area->delete();
        return redirect()->back()->with('success', 'Area deleted successfully');
    }

    // Bulk operations
    public function bulkUpdateStatus(BulkUpdateStatusRequest $request)
    {
        $validated = $request->validated();

        $model = match($validated['type']) {
            'countries' => Country::class,
            'cities' => City::class,
            'areas' => Area::class,
        };

        $model::whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Status updated successfully');
    }

    public function bulkDelete(BulkDeleteRequest $request)
    {
        $validated = $request->validated();

        $model = match($validated['type']) {
            'countries' => Country::class,
            'cities' => City::class,
            'areas' => Area::class,
        };

        $model::whereIn('id', $validated['ids'])->delete();

        return redirect()->back()->with('success', 'Items deleted successfully');
    }
}
