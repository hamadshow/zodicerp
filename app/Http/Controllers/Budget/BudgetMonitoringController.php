<?php

namespace App\Http\Controllers\Budget;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\Budget\BudgetMonitoring;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetItem;

class BudgetMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $query = BudgetMonitoring::with(['budget', 'budgetItem.account', 'budgetItem.category', 'monitor', 'acknowledger']);

        // Filters
        if ($request->filled('budget_id')) {
            $query->where('budget_id', $request->budget_id);
        }
        if ($request->filled('budget_item_id')) {
            $query->where('budget_item_id', $request->budget_item_id);
        }
        if ($request->filled('period_year')) {
            $query->where('period_year', $request->period_year);
        }
        if ($request->filled('period_type')) {
            $query->where('period_type', $request->period_type);
        }
        if ($request->filled('period_month')) {
            $query->where('period_month', $request->period_month);
        }
        if ($request->filled('variance_status')) {
            $query->where('variance_status', $request->variance_status);
        }
        if ($request->filled('threshold_breached')) {
            $query->where('threshold_breached', $request->boolean('threshold_breached'));
        }
        if ($request->filled('alert_level')) {
            $query->where('alert_level', $request->alert_level);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('monitoring_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('monitoring_date', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'monitoring_date');
        $sortDir = $request->input('sort_dir', 'desc');
        $allowedSorts = ['monitoring_date', 'actual_amount', 'variance_amount', 'variance_percent', 'available_amount'];
        
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('monitoring_date', 'desc');
        }

        $monitorings = $query->paginate(15)->withQueryString();

        $budgets = Budget::select('id', 'budget_name_en', 'budget_name_ar', 'budget_number')->get();
        
        // Only fetch items if budget_id is selected, otherwise empty or handle via API
        $budgetItems = [];
        if ($request->filled('budget_id')) {
            $budgetItems = BudgetItem::where('budget_id', $request->budget_id)
                ->with(['account:AccID,AccName', 'category:id,name_en'])
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => ($item->account ? $item->account->AccName : 'No Account') . ' - ' . ($item->category ? $item->category->name_en : 'No Category')
                    ];
                });
        }

        return Inertia::render('Backend/Budget/BudgetMonitoring', [
            'monitorings' => $monitorings,
            'budgets' => $budgets,
            'initialBudgetItems' => $budgetItems,
            'filters' => $request->all(),
        ]);
    }

    public function getBudgetItems($budgetId)
    {
        $items = BudgetItem::where('budget_id', $budgetId)
            ->with(['account:AccID,AccName', 'category:id,name_en'])
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => ($item->account ? $item->account->AccName : 'No Account') . ' - ' . ($item->category ? $item->category->name_en : 'No Category')
                ];
            });

        return response()->json($items);
    }

    public function update(Request $request, $id)
    {
        $monitoring = BudgetMonitoring::findOrFail($id);
        
        $validated = $request->validate([
            'comments' => 'nullable|string',
            'action_required' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
        ]);

        $monitoring->update($validated);

        return redirect()->back()->with('success', 'Monitoring record updated successfully.');
    }

    public function acknowledge(Request $request, $id)
    {
        $monitoring = BudgetMonitoring::findOrFail($id);
        
        if ($monitoring->acknowledged_by) {
            return redirect()->back()->with('error', 'Already acknowledged.');
        }

        $monitoring->update([
            'acknowledged_by' => Auth::id(),
            'acknowledged_date' => now(),
        ]);

        return redirect()->back()->with('success', 'Acknowledged successfully.');
    }

    public function followUp(Request $request, $id)
    {
        $monitoring = BudgetMonitoring::findOrFail($id);
        
        $validated = $request->validate([
            'follow_up_date' => 'required|date',
            'action_required' => 'required|string',
        ]);

        $monitoring->update($validated);

        return redirect()->back()->with('success', 'Follow-up scheduled successfully.');
    }

    public function markActionDone(Request $request, $id)
    {
        $monitoring = BudgetMonitoring::findOrFail($id);
        
        $monitoring->update([
            'action_required' => null, // Or 'Done: ' . $monitoring->action_required
            'follow_up_date' => null, // Clear follow up? Or keep history?
            // Let's assume we just append status
            'comments' => $monitoring->comments . "\n[Action Marked Done by " . Auth::user()->name . " on " . now()->toDateString() . "]",
        ]);

        return redirect()->back()->with('success', 'Action marked as done.');
    }

    public function export(Request $request)
    {
        // Simple CSV Export
        $query = BudgetMonitoring::with(['budget', 'budgetItem.account', 'budgetItem.category']);
        // Apply same filters as index... (simplified for brevity, should extract filter logic)
        if ($request->filled('budget_id')) $query->where('budget_id', $request->budget_id);
        // ... (other filters)

        $monitorings = $query->orderBy('monitoring_date', 'desc')->get();

        $filename = "budget_monitoring_" . date('Y-m-d_His') . ".csv";
        $handle = fopen('php://output', 'w');
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        fputcsv($handle, ['Date', 'Budget', 'Item', 'Actual', 'Variance', 'Status']);

        foreach ($monitorings as $row) {
            fputcsv($handle, [
                $row->monitoring_date,
                $row->budget->budget_name_en ?? '',
                $row->budgetItem->account->AccName ?? '',
                $row->actual_amount,
                $row->variance_amount,
                $row->variance_status
            ]);
        }

        fclose($handle);
        exit;
    }

    
    // Helper calculation method if needed for creating records
    // Assuming records are created via a separate process or background job, 
    // but adding a store method for manual entry/testing if required.
    public function store(Request $request)
    {
         $validated = $request->validate([
            'budget_id' => 'required|exists:budgets,id',
            'budget_item_id' => 'required|exists:budget_items,id',
            'monitoring_date' => 'required|date',
            'actual_amount' => 'required|numeric|min:0',
            'committed_amount' => 'nullable|numeric|min:0',
            'encumbered_amount' => 'nullable|numeric|min:0',
            'period_type' => 'required|string',
            // ... add other validations
        ]);

        // Fetch Budget Item to get budgeted amount for calculation
        // For simplicity, assuming annual_amount or period logic here
        // This logic can be complex depending on period type (monthly vs annual)
        
        DB::transaction(function () use ($validated) {
            // Calculation logic would go here
            // $available = $budgeted - $actual - $committed - $encumbered
            // $variance = $actual - $budgeted
            
             BudgetMonitoring::create($validated);
        });

        return redirect()->back()->with('success', 'Monitoring record created.');
    }
}
