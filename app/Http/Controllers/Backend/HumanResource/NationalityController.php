<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Nationality;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NationalityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Nationality::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('country_code', 'like', "%{$search}%");
        }

        $nationalities = $query->orderBy('id', 'desc')->paginate(10);

        if ($request->wantsJson()) {
            return response()->json($nationalities);
        }

        return Inertia::render('Backend/02_human_resource/Nationalities', [
            'initialNationalities' => $nationalities
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'country_code' => 'required|string|max:5',
            'region' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:255',
            'language' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $nationality = Nationality::create($validated);

        return response()->json([
            'message' => 'Nationality created successfully',
            'data' => $nationality
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Nationality $nationality)
    {
        return response()->json($nationality);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Nationality $nationality)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'country_code' => 'required|string|max:5',
            'region' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:255',
            'language' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $nationality->update($validated);

        return response()->json([
            'message' => 'Nationality updated successfully',
            'data' => $nationality
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Nationality $nationality)
    {
        $nationality->delete();

        return response()->json([
            'message' => 'Nationality deleted successfully'
        ]);
    }
}
