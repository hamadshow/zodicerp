<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\InvestingStack\Broker;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BrokerController extends Controller
{
    public function index(Request $request)
    {
        $query = Broker::with(['country']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('broker_name_en', 'like', "%{$search}%")
                    ->orWhere('broker_name_ar', 'like', "%{$search}%")
                    ->orWhere('broker_code', 'like', "%{$search}%");
            });
        }

        $brokers = $query->orderBy('broker_name_ar')
            ->paginate(10)
            ->withQueryString();

        $countries = Location::where('location_type', 'country')->select('id', 'name_json', 'code')->get();

        return Inertia::render('Backend/InvestingStack/Brokers', [
            'brokers' => $brokers,
            'countries' => $countries,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'broker_code' => 'required|string|max:50|unique:brokers,broker_code',
            'broker_name_ar' => 'required|string|max:200',
            'broker_name_en' => 'nullable|string|max:200',
            'broker_type' => 'required|in:stock,forex,commodities,crypto,full_service,discount,online,institutional',
            'country_id' => 'required|exists:locations,id',
            'is_regulated' => 'boolean',
            'status' => 'in:active,suspended,revoked,blacklisted,inactive',
            'legal_name_ar' => 'nullable|string',
            'legal_name_en' => 'nullable|string',
            'license_number' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'website' => 'nullable|url',
        ]);

        // Default status if not provided
        if (! isset($validated['status'])) {
            $validated['status'] = 'active';
        }

        Broker::create($validated);

        return redirect()->back()->with('success', 'Broker created successfully.');
    }

    public function update(Request $request, Broker $broker)
    {
        $validated = $request->validate([
            'broker_code' => 'required|string|max:50|unique:brokers,broker_code,'.$broker->id,
            'broker_name_ar' => 'required|string|max:200',
            'broker_name_en' => 'nullable|string|max:200',
            'broker_type' => 'required|in:stock,forex,commodities,crypto,full_service,discount,online,institutional',
            'country_id' => 'required|exists:locations,id',
            'status' => 'in:active,suspended,revoked,blacklisted,inactive',
            'is_regulated' => 'boolean',
            'legal_name_ar' => 'nullable|string',
            'legal_name_en' => 'nullable|string',
            'license_number' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'website' => 'nullable|url',
        ]);

        $broker->update($validated);

        return redirect()->back()->with('success', 'Broker updated successfully.');
    }

    public function destroy(Broker $broker)
    {
        $broker->delete();

        return redirect()->back()->with('success', 'Broker deleted successfully.');
    }
}
