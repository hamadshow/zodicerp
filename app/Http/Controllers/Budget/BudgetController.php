<?php

namespace App\Http\Controllers\Budget;

use App\Http\Controllers\Controller;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetItem;
use App\Models\Budget\BudgetCategory;
use App\Models\Assets\Department;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\Account;
use App\Models\Taxes\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BudgetController extends Controller
{
    public function index()
    {
        $budgets = Budget::with(['department', 'branch', 'currency', 'items'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Backend/Budget/Budget', [
            'budgets' => $budgets,
            'departments' => Department::all(),
            'branches' => Branch::all(),
            'currencies' => Currency::all(),
            'categories' => BudgetCategory::all(),
            'accounts' => Account::where('AccStopped', 0)->get(),
            'taxes' => Tax::all(),
            // Placeholders for missing models
            'projects' => [], 
            'costCenters' => [],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'budget_number' => 'required|string|unique:budgets,budget_number',
            'budget_name_ar' => 'nullable|string',
            'budget_name_en' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'department_id' => 'nullable|exists:departments,id',
            'branch_id' => 'nullable|exists:branches,id',
            'currency_id' => 'required|exists:currencies,id',
            'items' => 'array',
            'items.*.category_id' => 'required|exists:budget_categories,id',
            'items.*.account_id' => 'required|exists:accounts,AccID',
        ]);

        DB::beginTransaction();
        try {
            $budget = Budget::create($request->except('items'));

            if ($request->has('items')) {
                foreach ($request->items as $itemData) {
                    $budget->items()->create($itemData);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Budget created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating budget: ' . $e->getMessage());
        }
    }

    public function update(Request $request, Budget $budget)
    {
        $validated = $request->validate([
            'budget_number' => 'required|string|unique:budgets,budget_number,' . $budget->id,
            'budget_name_en' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'items' => 'array',
        ]);

        DB::beginTransaction();
        try {
            $budget->update($request->except('items'));

            // Handle items: simple strategy - delete all and recreate, or update existing
            // For a complex grid, syncing is safer if IDs are present.
            
            $existingIds = collect($request->items)->pluck('id')->filter()->toArray();
            $budget->items()->whereNotIn('id', $existingIds)->delete();

            foreach ($request->items as $itemData) {
                if (isset($itemData['id'])) {
                    $budget->items()->where('id', $itemData['id'])->update($itemData);
                } else {
                    $budget->items()->create($itemData);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Budget updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating budget: ' . $e->getMessage());
        }
    }

    public function destroy(Budget $budget)
    {
        $budget->items()->delete();
        $budget->delete();
        return redirect()->back()->with('success', 'Budget deleted successfully.');
    }
}
