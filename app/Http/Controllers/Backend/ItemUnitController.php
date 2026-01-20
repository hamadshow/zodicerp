<?php

namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ItemUnitController extends Controller
{
    public function index()
    {
        try {
            $units = ItemUnit::with('children')->get();
            $parents = ItemUnit::whereNull('base_unit')->get();

            return Inertia::render('Backend/03-Inventory/ItemUnits', [
                'units' => $units,
                'parents' => $parents
            ]);
        } catch (\Exception $e) {
            return redirect()->route('admin')->with('error', 'Error loading item units: ' . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:100',
                'unit_type' => 'required|integer|in:1,2',
                'base_unit' => 'nullable|exists:item_units,id',
                'conversion_factor' => 'required|numeric|min:0',
                'active' => 'boolean',
            ]);

            $user_id = Auth::id();
            $validated['created_by'] = $user_id;
            $validated['updated_by'] = $user_id;

            ItemUnit::create($validated);

            return redirect()->back()->with('success', 'Item Unit created successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating item unit: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $unit = ItemUnit::findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:100',
                'unit_type' => 'required|integer|in:1,2',
                'base_unit' => 'nullable|exists:item_units,id',
                'conversion_factor' => 'required|numeric|min:0',
                'active' => 'boolean',
            ]);

            if ($request->base_unit && (int)$request->base_unit === (int)$id) {
                 return redirect()->back()->with('error', 'A unit cannot be its own base unit.');
            }

            $validated['updated_by'] = Auth::id();

            $unit->update($validated);

            return redirect()->back()->with('success', 'Item Unit updated successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (ModelNotFoundException $e) {
            return redirect()->back()->with('error', 'Item Unit not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error updating item unit: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $unit = ItemUnit::findOrFail($id);
            
            if ($unit->children()->count() > 0) {
                return redirect()->back()->with('error', 'Cannot delete unit because it has sub-units.');
            }

            $unit->delete();

            return redirect()->back()->with('success', 'Item Unit deleted successfully.');
        } catch (ModelNotFoundException $e) {
            return redirect()->back()->with('error', 'Item Unit not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting item unit: ' . $e->getMessage());
        }
    }
}
