<?php

namespace App\Http\Controllers\Backend\Budget;

use App\Http\Controllers\Controller;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetCategory;
use App\Models\Budget\BudgetItem;
use App\Models\Account;
use App\Models\Taxes\Tax;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BudgetItemController extends Controller
{
    public function index()
    {
        $items = BudgetItem::with(['budget', 'category', 'account'])->paginate(10);
        $budgets = Budget::all();
        $categories = BudgetCategory::all();
        $accounts = Account::all();
        $taxes = Tax::all();

        return Inertia::render('Backend/Budget/BudgetItems', [
            'items' => $items,
            'budgets' => $budgets,
            'categories' => $categories,
            'accounts' => $accounts,
            'taxes' => $taxes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'budget_id' => 'required',
            'category_id' => 'required',
            'account_id' => 'required',
            'annual_amount' => 'required|numeric',
            // Add other validations as needed
        ]);

        BudgetItem::create($request->all());

        return redirect()->back()->with('success', 'Budget item created successfully.');
    }

    public function update(Request $request, $id)
    {
        $item = BudgetItem::findOrFail($id);
        $item->update($request->all());

        return redirect()->back()->with('success', 'Budget item updated successfully.');
    }

    public function destroy($id)
    {
        BudgetItem::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Budget item deleted successfully.');
    }
}
