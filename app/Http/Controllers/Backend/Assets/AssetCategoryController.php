<?php

namespace App\Http\Controllers\Backend\Assets;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Assets\AssetCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssetCategoryController extends Controller
{
    public function index(Request $request)
    {
        // Get all categories ordered by code
        $categories = AssetCategory::with('parent')
            ->orderBy('code')
            ->get();

        // Get potential parents (all categories)
        $parents = AssetCategory::select('id', 'name_en', 'name_ar', 'code')->orderBy('code')->get();

        // Get Accounts for dropdowns
        // Assuming we need specific account types, but for now getting all active accounts
        $accounts = Account::where('AccStopped', false)
            ->select('AccID', 'AccName', 'AccCode')
            ->orderBy('AccCode')
            ->get();

        if ($request->wantsJson()) {
            return response()->json([
                'categories' => $categories,
                'parents' => $parents,
                'accounts' => $accounts,
            ]);
        }

        return Inertia::render('Backend/08-Assets/AssetCategory', [
            'categories' => $categories,
            'parents' => $parents,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'parent_id' => 'nullable|exists:asset_categories,id',
            'name_ar' => 'nullable|string|max:255',
            'name_en' => 'required|string|max:255',
            'description' => 'nullable|string',
            'depreciation_method' => 'nullable|string|in:straight_line,declining_balance,units_of_production',
            'useful_life_years' => 'nullable|numeric|min:0',
            'salvage_value_rate' => 'nullable|numeric|min:0|max:100',
            'account_purchase_id' => 'nullable|exists:accounts,AccID',
            'account_depreciation_id' => 'nullable|exists:accounts,AccID',
            'account_accumulated_depreciation_id' => 'nullable|exists:accounts,AccID',
            'account_disposal_gain_id' => 'nullable|exists:accounts,AccID',
            'account_disposal_loss_id' => 'nullable|exists:accounts,AccID',
            'is_active' => 'boolean',
        ]);

        try {
            DB::beginTransaction();

            // Auto-generate Code
            $lastCategory = AssetCategory::withTrashed()->orderBy('id', 'desc')->first();
            $nextCode = $lastCategory ? (intval($lastCategory->code) + 1) : 1001;

            $validated['code'] = $nextCode;

            AssetCategory::create($validated);

            DB::commit();

            return redirect()->back()->with('success', 'Asset Category created successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Error creating category: '.$e->getMessage()]);
        }
    }

    public function update(Request $request, $id)
    {
        $category = AssetCategory::findOrFail($id);

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:asset_categories,id',
            'name_ar' => 'nullable|string|max:255',
            'name_en' => 'required|string|max:255',
            'description' => 'nullable|string',
            'depreciation_method' => 'nullable|string|in:straight_line,declining_balance,units_of_production',
            'useful_life_years' => 'nullable|numeric|min:0',
            'salvage_value_rate' => 'nullable|numeric|min:0|max:100',
            'account_purchase_id' => 'nullable|exists:accounts,AccID',
            'account_depreciation_id' => 'nullable|exists:accounts,AccID',
            'account_accumulated_depreciation_id' => 'nullable|exists:accounts,AccID',
            'account_disposal_gain_id' => 'nullable|exists:accounts,AccID',
            'account_disposal_loss_id' => 'nullable|exists:accounts,AccID',
            'is_active' => 'boolean',
        ]);

        try {
            DB::beginTransaction();

            // Prevent self-parenting
            if ($validated['parent_id'] == $category->id) {
                return back()->withErrors(['parent_id' => 'Category cannot be its own parent.']);
            }

            $category->update($validated);

            DB::commit();

            return redirect()->back()->with('success', 'Asset Category updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Error updating category: '.$e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        $category = AssetCategory::findOrFail($id);

        // Check for children
        if ($category->children()->count() > 0) {
            return back()->withErrors(['error' => 'Cannot delete category with sub-categories.']);
        }

        $category->delete();

        return redirect()->back()->with('success', 'Asset Category deleted successfully');
    }
}
