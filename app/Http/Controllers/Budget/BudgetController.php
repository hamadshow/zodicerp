<?php

namespace App\Http\Controllers\Budget;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\Budget\Budget;
use App\Models\Assets\Department;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\Budget\BudgetCategory;
use App\Models\Account;
use App\Models\Taxes\TaxType;

class BudgetController extends Controller
{
    public function index()
    {
        $budgets = Budget::with(['department', 'items'])->orderBy('created_at', 'desc')->paginate(10);
        
        $departments = Department::all();
        $branches = Branch::all();
        $currencies = Currency::all();
        $categories = BudgetCategory::all();
        $accounts = Account::all();
        $taxes = TaxType::all();
        
        // Pass empty arrays for missing models for now
        $projects = []; 
        $costCenters = [];

        return Inertia::render('Backend/Budget/Budget', [
            'budgets' => $budgets,
            'departments' => $departments,
            'branches' => $branches,
            'currencies' => $currencies,
            'categories' => $categories,
            'accounts' => $accounts,
            'taxes' => $taxes,
            'projects' => $projects,
            'costCenters' => $costCenters,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'budget_number' => 'required|string|unique:budgets,budget_number',
            'budget_name_ar' => 'required|string',
            'budget_name_en' => 'required|string',
            'fiscal_year' => 'required|integer',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'budget_type' => 'required|in:annual,quarterly,monthly,project,rolling',
            'scope_type' => 'required|in:company,department,project,cost_center,branch',
        ]);

        DB::transaction(function () use ($request) {
            $budget = Budget::create($request->except('items'));
            
            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    $budget->items()->create($item);
                }
            }
        });

        return redirect()->route('admin.budget.index')->with('success', 'Budget created successfully.');
    }

    public function update(Request $request, $id)
    {
        $budget = Budget::findOrFail($id);

        $request->validate([
            'budget_number' => 'required|string|unique:budgets,budget_number,' . $budget->id,
            'budget_name_ar' => 'required|string',
            'budget_name_en' => 'required|string',
            'fiscal_year' => 'required|integer',
            'budget_type' => 'sometimes|in:annual,quarterly,monthly,project,rolling',
            'scope_type' => 'sometimes|in:company,department,project,cost_center,branch',
        ]);

        DB::transaction(function () use ($request, $budget) {
            $budget->update($request->except('items'));
            
            if ($request->has('items') && is_array($request->items)) {
                // Delete existing items
                $budget->items()->delete();
                
                // Re-create items
                foreach ($request->items as $item) {
                    $budget->items()->create($item);
                }
            }
        });

        return redirect()->route('admin.budget.index')->with('success', 'Budget updated successfully.');
    }

    public function destroy($id)
    {
        $budget = Budget::findOrFail($id);
        $budget->delete();
        return redirect()->route('admin.budget.index')->with('success', 'Budget deleted successfully.');
    }
}
