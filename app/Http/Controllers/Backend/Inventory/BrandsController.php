<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Brands;
use App\Http\Requests\Inventory\StoreBrandsRequest;
use App\Http\Requests\Inventory\UpdateBrandsRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class BrandsController extends Controller
{
    public function index(Request $request)
    {
        $query = Brands::with('parent');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('brand_code', 'like', "%{$search}%");
            });
        }

        $brands = $query->orderBy('order')->orderBy('name')->get();
        $parents = Brands::select('id', 'name')->orderBy('name')->get();

        if ($request->wantsJson()) {
            return response()->json([
                'brands' => $brands,
                'parents' => $parents
            ]);
        }

        return Inertia::render('Backend/03-Inventory/Brands', [
            'brands' => $brands,
            'parents' => $parents,
        ]);
    }

    public function store(StoreBrandsRequest $request)
    {
        try {
            DB::beginTransaction();

            // Auto-generate Brand Code
            $lastBrand = Brands::latest('id')->first();
            $nextId = $lastBrand ? ($lastBrand->id + 1) : 1;
            $brandCode = 'BRD-' . str_pad($nextId + 3000, 4, '0', STR_PAD_LEFT);

            Brands::create([
                'brand_code' => $brandCode,
                'name' => $request->name,
                'parent_id' => $request->parent_id,
                'status' => $request->status,
                'order' => $request->order ?? 0,
            ]);

            DB::commit();

            return redirect()->route('admin.brands.index')
                ->with('success', 'Brand created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create brand: ' . $e->getMessage()]);
        }
    }

    public function update(UpdateBrandsRequest $request, Brands $brand)
    {
        try {
            DB::beginTransaction();

            $brand->update([
                'name' => $request->name,
                'parent_id' => $request->parent_id,
                'status' => $request->status,
                'order' => $request->order ?? 0,
            ]);

            DB::commit();

            return redirect()->route('admin.brands.index')
                ->with('success', 'Brand updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to update brand: ' . $e->getMessage()]);
        }
    }

    public function destroy(Brands $brand)
    {
        if ($brand->children()->count() > 0) {
            return back()->withErrors(['error' => 'Cannot delete brand with sub-brands.']);
        }

        $brand->delete();

        return redirect()->route('admin.brands.index')
            ->with('success', 'Brand deleted successfully.');
    }
}
