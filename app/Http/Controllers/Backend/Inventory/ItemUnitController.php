<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\ItemUnitConversion;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
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
            $companyId = $request->user()?->company_id;
            if (!$companyId) {
                abort(403, 'Company not set for this user.');
            }

            $validated = $request->validate([
                'name' => 'required|string|max:100',
                'unit_type' => 'required|integer|in:1,2',
                'base_unit' => [
                    'nullable',
                    Rule::exists('item_units', 'id')->where(fn ($query) => $query->where('company_id', $companyId)),
                ],
                'conversion_factor' => 'nullable|numeric|gt:0',
                'active' => 'boolean',
            ]);

            $userId = Auth::id();
            $validated['created_by'] = $userId;
            $validated['updated_by'] = $userId;
            $validated['company_id'] = $companyId;

            $isBaseUnit = ((int) $validated['unit_type'] === 1);

            if ($isBaseUnit) {
                $validated['base_unit'] = null;
                $validated['conversion_factor'] = 1;
            } else {
                if (empty($validated['base_unit'])) {
                    throw ValidationException::withMessages([
                        'base_unit' => 'Base unit is required for sub units.',
                    ]);
                }

                if (empty($validated['conversion_factor'])) {
                    throw ValidationException::withMessages([
                        'conversion_factor' => 'Conversion factor is required for non-base units.',
                    ]);
                }

                $baseUnit = ItemUnit::query()
                    ->where('company_id', $companyId)
                    ->whereKey($validated['base_unit'])
                    ->first();

                if (!$baseUnit) {
                    throw ValidationException::withMessages([
                        'base_unit' => 'Invalid base unit.',
                    ]);
                }

                if ($baseUnit->base_unit !== null) {
                    throw ValidationException::withMessages([
                        'base_unit' => 'Base unit must be a top-level unit.',
                    ]);
                }
            }

            DB::transaction(function () use ($validated, $companyId, $isBaseUnit): void {
                $unit = ItemUnit::create($validated);

                if ($isBaseUnit) {
                    return;
                }

                $existingConversion = ItemUnitConversion::withoutGlobalScopes()
                    ->where('from_unit_id', $unit->getKey())
                    ->where('to_unit_id', $validated['base_unit'])
                    ->first();

                if ($existingConversion) {
                    $existingConversion->update([
                        'conversion_factor' => $validated['conversion_factor'],
                        'is_active' => true,
                    ]);
                    return;
                }

                ItemUnitConversion::create([
                    'from_unit_id' => $unit->getKey(),
                    'to_unit_id' => $validated['base_unit'],
                    'conversion_factor' => $validated['conversion_factor'],
                    'is_active' => true,
                    'company_id' => $companyId,
                ]);
            });

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

            $companyId = $request->user()?->company_id;
            if (!$companyId) {
                abort(403, 'Company not set for this user.');
            }

            if ((int) ($unit->company_id ?? 0) !== (int) $companyId) {
                abort(403, 'Unauthorized');
            }

            $validated = $request->validate([
                'name' => 'required|string|max:100',
                'unit_type' => 'required|integer|in:1,2',
                'base_unit' => [
                    'nullable',
                    Rule::exists('item_units', 'id')->where(fn ($query) => $query->where('company_id', $companyId)),
                ],
                'conversion_factor' => 'nullable|numeric|gt:0',
                'active' => 'boolean',
            ]);

            if ($request->base_unit && (int)$request->base_unit === (int)$id) {
                 return redirect()->back()->with('error', 'A unit cannot be its own base unit.');
            }

            $validated['updated_by'] = Auth::id();
            $validated['company_id'] = $companyId;

            $isBaseUnit = ((int) $validated['unit_type'] === 1);

            if ($isBaseUnit) {
                $validated['base_unit'] = null;
                $validated['conversion_factor'] = 1;
            } else {
                if (empty($validated['base_unit'])) {
                    throw ValidationException::withMessages([
                        'base_unit' => 'Base unit is required for sub units.',
                    ]);
                }

                if (empty($validated['conversion_factor'])) {
                    throw ValidationException::withMessages([
                        'conversion_factor' => 'Conversion factor is required for non-base units.',
                    ]);
                }

                $baseUnit = ItemUnit::query()
                    ->where('company_id', $companyId)
                    ->whereKey($validated['base_unit'])
                    ->first();

                if (!$baseUnit) {
                    throw ValidationException::withMessages([
                        'base_unit' => 'Invalid base unit.',
                    ]);
                }

                if ($baseUnit->base_unit !== null) {
                    throw ValidationException::withMessages([
                        'base_unit' => 'Base unit must be a top-level unit.',
                    ]);
                }
            }

            DB::transaction(function () use ($unit, $validated, $companyId, $isBaseUnit): void {
                $unit->update($validated);

                if ($isBaseUnit) {
                    return;
                }

                $existingConversion = ItemUnitConversion::withoutGlobalScopes()
                    ->where('from_unit_id', $unit->getKey())
                    ->where('to_unit_id', $validated['base_unit'])
                    ->first();

                if ($existingConversion) {
                    $existingConversion->update([
                        'conversion_factor' => $validated['conversion_factor'],
                        'is_active' => true,
                    ]);
                    return;
                }

                ItemUnitConversion::create([
                    'from_unit_id' => $unit->getKey(),
                    'to_unit_id' => $validated['base_unit'],
                    'conversion_factor' => $validated['conversion_factor'],
                    'is_active' => true,
                    'company_id' => $companyId,
                ]);
            });

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
