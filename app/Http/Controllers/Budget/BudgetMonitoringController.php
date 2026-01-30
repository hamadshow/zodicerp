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
use App\Models\Budget\BudgetCommitment;
use App\Models\Accounting\JournalEntryLine;
use Carbon\Carbon;

class BudgetMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $this->ensureMonitoringRecords($request);

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
        $monitorings->getCollection()->transform(function ($row) use ($request) {
            $periodType = $request->input('period_type', $row->period_type);
            $periodYear = (int) $request->input('period_year', $row->period_year);
            $periodMonth = $request->input('period_month', $row->period_month);
            $periodQuarter = $request->input('period_quarter', $row->period_quarter);

            [$startDate, $endDate] = $this->resolvePeriodRange($request, $periodType, $periodYear, $periodMonth, $periodQuarter, $row->monitoring_date);

            $accountId = $row->budgetItem?->account_id;
            $actualAmount = 0;
            if ($accountId && $startDate && $endDate) {
                $actualAmount = JournalEntryLine::query()
                    ->join('journal_entries', 'journal_entries.entry_code', '=', 'journal_entry_lines.journal_entry_code')
                    ->where('journal_entry_lines.account_id', $accountId)
                    ->whereDate('journal_entries.date', '>=', $startDate)
                    ->whereDate('journal_entries.date', '<=', $endDate)
                    ->sum(DB::raw('COALESCE(journal_entry_lines.debit,0) - COALESCE(journal_entry_lines.credit,0)'));
            }

            $committedAmount = 0;
            if ($row->budget_item_id) {
                $commitmentQuery = BudgetCommitment::where('budget_item_id', $row->budget_item_id)
                    ->whereIn('status', ['active', 'partially_utilized']);
                if ($startDate && $endDate) {
                    $commitmentQuery->whereDate('commitment_date', '>=', $startDate)
                        ->whereDate('commitment_date', '<=', $endDate);
                }
                $committedAmount = $commitmentQuery->sum('remaining_amount');
            }

            $budgetedAmount = $row->budgetItem
                ? $this->getBudgetedAmount($row->budgetItem, $periodType, $periodYear, $periodMonth, $periodQuarter)
                : 0;

            $availableAmount = $budgetedAmount - $actualAmount - $committedAmount;
            $varianceAmount = $actualAmount - $budgetedAmount;
            $variancePercent = $budgetedAmount != 0 ? ($varianceAmount / $budgetedAmount) * 100 : 0;

            $threshold = $row->budget?->variance_threshold ?? 10;
            $absVariance = abs($variancePercent);
            $varianceStatus = $absVariance >= ($threshold * 2) ? 'critical' : ($absVariance >= $threshold ? 'warning' : 'normal');
            $thresholdBreached = $absVariance >= $threshold;
            $alertLevel = null;
            if ($absVariance >= ($threshold * 2)) {
                $alertLevel = 'high';
            } elseif ($absVariance >= ($threshold * 1.5)) {
                $alertLevel = 'medium';
            } elseif ($absVariance >= $threshold) {
                $alertLevel = 'low';
            }

            $row->actual_amount = $actualAmount;
            $row->committed_amount = $committedAmount;
            $row->available_amount = $availableAmount;
            $row->variance_amount = $varianceAmount;
            $row->variance_percent = $variancePercent;
            $row->variance_status = $varianceStatus;
            $row->threshold_breached = $thresholdBreached;
            $row->alert_level = $alertLevel;

            return $row;
        });

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

    private function ensureMonitoringRecords(Request $request)
    {
        $year = $request->input('period_year', date('Y'));
        $month = $request->input('period_month', date('n'));
        $type = $request->input('period_type', 'monthly');
        
        if ($type !== 'monthly' && $type !== 'annual') return;

        $budgetId = $request->input('budget_id');
        
        $query = BudgetItem::query();
        if ($budgetId) {
            $query->where('budget_id', $budgetId);
        }
        
        $monitoringQuery = BudgetMonitoring::where('period_year', $year)
            ->where('period_type', $type);
            
        if ($type === 'monthly') {
            $monitoringQuery->where('period_month', $month);
        }

        if ($budgetId) {
            $monitoringQuery->where('budget_id', $budgetId);
        }

        $existingItems = $monitoringQuery->pluck('budget_item_id')->toArray();
        $itemsToCreate = $query->whereNotIn('id', $existingItems)->get();
        
        foreach ($itemsToCreate as $item) {
             BudgetMonitoring::create([
                'budget_id' => $item->budget_id,
                'budget_item_id' => $item->id,
                'period_year' => $year,
                'period_month' => $type === 'monthly' ? $month : null,
                'period_type' => $type,
                'monitoring_date' => $type === 'monthly' 
                    ? Carbon::create($year, $month, 1)->endOfMonth() 
                    : Carbon::create($year, 12, 31),
                'monitored_by' => Auth::id() ?? 1,
                'actual_amount' => 0,
                'committed_amount' => 0,
                'available_amount' => 0,
                'variance_amount' => 0,
                'variance_percent' => 0,
            ]);
        }
    }

    private function resolvePeriodRange(Request $request, $periodType, $periodYear, $periodMonth, $periodQuarter, $monitoringDate)
    {
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $start = $request->filled('date_from') ? Carbon::parse($request->date_from)->startOfDay() : null;
            $end = $request->filled('date_to') ? Carbon::parse($request->date_to)->endOfDay() : null;
            if ($start && !$end) {
                $end = $start->copy()->endOfDay();
            }
            if ($end && !$start) {
                $start = $end->copy()->startOfDay();
            }
            return [$start, $end];
        }

        $year = $periodYear ?: ($monitoringDate ? Carbon::parse($monitoringDate)->year : now()->year);

        if ($periodType === 'monthly') {
            $month = $periodMonth ?: now()->month;
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = Carbon::create($year, $month, 1)->endOfMonth();
            return [$start, $end];
        }

        if ($periodType === 'quarterly') {
            $quarter = $periodQuarter ?: ($periodMonth ? (int) ceil($periodMonth / 3) : null);
            if (!$quarter) {
                $start = Carbon::create($year, 1, 1)->startOfYear();
                $end = Carbon::create($year, 12, 31)->endOfYear();
                return [$start, $end];
            }
            $startMonth = (($quarter - 1) * 3) + 1;
            $start = Carbon::create($year, $startMonth, 1)->startOfMonth();
            $end = Carbon::create($year, $startMonth, 1)->addMonths(2)->endOfMonth();
            return [$start, $end];
        }

        $start = Carbon::create($year, 1, 1)->startOfYear();
        $end = Carbon::create($year, 12, 31)->endOfYear();
        return [$start, $end];
    }

    private function getBudgetedAmount(BudgetItem $item, $periodType, $periodYear, $periodMonth, $periodQuarter)
    {
        $annual = (float) $item->annual_amount;

        if ($periodType === 'monthly') {
            if (!$periodMonth) {
                return $annual / 12;
            }
            $monthMap = [
                1 => 'jan_amount', 2 => 'feb_amount', 3 => 'mar_amount', 4 => 'apr_amount',
                5 => 'may_amount', 6 => 'jun_amount', 7 => 'jul_amount', 8 => 'aug_amount',
                9 => 'sep_amount', 10 => 'oct_amount', 11 => 'nov_amount', 12 => 'dec_amount',
            ];
            $column = $monthMap[(int) $periodMonth] ?? null;
            return $column ? (float) ($item->$column ?? 0) : ($annual / 12);
        }

        if ($periodType === 'quarterly') {
            if (!$periodQuarter && $periodMonth) {
                $periodQuarter = (int) ceil($periodMonth / 3);
            }
            if (!$periodQuarter) {
                return $annual / 4;
            }
            $quarterMonths = [
                1 => [1, 2, 3],
                2 => [4, 5, 6],
                3 => [7, 8, 9],
                4 => [10, 11, 12],
            ];
            $months = $quarterMonths[(int) $periodQuarter] ?? [];
            $sum = 0;
            foreach ($months as $month) {
                $sum += $this->getBudgetedAmount($item, 'monthly', $periodYear, $month, null);
            }
            return $sum ?: ($annual / 4);
        }

        return $annual;
    }
}
