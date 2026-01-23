<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Warehouses;
use App\Models\Branch;
use App\Http\Requests\Inventory\StoreWarehouseRequest;
use App\Http\Requests\Inventory\UpdateWarehouseRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WarehousesController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Warehouses::with('branch');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('warehouse_code', 'like', "%{$search}%")
                  ->orWhere('manager', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $warehouses = $query->latest()->get();
        
        // Fetch branches for the dropdown in create/edit modal
        $branches = Branch::select('id', 'branch_name')->get();

        if ($request->wantsJson()) {
            return response()->json([
                'warehouses' => $warehouses,
                'branches' => $branches
            ]);
        }

        return Inertia::render('Backend/03-Inventory/Warehouses', [
            'warehouses' => $warehouses,
            'branches' => $branches,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreWarehouseRequest $request)
    {
        try {
            DB::beginTransaction();

            // Auto-generate warehouse_code
            // Start from 5001 if no warehouses exist
            $lastWarehouse = Warehouses::latest('id')->first();
            $lastCode = $lastWarehouse ? intval($lastWarehouse->warehouse_code) : 5000;
            $newCode = strval($lastCode + 1);

            $warehouse = Warehouses::create([
                'warehouse_code' => $newCode,
                'name' => $request->name,
                'branch_id' => $request->branch_id,
                'manager' => $request->manager,
                'location' => $request->location,
                'capacity' => $request->capacity ?? 0,
                'used_capacity' => 0, // Initial used capacity is 0
                'status' => $request->status,
                'icon' => $request->icon ?? 'warehouse',
                'color' => $request->color ?? '#3b82f6',
                'description' => $request->description,
            ]);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Warehouse created successfully', 'data' => $warehouse], 201);
            }

            return redirect()->back()->with('success', 'Warehouse created successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error creating warehouse', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error creating warehouse: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Warehouses $warehouse)
    {
        if ($request->wantsJson()) {
            return response()->json($warehouse->load('branch'));
        }
        
        // Return inertia view if needed, or just redirect to index with selected item
        return redirect()->route('admin.warehouses', ['warehouse_id' => $warehouse->id]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateWarehouseRequest $request, Warehouses $warehouse)
    {
        try {
            DB::beginTransaction();

            $warehouse->update([
                'name' => $request->name,
                'branch_id' => $request->branch_id,
                'manager' => $request->manager,
                'location' => $request->location,
                'capacity' => $request->capacity ?? 0,
                // used_capacity is not updated directly via edit form usually, but business logic might require it. 
                // For now, we preserve existing or update if logic demands. 
                // The request doesn't validate used_capacity, so we keep it as is.
                'status' => $request->status,
                'icon' => $request->icon,
                'color' => $request->color,
                'description' => $request->description,
            ]);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Warehouse updated successfully', 'data' => $warehouse]);
            }

            return redirect()->back()->with('success', 'Warehouse updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error updating warehouse', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error updating warehouse: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Warehouses $warehouse)
    {
        try {
            // Check if warehouse has inventory or other dependencies
            // This is a placeholder for actual inventory check
            // if ($warehouse->inventory()->exists()) { ... }
            
            if ($warehouse->used_capacity > 0) {
                 // Example check: don't delete if used capacity > 0 (implies items inside)
                 // Or we can just allow soft delete.
                 // For now, let's allow soft delete as requested.
            }

            $warehouse->delete();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Warehouse deleted successfully']);
            }

            return redirect()->back()->with('success', 'Warehouse deleted successfully');

        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error deleting warehouse', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error deleting warehouse: ' . $e->getMessage()]);
        }
    }
}
