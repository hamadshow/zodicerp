<?php

namespace App\Http\Controllers\Backend\Assets;

use App\Http\Controllers\Controller;
use App\Models\Assets\Asset;
use App\Models\Assets\AssetCategory;
use App\Models\Employee;
use App\Models\ItemUnit;
use App\Models\User;
use App\Models\Warehouses;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Asset::with(['category', 'warehouse', 'employee', 'unit']);

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name_en', 'like', "%{$search}%")
                        ->orWhere('asset_number', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%");
                });
            }

            // Filters
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }
            if ($request->has('category_id') && $request->category_id) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->has('employee_id') && $request->employee_id) {
                $query->where('employee_id', $request->employee_id);
            }

            $assets = $query->orderBy('asset_number', 'desc')->paginate(20)->withQueryString();

            // Data for dropdowns
            $categories = AssetCategory::select('id', 'name_en as name', 'parent_id')->orderBy('name_en')->get();
            $warehouses = Warehouses::select('id', 'name')->get(); // Assuming Warehouse has name
            $units = ItemUnit::select('id', 'name')->where('unit_type', 1)->get();
            $employees = Employee::select('id', 'name')->get();

            if ($request->wantsJson()) {
                return response()->json([
                    'assets' => $assets,
                    'categories' => $categories,
                    'warehouses' => $warehouses,
                    'units' => $units,
                    'employees' => $employees,
                ]);
            }

            return Inertia::render('Backend/08-Assets/Assets', [
                'assets' => $assets,
                'categories' => $categories,
                'warehouses' => $warehouses,
                'units' => $units,
                'employees' => $employees,
                'filters' => $request->only(['search', 'status', 'category_id', 'employee_id']),
            ]);
        } catch (Exception $e) {
            Log::error('Error retrieving assets: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            return Inertia::render('Backend/08-Assets/Assets', [
                'assets' => collect([]),
                'categories' => collect([]),
                'filters' => $request->only(['search', 'status', 'category_id']),
                'error' => 'Failed to retrieve assets. Please try again later.',
            ]);
        }
    }

    public function create(Request $request)
    {
        $categories = AssetCategory::select('id', 'name_en as name', 'parent_id')->orderBy('name_en')->get();
        $warehouses = Warehouses::select('id', 'name')->get();
        $units = ItemUnit::select('id', 'name')->where('unit_type', 1)->get();
        $employees = Employee::select('id', 'name')->get();

        return Inertia::render('Backend/08-Assets/Assets', [
            'asset' => null,
            'categories' => $categories,
            'warehouses' => $warehouses,
            'units' => $units,
            'employees' => $employees,
        ]);
    }

    public function edit(Asset $asset, Request $request)
    {
        $categories = AssetCategory::select('id', 'name_en as name', 'parent_id')->orderBy('name_en')->get();
        $warehouses = Warehouses::select('id', 'name')->get();
        $units = ItemUnit::select('id', 'name')->get();
        $employees = Employee::select('id', 'name')->get();

        return Inertia::render('Backend/08-Assets/Assets', [
            'asset' => $asset,
            'categories' => $categories,
            'warehouses' => $warehouses,
            'units' => $units,
            'employees' => $employees,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            abort(403, 'Unauthorized');
        }

        // Basic validation - adapt as needed for Asset model
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:asset_categories,id',
            'status' => 'required|string',
        ]);

        try {
            DB::beginTransaction();

            // Auto-generate Asset Number
            $lastAsset = Asset::where('asset_number', 'like', 'AST-%')
                ->orderByRaw('CAST(SUBSTRING(asset_number, 5) AS UNSIGNED) DESC')
                ->first();

            if ($lastAsset) {
                $lastNumber = (int) substr($lastAsset->asset_number, 4);
                $nextNumber = $lastNumber + 1;
            } else {
                $nextNumber = 1001;
            }
            $assetNumber = 'AST-'.str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

            $data = $request->except(['image', 'gallery', 'name']); // Exclude special fields

            // Map Frontend 'name' to 'name_en' (and 'name_ar' if needed)
            $data['name_en'] = $request->input('name');
            $data['name_ar'] = $request->input('name_ar', $request->input('name')); // Fallback
            $data['asset_number'] = $assetNumber;
            $data['created_by'] = $user->id;

            // Handle Category (Products used array sync, Asset uses single category_id)
            // If frontend sends array 'category_ids', take first
            if ($request->has('category_ids') && is_array($request->input('category_ids'))) {
                $data['category_id'] = $request->input('category_ids')[0] ?? null;
            }

            // Handle Image
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $data['image_path'] = $image->store('assets/images', 'public');
            }

            $asset = Asset::create($data);

            DB::commit();

            return redirect()->route('admin.assets.register.index', [
                'country' => $request->segment(1) ?? session('country_code', 'sa'),
                'lang' => $request->segment(2) ?? session('locale', config('app.locale', 'en'))
            ])
                ->with('success', 'Asset created successfully.');

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Asset creation failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
            ]);

            return back()->withErrors(['error' => 'Failed to create asset: '.$e->getMessage()])->withInput();
        }
    }

    public function update(Request $request, Asset $asset)
    {
        $user = Auth::user();

        try {
            DB::beginTransaction();

            $data = $request->except(['image', 'gallery', 'name']);

            // Map name
            if ($request->has('name')) {
                $data['name_en'] = $request->input('name');
            }

            $data['updated_by'] = $user->id;

            // Handle Image
            if ($request->hasFile('image')) {
                // Delete old
                if ($asset->image_path && Storage::disk('public')->exists($asset->image_path)) {
                    Storage::disk('public')->delete($asset->image_path);
                }
                $data['image_path'] = $request->file('image')->store('assets/images', 'public');
            }

            $asset->update($data);

            DB::commit();

            return redirect()->route('admin.assets.register.index', [
                'country' => $request->segment(1) ?? session('country_code', 'sa'),
                'lang' => $request->segment(2) ?? session('locale', config('app.locale', 'en'))
            ])
                ->with('success', 'Asset updated successfully.');

        } catch (Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Failed to update asset: '.$e->getMessage()])->withInput();
        }
    }

    public function destroy(Asset $asset)
    {
        try {
            if ($asset->image_path && Storage::disk('public')->exists($asset->image_path)) {
                Storage::disk('public')->delete($asset->image_path);
            }

            $asset->delete();

            return redirect()->route('admin.assets.register.index', [
                'country' => request()->segment(1) ?? session('country_code', 'sa'),
                'lang' => request()->segment(2) ?? session('locale', config('app.locale', 'en'))
            ])
                ->with('success', 'Asset deleted successfully.');
        } catch (Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete asset.']);
        }
    }
}
