<?php

namespace App\Http\Controllers\Backend\Location;

use App\Http\Controllers\Controller;
use App\Http\Requests\Location\BulkDeleteRequest;
use App\Http\Requests\Location\BulkUpdateStatusRequest;
use App\Http\Requests\Location\StoreAreaRequest;
use App\Http\Requests\Location\StoreCityRequest;
use App\Http\Requests\Location\StoreCountryRequest;
use App\Http\Requests\Location\UpdateAreaRequest;
use App\Http\Requests\Location\UpdateCityRequest;
use App\Http\Requests\Location\UpdateCountryRequest;
use App\Models\Area;
use App\Models\City;
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

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
        if (! $countryId) {
            return response()->json([]);
        }

        return response()->json(City::where('country_id', $countryId)->where('status', 'active')->get());
    }

    public function getAreas(Request $request)
    {
        $cityId = $request->query('city_id');
        if (! $cityId) {
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

    public function updateCountry(UpdateCountryRequest $request, Country $country_model)
    {
        $country_model->update($request->validated());

        return redirect()->back()->with('success', 'Country updated successfully');
    }

    public function destroyCountry(Country $country_model)
    {
        $country_model->delete();

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

        $model = match ($validated['type']) {
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

        $model = match ($validated['type']) {
            'countries' => Country::class,
            'cities' => City::class,
            'areas' => Area::class,
        };

        $model::whereIn('id', $validated['ids'])->delete();

        return redirect()->back()->with('success', 'Items deleted successfully');
    }

    public function bulkImport(Request $request)
    {
        $request->validate([
            'countries' => 'array',
            'cities' => 'array',
            'areas' => 'array',
            'options' => 'array',
            'options.updateExisting' => 'boolean',
            'options.createMissingCountries' => 'boolean',
            'options.createMissingCities' => 'boolean',
        ]);

        $countries = $request->input('countries', []);
        $cities = $request->input('cities', []);
        $areas = $request->input('areas', []);
        $options = $request->input('options', []);
        $updateExisting = filter_var($options['updateExisting'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $createMissingCountries = filter_var($options['createMissingCountries'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $createMissingCities = filter_var($options['createMissingCities'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $stats = [
            'countries' => ['added' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0],
            'cities' => ['added' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0],
            'areas' => ['added' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0],
            'errors' => [],
        ];

        $chunkSize = 500;
        $countryKeys = [];
        $cityKeys = [];
        $areaKeys = [];

        DB::beginTransaction();
        try {
            $countryIndex = 0;
            foreach (array_chunk($countries, $chunkSize) as $chunk) {
                foreach ($chunk as $countryData) {
                    $rowNumber = $countryIndex + 1;
                    $countryIndex++;

                    $name = trim((string) ($countryData['name'] ?? ''));
                    $code = trim((string) ($countryData['code'] ?? ''));
                    $key = $code !== '' ? 'code:'.mb_strtolower($code) : 'name:'.mb_strtolower($name);

                    if ($name === '') {
                        $stats['countries']['failed']++;
                        $stats['errors'][] = "Country Row {$rowNumber}: Name is required.";

                        continue;
                    }

                    if ($key !== '' && isset($countryKeys[$key])) {
                        $stats['countries']['skipped']++;
                        $stats['errors'][] = "Country Row {$rowNumber}: Duplicate in file.";

                        continue;
                    }
                    $countryKeys[$key] = true;

                    $country = null;
                    if ($code !== '') {
                        $country = Country::where('code', $code)->first();
                    }
                    if (! $country) {
                        $country = Country::where('name', $name)->first();
                    }

                    $data = array_filter([
                        'name' => $name,
                        'code' => $code !== '' ? $code : null,
                        'status' => $countryData['status'] ?? 'active',
                    ], fn ($v) => ! is_null($v) && $v !== '');

                    if ($country) {
                        if ($updateExisting) {
                            $country->update($data);
                            $stats['countries']['updated']++;
                        } else {
                            $stats['countries']['skipped']++;
                        }
                    } else {
                        Country::create($data);
                        $stats['countries']['added']++;
                    }
                }
            }

            $cityIndex = 0;
            foreach (array_chunk($cities, $chunkSize) as $chunk) {
                foreach ($chunk as $cityData) {
                    $rowNumber = $cityIndex + 1;
                    $cityIndex++;

                    $name = trim((string) ($cityData['name'] ?? ''));
                    $code = trim((string) ($cityData['code'] ?? ''));

                    if ($name === '') {
                        $stats['cities']['failed']++;
                        $stats['errors'][] = "City Row {$rowNumber}: Name is required.";

                        continue;
                    }

                    $countryId = $cityData['country_id'] ?? null;
                    if (! $countryId) {
                        $country = null;
                        if (! empty($cityData['country_code'])) {
                            $country = Country::where('code', $cityData['country_code'])->first();
                        } elseif (! empty($cityData['country_name'])) {
                            $country = Country::where('name', $cityData['country_name'])->first();
                        }

                        if (! $country && $createMissingCountries) {
                            $countryName = trim((string) ($cityData['country_name'] ?? $cityData['country_code'] ?? ''));
                            if ($countryName !== '') {
                                $country = Country::create([
                                    'name' => $countryName,
                                    'code' => $cityData['country_code'] ?? null,
                                    'status' => 'active',
                                ]);
                            }
                        }

                        if ($country) {
                            $countryId = $country->id;
                        }
                    }

                    if (! $countryId) {
                        $stats['cities']['skipped']++;
                        $stats['errors'][] = "City Row {$rowNumber} ({$name}): Country not found.";

                        continue;
                    }

                    $key = ($code !== '' ? 'code:'.mb_strtolower($code) : 'name:'.mb_strtolower($name)).'|country:'.$countryId;
                    if (isset($cityKeys[$key])) {
                        $stats['cities']['skipped']++;
                        $stats['errors'][] = "City Row {$rowNumber} ({$name}): Duplicate in file.";

                        continue;
                    }
                    $cityKeys[$key] = true;

                    $city = null;
                    if ($code !== '') {
                        $city = City::where('code', $code)->where('country_id', $countryId)->first();
                    }
                    if (! $city) {
                        $city = City::where('name', $name)->where('country_id', $countryId)->first();
                    }

                    $data = array_filter([
                        'name' => $name,
                        'country_id' => $countryId,
                        'code' => $code !== '' ? $code : null,
                        'status' => $cityData['status'] ?? 'active',
                    ], fn ($v) => ! is_null($v) && $v !== '');

                    if ($city) {
                        if ($updateExisting) {
                            $city->update($data);
                            $stats['cities']['updated']++;
                        } else {
                            $stats['cities']['skipped']++;
                        }
                    } else {
                        City::create($data);
                        $stats['cities']['added']++;
                    }
                }
            }

            $areaIndex = 0;
            foreach (array_chunk($areas, $chunkSize) as $chunk) {
                foreach ($chunk as $areaData) {
                    $rowNumber = $areaIndex + 1;
                    $areaIndex++;

                    $name = trim((string) ($areaData['name'] ?? ''));
                    $code = trim((string) ($areaData['code'] ?? ''));

                    if ($name === '') {
                        $stats['areas']['failed']++;
                        $stats['errors'][] = "Area Row {$rowNumber}: Name is required.";

                        continue;
                    }

                    $cityId = $areaData['city_id'] ?? null;
                    $city = null;

                    if ($cityId) {
                        $city = City::find($cityId);
                    } elseif (! empty($areaData['city_name'])) {
                        $cityQuery = City::query()->where('name', $areaData['city_name']);
                        if (! empty($areaData['country_code'])) {
                            $country = Country::where('code', $areaData['country_code'])->first();
                            if ($country) {
                                $cityQuery->where('country_id', $country->id);
                            }
                        } elseif (! empty($areaData['country_name'])) {
                            $country = Country::where('name', $areaData['country_name'])->first();
                            if ($country) {
                                $cityQuery->where('country_id', $country->id);
                            }
                        }
                        $city = $cityQuery->first();
                    }

                    if (! $city && $createMissingCities && ! empty($areaData['city_name'])) {
                        $countryId = null;
                        if (! empty($areaData['country_code'])) {
                            $country = Country::where('code', $areaData['country_code'])->first();
                            if ($country) {
                                $countryId = $country->id;
                            }
                        } elseif (! empty($areaData['country_name'])) {
                            $country = Country::where('name', $areaData['country_name'])->first();
                            if ($country) {
                                $countryId = $country->id;
                            }
                        }

                        if (! $countryId && $createMissingCountries) {
                            $countryName = trim((string) ($areaData['country_name'] ?? $areaData['country_code'] ?? ''));
                            if ($countryName !== '') {
                                $country = Country::create([
                                    'name' => $countryName,
                                    'code' => $areaData['country_code'] ?? null,
                                    'status' => 'active',
                                ]);
                                $countryId = $country->id;
                            }
                        }

                        if ($countryId) {
                            $city = City::create([
                                'name' => $areaData['city_name'],
                                'country_id' => $countryId,
                                'status' => 'active',
                            ]);
                        }
                    }

                    if (! $city) {
                        $stats['areas']['skipped']++;
                        $stats['errors'][] = "Area Row {$rowNumber} ({$name}): City not found.";

                        continue;
                    }

                    $cityId = $city->id;
                    $key = ($code !== '' ? 'code:'.mb_strtolower($code) : 'name:'.mb_strtolower($name)).'|city:'.$cityId;
                    if (isset($areaKeys[$key])) {
                        $stats['areas']['skipped']++;
                        $stats['errors'][] = "Area Row {$rowNumber} ({$name}): Duplicate in file.";

                        continue;
                    }
                    $areaKeys[$key] = true;

                    $area = null;
                    if ($code !== '') {
                        $area = Area::where('code', $code)->where('city_id', $cityId)->first();
                    }
                    if (! $area) {
                        $area = Area::where('name', $name)->where('city_id', $cityId)->first();
                    }

                    $data = array_filter([
                        'name' => $name,
                        'city_id' => $cityId,
                        'country_id' => $city->country_id,
                        'code' => $code !== '' ? $code : null,
                        'status' => $areaData['status'] ?? 'active',
                    ], fn ($v) => ! is_null($v) && $v !== '');

                    if ($area) {
                        if ($updateExisting) {
                            $area->update($data);
                            $stats['areas']['updated']++;
                        } else {
                            $stats['areas']['skipped']++;
                        }
                    } else {
                        Area::create($data);
                        $stats['areas']['added']++;
                    }
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['error' => 'Import failed: '.$e->getMessage()]);
        }

        return redirect()->back()->with([
            'success' => 'Import completed successfully',
            'importStats' => $stats,
        ]);
    }
}
