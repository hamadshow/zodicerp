<?php

namespace App\Http\Controllers\Backend\Budget;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetCommitment;
use App\Models\Budget\BudgetItem;
use App\Models\Budget\BudgetMonitoring;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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

            // Determine Variance Status (Favorable/Unfavorable)
            // Assuming Expense Budget: Positive Variance (Actual > Budget) is Unfavorable
            if ($varianceAmount > 0) {
                $varianceStatus = 'unfavorable';
            } elseif ($varianceAmount < 0) {
                $varianceStatus = 'favorable';
            } else {
                $varianceStatus = 'neutral';
            }

            $thresholdBreached = $absVariance >= $threshold;

            $alertLevel = 'low'; // Default to low
            if ($absVariance >= ($threshold * 2)) {
                $alertLevel = 'high';
            } elseif ($absVariance >= ($threshold * 1.5)) {
                $alertLevel = 'medium';
            } elseif ($absVariance >= $threshold) {
                $alertLevel = 'low'; // Or 'low' if breached but not high/medium
            }

            $row->actual_amount = $actualAmount;
            $row->committed_amount = $committedAmount;
            $row->available_amount = $availableAmount;
            $row->variance_amount = $varianceAmount;
            $row->variance_percent = $variancePercent;
            $row->variance_status = $varianceStatus;
            $row->threshold_breached = $thresholdBreached;
            $row->alert_level = $alertLevel;

            if ($row->isDirty(['actual_amount', 'committed_amount', 'available_amount', 'variance_amount', 'variance_percent', 'variance_status', 'threshold_breached', 'alert_level'])) {
                $row->save();
            }

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
                        'name' => ($item->account ? $item->account->AccName : 'No Account').' - '.($item->category ? $item->category->name_en : 'No Category'),
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

    public function dashboard(Request $request)
    {
        $budgets = Budget::select('id', 'budget_name_en', 'budget_name_ar', 'budget_number', 'fiscal_year', 'start_date', 'end_date')->get();
        $categories = \App\Models\Budget\BudgetCategory::select('id', 'name_en', 'name_ar')->get();

        $filters = [
            'budget_id' => $request->input('budget_id'),
            'category_id' => $request->input('category_id'),
            'period_type' => $request->input('period_type', 'monthly'),
            'period_year' => (int) $request->input('period_year', now()->year),
            'period_month' => (int) $request->input('period_month', now()->month),
            'period_quarter' => (int) $request->input('period_quarter', 1),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        // Mandatory Budget Selection: Return empty data if not selected
        if (! $filters['budget_id']) {
            return Inertia::render('Backend/Budget/BudgeDashBoard', [
                'budgets' => $budgets,
                'categories' => $categories,
                'filters' => $filters,
                'kpis' => [
                    'total_budgeted' => 0,
                    'total_actual' => 0,
                    'total_available' => 0,
                    'variance_amount' => 0,
                    'variance_percent' => 0,
                    'budget_items' => 0,
                    'categories' => 0,
                ],
                'monthlyTrend' => [],
                'categorySummaries' => [],
                'topVariances' => [],
                'alertCounts' => ['low' => 0, 'medium' => 0, 'high' => 0],
                'budgetItemsTable' => [],
            ]);
        }

        [$startDate, $endDate] = $this->resolvePeriodRange(
            $request,
            $filters['period_type'],
            $filters['period_year'],
            $filters['period_month'],
            $filters['period_quarter'],
            null
        );

        // Fetch Budget Items with Relationships
        $budgetItemsQuery = BudgetItem::query()->with(['category', 'account:AccID,AccName,AccDmType']);
        if ($filters['budget_id']) {
            $budgetItemsQuery->where('budget_id', $filters['budget_id']);
        }
        if ($filters['category_id']) {
            $budgetItemsQuery->where('category_id', $filters['category_id']);
        }
        $budgetItems = $budgetItemsQuery->get();

        $accountIdentifiers = $budgetItems->pluck('account_id')->filter()->unique()->values();
        $lookupAccounts = collect();
        if ($accountIdentifiers->isNotEmpty()) {
            $lookupAccounts = Account::query()
                ->whereIn('AccID', $accountIdentifiers)
                ->orWhereIn('AccCode', $accountIdentifiers)
                ->get(['AccID', 'AccCode', 'AccName', 'AccDmType']);
        }
        $accountsById = $lookupAccounts->keyBy('AccID');
        $accountsByCode = $lookupAccounts->keyBy('AccCode');
        $resolveAccount = function ($item) use ($accountsById, $accountsByCode) {
            return $item->account
                ?? $accountsById->get($item->account_id)
                ?? $accountsByCode->get($item->account_id);
        };
        $accounts = $budgetItems
            ->map(fn ($item) => $resolveAccount($item))
            ->filter()
            ->values();
        $accIds = $accounts->pluck('AccID')->filter()->unique();
        $accCodes = $accounts->pluck('AccCode')->filter()->unique();
        $allIdentifiers = $accIds->merge($accCodes)->unique()->values();

        // Map Code -> ID for aggregation
        $codeToId = $accounts->pluck('AccID', 'AccCode')->toArray();

        $actualByAccount = [];

        if ($allIdentifiers->isNotEmpty() && $startDate && $endDate) {
            $rawActuals = JournalEntryLine::query()
                ->join('journal_entries', 'journal_entries.entry_code', '=', 'journal_entry_lines.journal_entry_code')
                ->whereIn('journal_entry_lines.account_id', $allIdentifiers)
                ->whereDate('journal_entries.date', '>=', $startDate)
                ->whereDate('journal_entries.date', '<=', $endDate)
                ->select(
                    'journal_entry_lines.account_id',
                    DB::raw('SUM(COALESCE(journal_entry_lines.debit,0) - COALESCE(journal_entry_lines.credit,0)) as total')
                )
                ->groupBy('journal_entry_lines.account_id')
                ->get();

            foreach ($rawActuals as $row) {
                $idOrCode = $row->account_id;
                $amount = $row->total;

                // Case 1: It's an AccID
                if ($accIds->contains($idOrCode)) {
                    $actualByAccount[$idOrCode] = ($actualByAccount[$idOrCode] ?? 0) + $amount;
                }
                // Case 2: It's an AccCode, map to AccID
                elseif (isset($codeToId[$idOrCode])) {
                    $mappedId = $codeToId[$idOrCode];
                    $actualByAccount[$mappedId] = ($actualByAccount[$mappedId] ?? 0) + $amount;
                }
            }
        }
        $actualByAccount = collect($actualByAccount);

        // Calculate Budgeted Amounts
        $budgetedByItem = collect();
        foreach ($budgetItems as $item) {
            $budgetedByItem[$item->id] = $this->calculateBudgetedForFilters($item, $filters, $startDate, $endDate);
        }

        // REMOVED: BudgetCommitment usage (not in allowed tables list)
        $commitmentByItem = collect();

        // Aggregate Totals (normalized by account nature)
        $totalBudgeted = (float) $budgetItems->sum(function ($item) use ($budgetedByItem, $resolveAccount) {
            $budgeted = (float) ($budgetedByItem[$item->id] ?? 0);
            $account = $resolveAccount($item);
            $dm = $account?->AccDmType ?? 0;

            return $dm == 1 ? -$budgeted : $budgeted;
        });
        $totalActual = (float) $budgetItems->sum(function ($item) use ($actualByAccount, $resolveAccount) {
            $account = $resolveAccount($item);
            $accountId = $account?->AccID ?? $item->account_id;
            $actual = (float) ($actualByAccount[$accountId] ?? 0);
            $dm = $account?->AccDmType ?? 0;

            return $dm == 1 ? -$actual : $actual;
        });
        $totalAvailable = $totalBudgeted - $totalActual;
        $varianceAmount = $totalActual - $totalBudgeted;
        $variancePercent = $totalBudgeted != 0 ? ($varianceAmount / $totalBudgeted) * 100 : 0;

        // Threshold Logic
        $threshold = 10;
        if ($filters['budget_id']) {
            $selectedBudget = Budget::select('variance_threshold')->find($filters['budget_id']);
            if ($selectedBudget && $selectedBudget->variance_threshold !== null) {
                $threshold = (float) $selectedBudget->variance_threshold;
            }
        }

        // Prepare Category Summaries
        $categorySummaries = $budgetItems
            ->groupBy('category_id')
            ->map(function ($items, $categoryId) use ($actualByAccount, $budgetedByItem, $threshold, $resolveAccount) {
                $budgeted = (float) $items->sum(function ($item) use ($budgetedByItem, $resolveAccount) {
                    $val = (float) ($budgetedByItem[$item->id] ?? 0);
                    $account = $resolveAccount($item);
                    $dm = $account?->AccDmType ?? 0;

                    return $dm == 1 ? -$val : $val;
                });
                $actual = (float) $items->sum(function ($item) use ($actualByAccount, $resolveAccount) {
                    $account = $resolveAccount($item);
                    $accountId = $account?->AccID ?? $item->account_id;
                    $val = (float) ($actualByAccount[$accountId] ?? 0);
                    $dm = $account?->AccDmType ?? 0;

                    return $dm == 1 ? -$val : $val;
                });
                $varianceAmount = $actual - $budgeted;
                $variancePercent = $budgeted != 0 ? ($varianceAmount / $budgeted) * 100 : 0;
                $varianceStatus = $varianceAmount > 0 ? 'unfavorable' : ($varianceAmount < 0 ? 'favorable' : 'neutral');
                $alertLevel = $this->resolveAlertLevel($variancePercent, $threshold);
                $categoryName = optional($items->first()->category)->name_en ?? 'Uncategorized';

                return [
                    'category_id' => $categoryId,
                    'category_name' => $categoryName,
                    'budgeted' => $budgeted,
                    'actual' => $actual,
                    'variance_amount' => $varianceAmount,
                    'variance_percent' => $variancePercent,
                    'variance_status' => $varianceStatus,
                    'alert_level' => $alertLevel,
                ];
            })
            ->values();

        // Alert Counts
        $alertCounts = [
            'low' => 0,
            'medium' => 0,
            'high' => 0,
        ];
        foreach ($categorySummaries as $summary) {
            if (isset($alertCounts[$summary['alert_level']])) {
                $alertCounts[$summary['alert_level']]++;
            }
        }

        // Top Variances
        $topVariances = $categorySummaries
            ->sortByDesc(function ($row) {
                return abs($row['variance_percent']);
            })
            ->take(5)
            ->values();

        // Budget Items Table Data
        $budgetItemsTable = $budgetItems->map(function ($item) use ($actualByAccount, $budgetedByItem, $threshold, $resolveAccount) {
            $account = $resolveAccount($item);
            $accountId = $account?->AccID ?? $item->account_id;
            $dm = $account?->AccDmType ?? 0;
            $budgetedRaw = (float) ($budgetedByItem[$item->id] ?? 0);
            $actualRaw = (float) ($actualByAccount[$accountId] ?? 0);
            $budgetedNorm = $dm == 1 ? -$budgetedRaw : $budgetedRaw;
            $actualNorm = $dm == 1 ? -$actualRaw : $actualRaw;
            $available = $budgetedNorm - $actualNorm;
            $varianceAmount = $actualNorm - $budgetedNorm;
            $variancePercent = $budgetedNorm != 0 ? ($varianceAmount / $budgetedNorm) * 100 : 0;
            $varianceStatus = $varianceAmount > 0 ? 'unfavorable' : ($varianceAmount < 0 ? 'favorable' : 'neutral');
            $alertLevel = $this->resolveAlertLevel($variancePercent, $threshold);

            // Utilization % (Actual / Budgeted * 100)
            $utilizationPercent = $budgetedNorm != 0 ? ($actualNorm / $budgetedNorm) * 100 : 0;

            return [
                'id' => $item->id,
                'name_ar' => optional($item->category)->name_ar ?? optional($account)->AccName ?? '—',
                'name_en' => optional($item->category)->name_en ?? optional($account)->AccName ?? '',
                'category_name' => optional($item->category)->name_en ?? 'Uncategorized',
                'account_name' => optional($account)->AccName ?? 'No Account',
                'account_dm_type' => optional($account)->AccDmType ?? 0,
                'budgeted' => $budgetedRaw,
                'actual' => $actualRaw,
                'available' => $available,
                'variance_amount' => $varianceAmount,
                'variance_percent' => $variancePercent,
                'utilization_percent' => $utilizationPercent,
                'variance_status' => $varianceStatus,
                'alert_level' => $alertLevel,
            ];
        });

        // Monthly Trend Data
        // Optimization: Calculate aggregated monthly budget from items
        $monthColumns = [
            1 => 'jan_amount', 2 => 'feb_amount', 3 => 'mar_amount', 4 => 'apr_amount',
            5 => 'may_amount', 6 => 'jun_amount', 7 => 'jul_amount', 8 => 'aug_amount',
            9 => 'sep_amount', 10 => 'oct_amount', 11 => 'nov_amount', 12 => 'dec_amount',
        ];
        $monthlyBudgeted = array_fill(1, 12, 0.0);
        foreach ($budgetItems as $item) {
            foreach ($monthColumns as $month => $column) {
                $monthlyBudgeted[$month] += (float) ($item->$column ?? 0);
            }
        }

        $monthlyActuals = [];
        if ($allIdentifiers->isNotEmpty()) {
            $monthlyActuals = JournalEntryLine::query()
                ->join('journal_entries', 'journal_entries.entry_code', '=', 'journal_entry_lines.journal_entry_code')
                ->whereIn('journal_entry_lines.account_id', $allIdentifiers)
                ->whereYear('journal_entries.date', $filters['period_year'])
                ->selectRaw('MONTH(journal_entries.date) as month, SUM(COALESCE(journal_entry_lines.debit,0) - COALESCE(journal_entry_lines.credit,0)) as total')
                ->groupBy('month')
                ->pluck('total', 'month')
                ->toArray();
        }

        $monthlyTrend = collect(range(1, 12))->map(function ($month) use ($monthlyBudgeted, $monthlyActuals) {
            return [
                'month' => $month,
                'label' => Carbon::create()->month($month)->format('M'),
                'budgeted' => (float) ($monthlyBudgeted[$month] ?? 0),
                'actual' => (float) ($monthlyActuals[$month] ?? 0),
            ];
        });

        $kpis = [
            'total_budgeted' => $totalBudgeted,
            'total_actual' => $totalActual,
            'total_available' => $totalAvailable,
            'variance_amount' => $varianceAmount,
            'variance_percent' => $variancePercent,
            'utilization_percent' => $totalBudgeted != 0 ? ($totalActual / $totalBudgeted) * 100 : 0,
            'budget_items' => $budgetItems->count(),
            'categories' => $categorySummaries->count(),
        ];

        return Inertia::render('Backend/Budget/BudgeDashBoard', [
            'budgets' => $budgets,
            'categories' => $categories,
            'filters' => $filters,
            'kpis' => $kpis,
            'monthlyTrend' => $monthlyTrend,
            'categorySummaries' => $categorySummaries,
            'topVariances' => $topVariances,
            'alertCounts' => $alertCounts,
            'budgetItemsTable' => $budgetItemsTable,
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
                    'name' => ($item->account ? $item->account->AccName : 'No Account').' - '.($item->category ? $item->category->name_en : 'No Category'),
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
            'comments' => $monitoring->comments."\n[Action Marked Done by ".Auth::user()->name.' on '.now()->toDateString().']',
        ]);

        return redirect()->back()->with('success', 'Action marked as done.');
    }

    public function export(Request $request)
    {
        // Simple CSV Export
        $query = BudgetMonitoring::with(['budget', 'budgetItem.account', 'budgetItem.category']);
        // Apply same filters as index... (simplified for brevity, should extract filter logic)
        if ($request->filled('budget_id')) {
            $query->where('budget_id', $request->budget_id);
        }
        // ... (other filters)

        $monitorings = $query->orderBy('monitoring_date', 'desc')->get();

        $filename = 'budget_monitoring_'.date('Y-m-d_His').'.csv';
        $handle = fopen('php://output', 'w');

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="'.$filename.'"');

        fputcsv($handle, ['Date', 'Budget', 'Item', 'Actual', 'Variance', 'Status']);

        foreach ($monitorings as $row) {
            fputcsv($handle, [
                $row->monitoring_date,
                $row->budget->budget_name_en ?? '',
                $row->budgetItem->account->AccName ?? '',
                $row->actual_amount,
                $row->variance_amount,
                $row->variance_status,
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

        if ($type !== 'monthly' && $type !== 'annual') {
            return;
        }

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
            if ($start && ! $end) {
                $end = $start->copy()->endOfDay();
            }
            if ($end && ! $start) {
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

        if ($periodType === 'year_to_date') {
            $start = Carbon::create($year, 1, 1)->startOfYear();
            $end = ($year == now()->year) ? now()->endOfDay() : Carbon::create($year, 12, 31)->endOfYear();

            return [$start, $end];
        }

        if ($periodType === 'quarterly') {
            $quarter = $periodQuarter ?: ($periodMonth ? (int) ceil($periodMonth / 3) : null);
            if (! $quarter) {
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
            if (! $periodMonth) {
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
            if (! $periodQuarter && $periodMonth) {
                $periodQuarter = (int) ceil($periodMonth / 3);
            }
            if (! $periodQuarter) {
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

    private function calculateBudgetedForFilters(BudgetItem $item, array $filters, $startDate, $endDate)
    {
        if ($filters['period_type'] === 'year_to_date' && $startDate && $endDate) {
            return $this->getBudgetedAmountForRange($item, $startDate, $endDate);
        }

        return $this->getBudgetedAmount(
            $item,
            $filters['period_type'],
            $filters['period_year'],
            $filters['period_month'],
            $filters['period_quarter']
        );
    }

    private function getBudgetedAmountForRange(BudgetItem $item, $startDate, $endDate)
    {
        if (! $startDate || ! $endDate) {
            return (float) $item->annual_amount;
        }

        $monthMap = [
            1 => 'jan_amount', 2 => 'feb_amount', 3 => 'mar_amount', 4 => 'apr_amount',
            5 => 'may_amount', 6 => 'jun_amount', 7 => 'jul_amount', 8 => 'aug_amount',
            9 => 'sep_amount', 10 => 'oct_amount', 11 => 'nov_amount', 12 => 'dec_amount',
        ];

        $start = Carbon::parse($startDate)->startOfMonth();
        $end = Carbon::parse($endDate)->startOfMonth();
        if ($start->greaterThan($end)) {
            [$start, $end] = [$end, $start];
        }

        $sum = 0;
        $cursor = $start->copy();
        while ($cursor->lessThanOrEqualTo($end)) {
            $column = $monthMap[(int) $cursor->month] ?? null;
            if ($column) {
                $sum += (float) ($item->$column ?? 0);
            }
            $cursor->addMonth();
        }

        return $sum;
    }

    private function resolveAlertLevel($variancePercent, $threshold)
    {
        $absVariance = abs($variancePercent);
        if ($absVariance >= ($threshold * 2)) {
            return 'high';
        }
        if ($absVariance >= ($threshold * 1.5)) {
            return 'medium';
        }
        if ($absVariance >= $threshold) {
            return 'low';
        }

        return 'none';
    }
}
