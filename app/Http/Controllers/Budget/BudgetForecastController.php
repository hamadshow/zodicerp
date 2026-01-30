<?php

namespace App\Http\Controllers\Budget;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\Budget\BudgetForecast;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetItem;

class BudgetForecastController extends Controller
{
    public function index()
    {
        $forecasts = BudgetForecast::with(['budget', 'referenceItem', 'destinationItem', 'creator', 'approver', 'implementer'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $budgets = Budget::select('id', 'budget_name_en', 'budget_name_ar', 'budget_number', 'currency_id')
            ->with('currency:id,code')
            ->get();

        return Inertia::render('Backend/Budget/BudgetForecast', [
            'forecasts' => $forecasts,
            'budgets' => $budgets,
        ]);
    }

    public function getBudgetItems($budgetId)
    {
        $items = BudgetItem::where('budget_id', $budgetId)
            ->with(['account', 'category'])
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => ($item->account ? $item->account->AccName : 'No Account') . ' - ' . ($item->category ? $item->category->name_en : 'No Category'),
                    'amount' => $item->annual_amount
                ];
            });

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'budget_id' => 'required|exists:budgets,id',
            'forecast_type' => 'required|in:revision,forecast,adjustment,transfer',
            'reference_budget_item_id' => 'required_if:forecast_type,revision,adjustment,transfer|nullable|exists:budget_items,id',
            'destination_budget_item_id' => 'required_if:forecast_type,transfer|nullable|exists:budget_items,id|different:reference_budget_item_id',
            'forecast_date' => 'required|date',
            'effective_date' => 'required|date|after_or_equal:forecast_date',
            'original_amount' => 'required|numeric',
            'revised_amount' => 'required|numeric|not_in:0',
            'revision_reason' => 'required_if:forecast_type,revision|nullable|string',
        ]);

        // Auto generate forecast number
        $validated['forecast_number'] = 'FC-' . date('Ymd') . '-' . rand(1000, 9999);
        $validated['status'] = 'draft';
        $validated['created_by'] = Auth::id();
        
        // Calculate differences
        $validated['difference_amount'] = $validated['revised_amount'] - $validated['original_amount'];
        $validated['difference_percent'] = $validated['original_amount'] != 0 
            ? ($validated['difference_amount'] / $validated['original_amount']) * 100 
            : 0;

        BudgetForecast::create($validated);

        return redirect()->back()->with('success', 'Budget Forecast created successfully.');
    }

    public function update(Request $request, $id)
    {
        $forecast = BudgetForecast::findOrFail($id);
        
        if ($forecast->status !== 'draft' && $forecast->status !== 'rejected') {
            return redirect()->back()->with('error', 'Only draft or rejected forecasts can be edited.');
        }

        $validated = $request->validate([
            'budget_id' => 'required|exists:budgets,id',
            'forecast_type' => 'required|in:revision,forecast,adjustment,transfer',
            'reference_budget_item_id' => 'required_if:forecast_type,revision,adjustment,transfer|nullable|exists:budget_items,id',
            'destination_budget_item_id' => 'required_if:forecast_type,transfer|nullable|exists:budget_items,id|different:reference_budget_item_id',
            'forecast_date' => 'required|date',
            'effective_date' => 'required|date|after_or_equal:forecast_date',
            'original_amount' => 'required|numeric',
            'revised_amount' => 'required|numeric|not_in:0',
            'revision_reason' => 'required_if:forecast_type,revision|nullable|string',
        ]);

        // Calculate differences
        $validated['difference_amount'] = $validated['revised_amount'] - $validated['original_amount'];
        $validated['difference_percent'] = $validated['original_amount'] != 0 
            ? ($validated['difference_amount'] / $validated['original_amount']) * 100 
            : 0;

        $forecast->update($validated);

        return redirect()->back()->with('success', 'Budget Forecast updated successfully.');
    }

    public function submitForApproval($id)
    {
        $forecast = BudgetForecast::findOrFail($id);
        
        if ($forecast->status !== 'draft') {
            return redirect()->back()->with('error', 'Only draft forecasts can be submitted.');
        }

        $forecast->update(['status' => 'pending_approval']);
        
        return redirect()->back()->with('success', 'Forecast submitted for approval.');
    }

    public function approve(Request $request, $id)
    {
        $forecast = BudgetForecast::findOrFail($id);
        
        if ($forecast->status !== 'pending_approval') {
            return redirect()->back()->with('error', 'Forecast is not pending approval.');
        }

        $request->validate([
            'approved_amount' => 'required|numeric|lte:revised_amount'
        ]);

        $forecast->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_date' => now(),
            'approved_amount' => $request->approved_amount
        ]);
        
        return redirect()->back()->with('success', 'Forecast approved successfully.');
    }

    public function reject($id)
    {
        $forecast = BudgetForecast::findOrFail($id);
        
        if ($forecast->status !== 'pending_approval') {
            return redirect()->back()->with('error', 'Forecast is not pending approval.');
        }

        $forecast->update(['status' => 'rejected']);
        
        return redirect()->back()->with('success', 'Forecast rejected.');
    }

    public function implement($id)
    {
        $forecast = BudgetForecast::findOrFail($id);
        
        if ($forecast->status !== 'approved') {
            return redirect()->back()->with('error', 'Only approved forecasts can be implemented.');
        }

        DB::transaction(function () use ($forecast) {
            // Update the actual budget item if it's a revision or adjustment
            if ($forecast->reference_budget_item_id && in_array($forecast->forecast_type, ['revision', 'adjustment', 'transfer'])) {
                $item = BudgetItem::find($forecast->reference_budget_item_id);
                if ($item) {
                    $item->annual_amount = $forecast->approved_amount ?? $forecast->revised_amount;
                    // Also update variance if needed, but that might depend on actuals
                    $item->save();
                }
            }

            // Handle Transfer Destination
            if ($forecast->forecast_type === 'transfer' && $forecast->destination_budget_item_id) {
                $destItem = BudgetItem::find($forecast->destination_budget_item_id);
                if ($destItem) {
                    // Transfer Amount = Original (Source) - Revised (Source)
                    // We add this amount to the destination
                    $transferAmount = $forecast->original_amount - ($forecast->approved_amount ?? $forecast->revised_amount);
                    $destItem->annual_amount += $transferAmount;
                    $destItem->save();
                }
            }

            // Lock the forecast
            $forecast->update([
                'status' => 'implemented',
                'implemented_by' => Auth::id(),
                'implemented_date' => now()
            ]);
        });
        
        return redirect()->back()->with('success', 'Forecast implemented successfully and budget updated.');
    }
}
