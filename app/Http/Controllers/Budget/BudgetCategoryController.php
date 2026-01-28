<?php

namespace App\Http\Controllers\Budget;

use App\Http\Controllers\Controller;
use App\Models\Budget\BudgetCategory;
use App\Models\Account;
use App\Models\Assets\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class BudgetCategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $categories = BudgetCategory::with(['parent', 'account', 'department'])
            ->orderBy('id', 'desc')
            ->get();
        
        // Fetch accounts and departments for dropdowns
        $accounts = Account::select('AccID', 'AccName')->get();
        $departments = Department::select('id', 'name_en', 'name_ar')->get();

        return Inertia::render('Backend/Budget/BudgetCategory', [
            'categories' => $categories,
            'parentCategories' => $categories, // Passing all categories as potential parents
            'accounts' => $accounts,
            'departments' => $departments,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:budget_categories,id',
            'code' => 'nullable|string|unique:budget_categories,code',
            'category_type' => 'nullable|string',
            'account_id' => 'nullable|exists:accounts,AccID',
            'department_id' => 'nullable|exists:departments,id',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
        ]);

        // Auto-generate code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = 'BC-' . strtoupper(Str::random(6));
        }

        BudgetCategory::create($validated);

        return redirect()->back()->with('success', 'Budget Category created successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $category = BudgetCategory::findOrFail($id);

        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:budget_categories,id',
            'code' => 'nullable|string|unique:budget_categories,code,' . $id,
            'category_type' => 'nullable|string',
            'account_id' => 'nullable|exists:accounts,AccID',
            'department_id' => 'nullable|exists:departments,id',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
        ]);

        $category->update($validated);

        return redirect()->back()->with('success', 'Budget Category updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $category = BudgetCategory::findOrFail($id);
        $category->delete();

        return redirect()->back()->with('success', 'Budget Category deleted successfully.');
    }
}
