<?php

namespace App\Http\Controllers\Backend\Assets;

use App\Http\Controllers\Controller;
use App\Models\Assets\Asset;
use App\Models\Assets\AssetCategory;
use App\Models\Employee;
use App\Models\ItemUnit;
use App\Models\User;
use App\Models\Warehouses;
use App\Models\Accounting\JournalEntry;
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
            if ($request->has('warehouse_id') && $request->warehouse_id) {
                $query->where('warehouse_id', $request->warehouse_id);
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

    public function edit(Request $request)
    {
        // NOTE: The assets register resource is registered as
        // Route::resource('register', AssetController::class), so its route
        // parameter is "{register}" (see admin.assets.register.edit).
        // Implicit model binding requires a matching parameter name
        // ("Asset $register"); with "Asset $asset" no binding happens and the
        // container injects an empty Asset, which is why the edit page had no
        // data. Resolve the record from the named route parameter instead.
        $asset = Asset::findOrFail($request->route('register'));

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
            'name_en' => 'required|string|max:255',
            'category_id' => 'required|exists:asset_categories,id',
            'status' => 'required|string',
        ]);

        try {
            DB::beginTransaction();

            // Auto-generate Asset Number only if not provided
            if ($request->filled('asset_number')) {
                $assetNumber = $request->input('asset_number');
            } else {
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
            }

            $data = $request->except(['image', 'gallery']); // Exclude special fields

            // Normalize names: name_en from request (already sent), fallback name_ar to name_en if empty
            $data['name_en'] = $request->input('name_en');
            $data['name_ar'] = $request->input('name_ar') ?: $request->input('name_en');
            $data['asset_number'] = $assetNumber;
            $data['created_by'] = $user->id;

            // Cost basis invariant: total_cost = unit_cost × quantity. The asset
            // form does not post total_cost, so derive it here (never NULL) —
            // depreciation and disposal treat total_cost as the authoritative
            // cost basis and fall back to unit_cost × quantity only for legacy rows.
            $unitCost = (float) ($data['unit_cost'] ?? 0);
            $quantity = (float) ($data['quantity'] ?? 1);
            if ($quantity <= 0) {
                $quantity = 1;
            }
            if ($unitCost > 0 && empty($data['total_cost'])) {
                $data['total_cost'] = round($unitCost * $quantity, 4);
            }

            // Normalize useful_life: if months provided but years missing, convert months → years for DB
            if (!isset($data['useful_life_years']) || $data['useful_life_years'] === '' || $data['useful_life_years'] === null) {
                $months = $request->input('useful_life_months');
                if ($months !== null && $months !== '') {
                    $monthsNum = floatval($months);
                    if ($monthsNum > 0) {
                        $data['useful_life_years'] = number_format($monthsNum / 12, 2, '.', '');
                    }
                }
            }

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

    public function update(Request $request)
    {
        // Same route parameter limitation as edit(): the "{register}" parameter
        // cannot be implicitly bound to "Asset $asset". The injected model is then
        // an unsaved new Asset (exists = false), and Model::update() returns false
        // for such a model, so the asset was never updated.
        $asset = Asset::findOrFail($request->route('register'));

        $user = Auth::user();
        if (! $user) {
            abort(403, 'Unauthorized');
        }

        // Basic validation. status / depreciation_method are MySQL ENUM columns,
        // so an unsupported value used to trigger a SQL error (1265 Data
        // truncated) that the catch block swallowed: the user saw the page
        // reload with no message and the asset unchanged.
        $request->validate([
            'name_en' => 'required|string|max:255',
            'category_id' => 'required|exists:asset_categories,id',
            'status' => 'required|string|in:active,idle,under_maintenance,disposed,sold,transferred',
            'depreciation_method' => 'nullable|string|in:straight_line,declining_balance,units_of_production',
        ]);

        try {
            DB::beginTransaction();

            // Only real, mass-assignable Asset columns are written. Everything
            // else the form posts (image, gallery, useful_life_months,
            // existing_image, id, timestamps, company_id, ...) is dropped here
            // instead of being silently discarded by Model::fill().
            // image_path / created_by are managed server-side below.
            $data = $request->only([
                'asset_number', 'serial_number', 'barcode',
                'name_en', 'name_ar', 'description',
                'category_id', 'unit_id', 'currency_id',
                'quantity', 'unit_cost', 'total_cost',
                'purchase_date', 'activation_date', 'warranty_expiry',
                'salvage_value', 'current_value',
                'accumulated_depreciation', 'net_book_value',
                'warehouse_id', 'department_id', 'employee_id', 'location_description',
                'status', 'condition',
                'inventory_account_id', 'tax_id', 'tax_amount', 'specifications',
                'depreciation_start_date', 'is_depreciable', 'depreciation_method',
                'useful_life_years', 'depreciation_rate',
            ]);

            // Normalize names
            $data['name_en'] = $request->input('name_en');
            $data['name_ar'] = $request->input('name_ar') ?: $request->input('name_en');

            // Cost basis invariant (same rule as store): keep total_cost =
            // unit_cost × quantity when the form did not post an explicit value.
            $unitCost = (float) ($data['unit_cost'] ?? 0);
            $quantity = (float) ($data['quantity'] ?? 1);
            if ($quantity <= 0) {
                $quantity = 1;
            }
            if ($unitCost > 0 && empty($data['total_cost'])) {
                $data['total_cost'] = round($unitCost * $quantity, 4);
            }

            // The edit form only exposes "Useful Life (Months)" while the assets
            // table only stores useful_life_years. The form always posts the
            // (unchanged) useful_life_years value as well, so the old
            // "convert only when years is empty" condition never ran and the
            // user's edit was silently dropped. Months is the value the user
            // actually edits, so it is authoritative here.
            $months = $request->input('useful_life_months');
            if ($months !== null && $months !== '') {
                $monthsNum = floatval($months);
                if ($monthsNum > 0) {
                    $data['useful_life_years'] = number_format($monthsNum / 12, 2, '.', '');
                }
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

            Log::error('Asset update failed: '.$e->getMessage(), [
                'asset_id' => $asset->id,
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'request_data' => $request->except(['image', 'gallery']),
            ]);

            // with('error') is required: the existing flash notification
            // (AdminLayout -> showError) only reacts to flash.error, while a
            // plain withErrors(['error' => ...]) entry is rendered by no
            // component - which made a failed save look successful.
            return back()
                ->withErrors(['error' => 'Failed to update asset: '.$e->getMessage()])
                ->with('error', 'Failed to update asset: '.$e->getMessage())
                ->withInput();
        }
    }

    public function destroy(Asset $asset)
    {
        $user = Auth::user();
        if (! $user) {
            abort(403, 'Unauthorized');
        }

        try {
            // P0-06: Check for posted depreciation or disposal journals
            $hasPostedJournals = JournalEntry::where('entry_type', 'Depreciation')
                ->where('reference', 'like', "DEPR-{$asset->id}-%")
                ->whereIn('status', ['Post', 'posted'])
                ->exists()
                || JournalEntry::where('entry_type', 'AssetDisposal')
                ->where('reference', 'like', "DISPOSAL-{$asset->id}-%")
                ->whereIn('status', ['Post', 'posted'])
                ->exists()
                || JournalEntry::where('entry_type', 'AssetRevaluation')
                ->where('reference', 'like', "REVAL-{$asset->id}-%")
                ->whereIn('status', ['Post', 'posted'])
                ->exists();

            if ($hasPostedJournals) {
                return back()->withErrors([
                    'error' => 'Cannot delete an asset with posted accounting entries. Reverse the depreciation/disposal first.'
                ]);
            }

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
