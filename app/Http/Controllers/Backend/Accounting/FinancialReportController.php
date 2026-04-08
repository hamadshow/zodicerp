<?php

namespace App\Http\Controllers\Backend\Accounting;

use App\Exports\InventoryValuationExport;
use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Models\UserFavoriteReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FinancialReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports');
    }

    public function getData(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([], 401);
        }

        $companyId = $user->company_id;
        $hasCompanyColumn = Schema::hasColumn('financial_reports', 'company_id');
        $hasFavoriteCompanyColumn = Schema::hasColumn('user_favorite_reports', 'company_id');

        $reportsQuery = FinancialReport::query()->where('is_active', true);

        if ($hasCompanyColumn && $companyId) {
            $reportsQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $reports = $reportsQuery
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('report_name')
            ->get();

        $favoritesQuery = UserFavoriteReport::query()->where('user_id', $user->id);

        if ($hasFavoriteCompanyColumn && $companyId) {
            $favoritesQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $favoriteIds = $favoritesQuery->pluck('report_id')->all();

        $payload = $reports->map(function (FinancialReport $report) use ($favoriteIds) {
            $route = null;

            if ($report->route_name && $report->route_name !== '#') {
                try {
                    // Try to get parameters from request or session
                    $params = [
                        'country' => $request->route('country') ?? session('country_code', 'sa'),
                        'lang' => $request->route('lang') ?? session('locale', 'en'),
                    ];
                    $route = route($report->route_name, $params);
                } catch (\Throwable $e) {
                    $route = null;
                }
            }

            return [
                'id' => $report->id,
                'report_key' => $report->report_key,
                'report_name' => $report->report_name,
                'category' => $report->category,
                'route' => $route,
                'icon' => $report->icon,
                'sort_order' => $report->sort_order,
                'is_favorite' => in_array($report->id, $favoriteIds, true),
            ];
        })->values();

        return response()->json($payload);
    }

    public function favorites(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([], 401);
        }

        $companyId = $user->company_id;
        $hasCompanyColumn = Schema::hasColumn('financial_reports', 'company_id');
        $hasFavoriteCompanyColumn = Schema::hasColumn('user_favorite_reports', 'company_id');

        $favoritesQuery = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->with('report');

        if ($hasFavoriteCompanyColumn && $companyId) {
            $favoritesQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        if ($hasCompanyColumn && $companyId) {
            $favoritesQuery->whereHas('report', function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $favorites = $favoritesQuery->get()
            ->filter(fn (UserFavoriteReport $favorite) => $favorite->report !== null)
            ->map(function (UserFavoriteReport $favorite) {
                $report = $favorite->report;

                $route = null;

                if ($report->route_name && $report->route_name !== '#') {
                    try {
                        $params = [
                            'country' => $request->route('country') ?? session('country_code', 'sa'),
                            'lang' => $request->route('lang') ?? session('locale', 'en'),
                        ];
                        $route = route($report->route_name, $params);
                    } catch (\Throwable $e) {
                        $route = null;
                    }
                }

                return [
                    'id' => $report->id,
                    'report_key' => $report->report_key,
                    'report_name' => $report->report_name,
                    'category' => $report->category,
                    'route' => $route,
                    'icon' => $report->icon,
                ];
            })
            ->values();

        return response()->json($favorites);
    }

    public function toggleFavorite(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'report_id' => ['required', 'integer', 'exists:financial_reports,id'],
        ]);

        $reportId = (int) $validated['report_id'];
        $companyId = $user->company_id;
        $hasCompanyColumn = Schema::hasColumn('financial_reports', 'company_id');
        $hasFavoriteCompanyColumn = Schema::hasColumn('user_favorite_reports', 'company_id');

        $reportQuery = FinancialReport::query()->whereKey($reportId)->where('is_active', true);
        if ($hasCompanyColumn && $companyId) {
            $reportQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        if (! $reportQuery->exists()) {
            return response()->json(['message' => 'Report not available.'], 404);
        }

        $existingQuery = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->where('report_id', $reportId);

        if ($hasFavoriteCompanyColumn && $companyId) {
            $existingQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $existing = $existingQuery->exists();

        if ($existing) {
            $existingQuery->delete();
            $isFavorite = false;
        } else {
            $attributes = [
                'user_id' => $user->id,
                'report_id' => $reportId,
            ];

            if ($hasFavoriteCompanyColumn) {
                $attributes['company_id'] = $companyId;
            }

            UserFavoriteReport::create($attributes);
            $isFavorite = true;
        }

        return response()->json([
            'success' => true,
            'report_id' => $reportId,
            'is_favorite' => $isFavorite,
        ]);
    }

    public function coaReport(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/COAReport');
    }

    public function generalLedger(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/GeneralLedger');
    }

    public function trialBalance(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/TrialBalance');
    }

    public function journalReport(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Journal');
    }

    public function balanceSheet(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/BalanceSheet');
    }

    public function balanceSheetComparison(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/BalanceSheetComparison');
    }

    public function balanceSheetDetail(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/BalanceSheetDetail');
    }

    public function profitLoss(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Profit&Loss');
    }

    public function profitLossByClass(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Profit&LossbyClass');
    }

    public function profitLossByCustomer(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Profit&LossbyCustomer');
    }

    public function profitLossByMonth(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Profit&LossbyMonth');
    }

    public function profitLossComparison(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Profit&LossComparison');
    }

    public function profitLossDetail(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/Profit&LossDetail');
    }

    public function cashFlow(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/CashFlowStatement');
    }

    public function getBalanceSheetData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json([], 401);
        }

        $asOfDate = $request->query('date', now()->toDateString());
        $compareDate = $request->query('compare_date');
        $compareToOpening = $request->query('compare_to_opening') === 'true';

        // Get data for the main date
        $data = $this->fetchBalanceSheetData($companyId, $asOfDate);

        // Get data for comparison date if requested
        $comparisonData = null;
        if ($compareToOpening) {
            $comparisonData = $this->fetchBalanceSheetData($companyId, $asOfDate, true);
        } elseif ($compareDate) {
            $comparisonData = $this->fetchBalanceSheetData($companyId, $compareDate);
        }

        return response()->json([
            'main' => $data,
            'comparison' => $comparisonData,
            'as_of_date' => $asOfDate,
            'compare_date' => $compareToOpening ? 'Opening' : $compareDate,
        ]);
    }

    private function fetchBalanceSheetData($companyId, $date, $isOpening = false)
    {
        // 1. Get all accounts for this company that are Balance Sheet accounts (AccFinal = 0 or NULL)
        $accounts = DB::table('accounts')
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereNull('AccFinal')->orWhere('AccFinal', 0);
            })
            ->get(['AccID', 'AccCode', 'AccName', 'AccType', 'AccParent', 'Nature']);

        // 2. Calculate balances up to $date
        // For professional use, we should ideally aggregate journal entries up to $date.
        // But for now, using account_postings as the user requested "easiest way".
        $postings = DB::table('account_postings')
            ->where('company_id', $companyId)
            ->get()
            ->keyBy('account_id');

        $accountData = [];
        foreach ($accounts as $account) {
            $code = $account->AccCode;
            $id = $account->AccID;
            $posting = $postings->get($id) ?? $postings->get($code);

            if ($isOpening) {
                $debit = (float)($posting?->opening_debit ?? 0);
                $credit = (float)($posting?->opening_credit ?? 0);
            } else {
                $debit = (float)($posting?->opening_debit ?? 0) + (float)($posting?->current_debit ?? 0);
                $credit = (float)($posting?->opening_credit ?? 0) + (float)($posting?->current_credit ?? 0);
            }

            $balance = 0;
            $firstDigit = substr((string)$code, 0, 1);
            if ($firstDigit === '1') { // Assets
                $balance = $debit - $credit;
            } else { // Liabilities & Equity
                $balance = $credit - $debit;
            }

            $accountData[$code] = [
                'AccID' => $id,
                'AccCode' => $code,
                'AccName' => $account->AccName,
                'AccType' => (int)$account->AccType,
                'AccParent' => $account->AccParent,
                'balance' => $balance,
            ];
        }

        // 3. Build tree and aggregate
        $tree = $this->buildBalanceSheetTree($accountData, null);

        // 4. Group by main categories
        $result = [
            'assets' => [],
            'liabilities' => [],
            'equity' => [],
            'total_assets' => 0,
            'total_liabilities' => 0,
            'total_equity' => 0,
        ];

        foreach ($tree as $node) {
            $firstDigit = substr((string)$node['AccCode'], 0, 1);
            if ($firstDigit === '1') {
                $result['assets'][] = $node;
                $result['total_assets'] += $node['balance'];
            } elseif ($firstDigit === '2') {
                $result['liabilities'][] = $node;
                $result['total_liabilities'] += $node['balance'];
            } elseif ($firstDigit === '3') {
                $result['equity'][] = $node;
                $result['total_equity'] += $node['balance'];
            }
        }

        return $result;
    }

    public function getProfitLossData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        $data = $this->fetchProfitLossData($companyId, $startDate, $endDate);

        return response()->json([
            'main' => $data,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ]);
    }

    public function getProfitLossByClassData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        // For now, return standard P&L data as a base
        $data = $this->fetchProfitLossData($companyId, $startDate, $endDate);

        return response()->json([
            'main' => $data,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ]);
    }

    public function getProfitLossByCustomerData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        $data = $this->fetchProfitLossData($companyId, $startDate, $endDate);

        return response()->json([
            'main' => $data,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ]);
    }

    public function getProfitLossByMonthData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        $data = $this->fetchProfitLossData($companyId, $startDate, $endDate);

        return response()->json([
            'main' => $data,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ]);
    }

    public function getProfitLossComparisonData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        $compareStartDate = $request->query('compare_start_date');
        $compareEndDate = $request->query('compare_end_date');

        $data = $this->fetchProfitLossData($companyId, $startDate, $endDate);
        
        $comparisonData = null;
        if ($compareStartDate && $compareEndDate) {
            $comparisonData = $this->fetchProfitLossData($companyId, $compareStartDate, $compareEndDate);
        }

        return response()->json([
            'main' => $data,
            'comparison' => $comparisonData,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'compare_period' => [
                'start' => $compareStartDate,
                'end' => $compareEndDate,
            ],
        ]);
    }

    public function getProfitLossDetailData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        $data = $this->fetchProfitLossData($companyId, $startDate, $endDate);

        return response()->json([
            'main' => $data,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ]);
    }

    public function getCashFlowData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        // 1. Get Cash Accounts (usually start with 11)
        $cashAccounts = DB::table('accounts')
            ->where('company_id', $companyId)
            ->where('AccCode', 'like', '11%')
            ->get();

        $cashAccountCodes = $cashAccounts->pluck('AccCode')->all();
        $cashAccountIds = $cashAccounts->pluck('AccID')->all();
        $allCashIds = array_unique(array_merge($cashAccountCodes, $cashAccountIds));

        // 2. Calculate Beginning Cash (Balance as of $startDate)
        $beginningCash = 0;
        
        // Sum opening balances from account_postings for the current fiscal year
        $postings = DB::table('account_postings')
            ->where('company_id', $companyId)
            ->whereIn('account_id', $allCashIds)
            ->where('period_start', '<=', $startDate)
            ->orderBy('period_start', 'desc')
            ->get()
            ->groupBy('account_id');

        foreach ($postings as $accountId => $accountPostings) {
            $latestPosting = $accountPostings->first(); // Take the most recent period starting before $startDate
            $beginningCash += (float)$latestPosting->opening_debit - (float)$latestPosting->opening_credit;
            
            // Add activity from period_start of this posting up to $startDate - 1 day
            $activityBeforeStart = DB::table('journal_entry_lines as l')
                ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
                ->where('e.company_id', $companyId)
                ->where('l.account_id', $accountId)
                ->whereBetween('e.date', [$latestPosting->period_start, date('Y-m-d', strtotime($startDate . ' -1 day'))])
                ->select(DB::raw('SUM(l.debit) as debit'), DB::raw('SUM(l.credit) as credit'))
                ->first();
                
            if ($activityBeforeStart) {
                $beginningCash += (float)$activityBeforeStart->debit - (float)$activityBeforeStart->credit;
            }
        }

        // If no postings found, try to calculate from all journal entries before $startDate
        if ($postings->isEmpty()) {
            $allActivityBeforeStart = DB::table('journal_entry_lines as l')
                ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
                ->where('e.company_id', $companyId)
                ->whereIn('l.account_id', $allCashIds)
                ->where('e.date', '<', $startDate)
                ->select(DB::raw('SUM(l.debit) as debit'), DB::raw('SUM(l.credit) as credit'))
                ->first();
                
            if ($allActivityBeforeStart) {
                $beginningCash += (float)$allActivityBeforeStart->debit - (float)$allActivityBeforeStart->credit;
            }
        }

        // 3. Calculate Net Income for the period (Revenue - Expenses)
        // Usually accounts starting with 4 (Revenue) and 5, 6 (Expenses)
        $revenue = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->join('accounts as a', 'a.AccID', '=', 'l.account_id')
            ->where('e.company_id', $companyId)
            ->whereBetween('e.date', [$startDate, $endDate])
            ->where('a.AccCode', 'like', '4%')
            ->select(DB::raw('SUM(l.credit - l.debit) as total'))
            ->first()->total ?? 0;

        $expenses = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->join('accounts as a', 'a.AccID', '=', 'l.account_id')
            ->where('e.company_id', $companyId)
            ->whereBetween('e.date', [$startDate, $endDate])
            ->where(function($q) {
                $q->where('a.AccCode', 'like', '5%')
                  ->orWhere('a.AccCode', 'like', '6%');
            })
            ->select(DB::raw('SUM(l.debit - l.credit) as total'))
            ->first()->total ?? 0;

        $netIncome = (float)$revenue - (float)$expenses;

        // 4. Get all other account changes for Indirect Method
        $operatingAdjustments = [];
        $investingActivities = [];
        $financingActivities = [];
        
        $allOtherAccounts = DB::table('accounts')
            ->where('company_id', $companyId)
            ->where('AccCode', 'not like', '11%') // Not cash
            ->where(function($q) {
                $q->where('AccCode', 'like', '1%') // Assets
                  ->orWhere('AccCode', 'like', '2%') // Liabilities
                  ->orWhere('AccCode', 'like', '3%'); // Equity
            })
            ->get();

        foreach ($allOtherAccounts as $acc) {
            $code = (string)$acc->AccCode;
            
            $periodActivity = DB::table('journal_entry_lines as l')
                ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
                ->where('e.company_id', $companyId)
                ->where('l.account_id', $acc->AccID)
                ->whereBetween('e.date', [$startDate, $endDate])
                ->select(DB::raw('SUM(l.debit) as debit'), DB::raw('SUM(l.credit) as credit'))
                ->first();

            $debitChange = (float)($periodActivity->debit ?? 0);
            $creditChange = (float)($periodActivity->credit ?? 0);
            $netChange = $debitChange - $creditChange;

            if (abs($netChange) < 0.01) continue;

            $item = [
                'AccCode' => $code,
                'name' => $acc->AccName,
                'amount' => 0
            ];

            if (str_starts_with($code, '1')) { // Assets
                $item['amount'] = -$netChange; // Increase in asset (-)
                if (str_starts_with($code, '12')) { 
                    $investingActivities[] = $item;
                } else {
                    $operatingAdjustments[] = $item;
                }
            } elseif (str_starts_with($code, '2')) { // Liabilities
                $item['amount'] = -$netChange; // Increase in liability (+)
                if (str_starts_with($code, '22')) {
                    $financingActivities[] = $item;
                } else {
                    $operatingAdjustments[] = $item;
                }
            } elseif (str_starts_with($code, '3')) { // Equity
                $item['amount'] = -$netChange; // Increase in Equity (+)
                $financingActivities[] = $item;
            }
        }

        $net_operating_adjustments = array_sum(array_column($operatingAdjustments, 'amount'));
        $net_operating = $netIncome + $net_operating_adjustments;
        $net_investing = array_sum(array_column($investingActivities, 'amount'));
        $net_financing = array_sum(array_column($financingActivities, 'amount'));

        $net_change = $net_operating + $net_investing + $net_financing;
        $ending_cash = $beginningCash + $net_change;

        return response()->json([
            'main' => [
                'net_income' => $netIncome,
                'operating' => $operatingAdjustments,
                'investing' => $investingActivities,
                'financing' => $financingActivities,
                'net_operating_adjustments' => $net_operating_adjustments,
                'net_operating' => $net_operating,
                'net_investing' => $net_investing,
                'net_financing' => $net_financing,
                'net_change' => $net_change,
                'beginning_cash' => $beginningCash,
                'ending_cash' => $ending_cash
            ]
        ]);
    }

    private function fetchProfitLossData($companyId, $startDate, $endDate)
    {
        // 1. Get all Income and Expense accounts
        $accounts = DB::table('accounts')
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->where('AccCode', 'like', '4%')
                  ->orWhere('AccCode', 'like', '5%')
                  ->orWhere('AccCode', 'like', '6%');
            })
            ->get(['AccID', 'AccCode', 'AccName', 'AccType', 'AccParent', 'Nature']);

        // 2. Get balances from journal entries for the period
        $activity = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->where('e.company_id', $companyId)
            ->whereBetween('e.date', [$startDate, $endDate])
            ->select(
                'l.account_id',
                DB::raw('SUM(l.debit) as debit'),
                DB::raw('SUM(l.credit) as credit')
            )
            ->groupBy('l.account_id')
            ->get()
            ->keyBy('account_id');

        $accountData = [];
        foreach ($accounts as $account) {
            $code = $account->AccCode;
            $id = $account->AccID;
            $act = $activity->get($id) ?? $activity->get($code);

            $debit = (float)($act?->debit ?? 0);
            $credit = (float)($act?->credit ?? 0);

            $balance = 0;
            $firstDigit = substr((string)$code, 0, 1);
            if ($firstDigit === '4') { // Income
                $balance = $credit - $debit;
            } else { // Expenses (5, 6)
                $balance = $debit - $credit;
            }

            $accountData[$code] = [
                'AccID' => $id,
                'AccCode' => $code,
                'AccName' => $account->AccName,
                'AccType' => (int)$account->AccType,
                'AccParent' => $account->AccParent,
                'balance' => $balance,
            ];
        }

        // 3. Build tree and aggregate
        $tree = $this->buildProfitLossTree($accountData, null);

        // 4. Group by main categories
        $result = [
            'income' => [],
            'cogs' => [],
            'expenses' => [],
            'total_income' => 0,
            'total_cogs' => 0,
            'total_expenses' => 0,
            'gross_profit' => 0,
            'net_income' => 0,
        ];

        foreach ($tree as $node) {
            $firstDigit = substr((string)$node['AccCode'], 0, 1);
            if ($firstDigit === '4') {
                $result['income'][] = $node;
                $result['total_income'] += $node['balance'];
            } elseif ($firstDigit === '5') {
                $result['cogs'][] = $node;
                $result['total_cogs'] += $node['balance'];
            } elseif ($firstDigit === '6') {
                $result['expenses'][] = $node;
                $result['total_expenses'] += $node['balance'];
            }
        }

        $result['gross_profit'] = $result['total_income'] - $result['total_cogs'];
        $result['net_income'] = $result['gross_profit'] - $result['total_expenses'];

        return $result;
    }

    private function buildProfitLossTree(&$accountData, $parentId = null, $depth = 0)
    {
        $tree = [];
        foreach ($accountData as $code => $account) {
            if ($account['AccParent'] == $parentId) {
                $children = $this->buildProfitLossTree($accountData, $code, $depth + 1);
                
                foreach ($children as $child) {
                    $account['balance'] += $child['balance'];
                }

                $account['depth'] = $depth;
                $account['children'] = $children;
                $tree[] = $account;
            }
        }

        usort($tree, function ($a, $b) {
            return strnatcmp($a['AccCode'], $b['AccCode']);
        });

        return $tree;
    }

    private function buildBalanceSheetTree(&$accountData, $parentId = null, $depth = 0)
    {
        $tree = [];
        foreach ($accountData as $code => $account) {
            if ($account['AccParent'] == $parentId) {
                $children = $this->buildBalanceSheetTree($accountData, $code, $depth + 1);
                
                foreach ($children as $child) {
                    $account['balance'] += $child['balance'];
                }

                $account['depth'] = $depth;
                $account['children'] = $children;
                $tree[] = $account;
            }
        }

        usort($tree, function ($a, $b) {
            return strnatcmp($a['AccCode'], $b['AccCode']);
        });

        return $tree;
    }

    public function getTrialBalanceData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json([], 401);
        }

        // 1. Get all accounts for this company
        $accounts = DB::table('accounts')
            ->where('company_id', $companyId)
            ->get(['AccID', 'AccCode', 'AccName', 'AccType', 'AccParent', 'AccDmType']);

        // 2. Get balances from account_postings table (Summary table)
        $postings = DB::table('account_postings')
            ->where('company_id', $companyId)
            ->get();
            
        // Key by account_id (which could be AccID or AccCode)
        $postingsById = $postings->keyBy('account_id');

        // 3. Prepare account data with their own balances
        $accountData = [];
        foreach ($accounts as $account) {
            $id = $account->AccID;
            $code = $account->AccCode;
            
            // Try matching by AccID first, then by AccCode
            $posting = $postingsById->get($id) ?? $postingsById->get($code);
            
            $accountData[$code] = [ // Key by AccCode for tree building
                'AccID' => $account->AccID,
                'AccCode' => $account->AccCode,
                'AccName' => $account->AccName,
                'AccType' => (int)$account->AccType,
                'AccParent' => $account->AccParent,
                'beginning_debit' => (float)($posting?->opening_debit ?? 0),
                'beginning_credit' => (float)($posting?->opening_credit ?? 0),
                'current_debit' => (float)($posting?->current_debit ?? 0),
                'current_credit' => (float)($posting?->current_credit ?? 0),
            ];
        }

        // 4. Build tree and aggregate balances from children to parents
        $tree = $this->buildTrialBalanceTree($accountData, null);

        // 5. Flatten the tree for the table display
        $flatList = $this->flattenTrialBalanceTree($tree);

        return response()->json($flatList);
    }

    private function buildTrialBalanceTree(&$accountData, $parentId = null, $depth = 0)
    {
        $tree = [];
        foreach ($accountData as $id => $account) {
            if ($account['AccParent'] == $parentId) {
                // Recursive call to get children
                $children = $this->buildTrialBalanceTree($accountData, $id, $depth + 1);
                
                // Sum up children's totals into this account
                foreach ($children as $child) {
                    $account['beginning_debit'] += $child['beginning_debit'];
                    $account['beginning_credit'] += $child['beginning_credit'];
                    $account['current_debit'] += $child['current_debit'];
                    $account['current_credit'] += $child['current_credit'];
                }

                // Calculate Ending Balances (Total)
                // We show debit and credit separately based on the net balance
                $totalDebit = $account['beginning_debit'] + $account['current_debit'];
                $totalCredit = $account['beginning_credit'] + $account['current_credit'];

                if ($totalDebit >= $totalCredit) {
                    $account['ending_debit'] = $totalDebit - $totalCredit;
                    $account['ending_credit'] = 0;
                } else {
                    $account['ending_debit'] = 0;
                    $account['ending_credit'] = $totalCredit - $totalDebit;
                }

                $account['depth'] = $depth;
                $account['children'] = $children;
                $tree[] = $account;
            }
        }

        // Sort by code for better presentation
        usort($tree, function ($a, $b) {
            return strnatcmp($a['AccCode'], $b['AccCode']);
        });

        return $tree;
    }

    private function flattenTrialBalanceTree($tree, &$flat = [])
    {
        foreach ($tree as $node) {
            $children = $node['children'];
            unset($node['children']);
            $flat[] = $node;
            $this->flattenTrialBalanceTree($children, $flat);
        }
        return $flat;
    }

    public function postJournalToPostings(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            DB::beginTransaction();

            // 1. Get all account balances from journal entries
            // Using DB::raw for performance since we need to group by account
            
            // Beginning Balances (Opening)
            $openingBalances = DB::table('journal_entry_lines as l')
                ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
                ->where('e.company_id', $companyId)
                ->where('e.entry_type', 'Opening')
                ->select(
                    'l.account_id',
                    DB::raw('SUM(l.debit) as opening_debit'),
                    DB::raw('SUM(l.credit) as opening_credit')
                )
                ->groupBy('l.account_id')
                ->get()
                ->keyBy('account_id');

            // Current Activity (Non-Opening)
            $currentActivity = DB::table('journal_entry_lines as l')
                ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
                ->where('e.company_id', $companyId)
                ->where('e.entry_type', '!=', 'Opening')
                ->select(
                    'l.account_id',
                    DB::raw('SUM(l.debit) as current_debit'),
                    DB::raw('SUM(l.credit) as current_credit'),
                    DB::raw('MIN(e.date) as period_start'),
                    DB::raw('MAX(e.date) as period_end')
                )
                ->groupBy('l.account_id')
                ->get()
                ->keyBy('account_id');

            // 2. Clear old postings for this company to avoid duplication (or update existing)
            // For simplicity and matching the request "Post", we'll refresh the table
            DB::table('account_postings')->where('company_id', $companyId)->delete();

            // 3. Prepare data for insertion
            $allAccountIds = $openingBalances->keys()->merge($currentActivity->keys())->unique();
            
            $postings = [];
            $now = now();

            foreach ($allAccountIds as $accountId) {
                $opening = $openingBalances->get($accountId);
                $current = $currentActivity->get($accountId);

                $postings[] = [
                    'account_id' => $accountId,
                    'company_id' => $companyId,
                    'period_start' => $current?->period_start ?? '2026-01-01', // Default or from request
                    'period_end' => $current?->period_end ?? '2026-12-31',
                    'opening_debit' => $opening?->opening_debit ?? 0,
                    'opening_credit' => $opening?->opening_credit ?? 0,
                    'current_debit' => $current?->current_debit ?? 0,
                    'current_credit' => $current?->current_credit ?? 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // 4. Batch insert for better performance
            if (!empty($postings)) {
                DB::table('account_postings')->insert($postings);
            }

            // 5. Update journal_entries status to 'Post'
            DB::table('journal_entries')
                ->where('company_id', $companyId)
                ->where('status', '!=', 'Post')
                ->update(['status' => 'Post']);

            DB::commit();

            return response()->json([
                'message' => 'Data posted successfully to account_postings',
                'count' => count($postings)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to post data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function unpostJournalFromPostings(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            DB::beginTransaction();

            // 1. Clear account_postings for this company
            DB::table('account_postings')->where('company_id', $companyId)->delete();

            // 2. Update all journal_entries status back to 'UnPost'
            DB::table('journal_entries')
                ->where('company_id', $companyId)
                ->update(['status' => 'UnPost']);

            DB::commit();

            return response()->json([
                'message' => 'Data unposted successfully and all entries set to UnPost'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to unpost data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function inventoryValuationSummary(Request $request): Response
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403);
        }

        return Inertia::render('Backend/07-Accounting/FinancialReports/InventoryValuationSummary', [
            'companyId' => $companyId,
        ]);
    }

    public function getInventoryValuationSummaryData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $valuationData = $this->getInventoryValuationSummaryDataArray($companyId, $startDate, $endDate);

        return response()->json([
            'data' => $valuationData,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ]
        ]);
    }

    public function getGeneralLedgerData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json([], 401);
        }

        $validated = $request->validate([
            'account_id' => 'required|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'status' => 'nullable|string|in:all,posted,unposted',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:-1|max:5000',
        ]);

        $accountId = (int) $validated['account_id'];
        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;
        $status = $validated['status'] ?? 'posted';
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 15);
        $isExport = $perPage === -1;

        $account = DB::table('accounts')
            ->where('AccID', $accountId)
            ->where('company_id', $companyId)
            ->first(['AccID', 'AccCode', 'AccName', 'AccDmType']);

        if (! $account) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        $nature = (int) ($account->AccDmType ?? 0);
        $statusPostedValues = ['Post', 'Posted'];

        $applyAccountFilter = function ($query) use ($account) {
            $query->where(function ($q) use ($account) {
                $q->where('b.account_id', $account->AccID)
                    ->orWhere('b.account_id', $account->AccCode);
            });
        };

        $applyStatusFilter = function ($query) use ($status, $statusPostedValues) {
            if ($status === 'posted') {
                $query->whereIn('h.status', $statusPostedValues);
            } elseif ($status === 'unposted') {
                $query->whereNotIn('h.status', $statusPostedValues);
            }
        };

        // Calculate opening balance (all entries before dateFrom)
        $openingDebit = 0.0;
        $openingCredit = 0.0;

        $openingQuery = DB::table('journal_entry_lines as b')
            ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
            ->where('h.company_id', $companyId)
            ->tap($applyAccountFilter)
            ->tap($applyStatusFilter);

        if ($dateFrom) {
            $openingQuery->where('h.date', '<', $dateFrom);
        } else {
            // If no dateFrom, opening balance is 0 unless there are entries with null date
            $openingQuery->whereNull('h.date');
        }

        $openingTotals = $openingQuery
            ->selectRaw('COALESCE(SUM(b.debit),0) as total_debit, COALESCE(SUM(b.credit),0) as total_credit')
            ->first();

        if ($openingTotals) {
            $openingDebit = (float) $openingTotals->total_debit;
            $openingCredit = (float) $openingTotals->total_credit;
        }

        $openingBalance = $nature === 0
            ? $openingDebit - $openingCredit
            : $openingCredit - $openingDebit;

        // Fetch entries for the current period
        $entriesQuery = DB::table('journal_entry_lines as b')
            ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
            ->where('h.company_id', $companyId)
            ->tap($applyAccountFilter)
            ->tap($applyStatusFilter);

        if ($dateFrom) {
            $entriesQuery->where('h.date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $entriesQuery->where('h.date', '<=', $dateTo);
        }

        // Get total count for pagination
        $totalRecords = $entriesQuery->count();

        if ($isExport) {
            $perPage = $totalRecords ?: 1000;
        }

        // Get all entries for the period to calculate running balance correctly
        // Running balance needs all previous entries in the period to be accurate for the current page.
        // So we fetch all entries up to the end of the current page.
        $allEntriesUntilPage = $entriesQuery
            ->leftJoin(DB::raw('(SELECT journal_entry_code, SUM(debit) as journal_total_debit, SUM(credit) as journal_total_credit FROM journal_entry_lines GROUP BY journal_entry_code) as balance_check'), 'balance_check.journal_entry_code', '=', 'h.entry_code')
            ->orderBy('h.date')
            ->orderBy('h.entry_code')
            ->orderBy('b.id')
            ->limit($page * $perPage)
            ->get([
                'h.date as date',
                'h.entry_code as journal_code',
                'h.reference as reference',
                'h.description as header_description',
                'b.description as line_description',
                'b.debit as debit',
                'b.credit as credit',
                'h.status as status',
                DB::raw('ABS(COALESCE(balance_check.journal_total_debit, 0) - COALESCE(balance_check.journal_total_credit, 0)) < 0.01 as is_balanced')
            ]);

        $runningBalance = $openingBalance;
        $totalDebit = 0.0;
        $totalCredit = 0.0;

        $mappedEntries = $allEntriesUntilPage->map(function ($row) use (&$runningBalance, &$totalDebit, &$totalCredit, $nature) {
            $debit = (float) ($row->debit ?? 0);
            $credit = (float) ($row->credit ?? 0);

            $totalDebit += $debit;
            $totalCredit += $credit;

            $delta = $nature === 0 ? $debit - $credit : $credit - $debit;
            $runningBalance += $delta;

            $row->debit = round($debit, 2);
            $row->credit = round($credit, 2);
            $row->running_balance = round($runningBalance, 2);
            $row->description = $row->line_description ?: $row->header_description;
            unset($row->header_description, $row->line_description);

            return $row;
        });

        // Slice for current page
        $currentPageEntries = $mappedEntries->slice(($page - 1) * $perPage, $perPage)->values();

        // Calculate period totals (for the whole selected period, not just the page)
        $periodTotals = DB::table('journal_entry_lines as b')
            ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
            ->where('h.company_id', $companyId)
            ->tap($applyAccountFilter)
            ->tap($applyStatusFilter);

        if ($dateFrom) {
            $periodTotals->where('h.date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $periodTotals->where('h.date', '<=', $dateTo);
        }

        $totals = $periodTotals->selectRaw('COALESCE(SUM(b.debit),0) as total_debit, COALESCE(SUM(b.credit),0) as total_credit')
            ->first();

        $closingBalance = $openingBalance + ($nature === 0 
            ? ($totals->total_debit - $totals->total_credit) 
            : ($totals->total_credit - $totals->total_debit));

        return response()->json([
            'account' => [
                'id' => $account->AccID,
                'code' => $account->AccCode,
                'name' => $account->AccName,
                'dm_type' => $nature,
                'dm_label' => $nature === 0 ? 'Debit' : 'Credit',
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'status' => $status,
            ],
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($closingBalance, 2),
            'total_debit' => round((float)$totals->total_debit, 2),
            'total_credit' => round((float)$totals->total_credit, 2),
            'entries' => $currentPageEntries,
            'pagination' => [
                'total' => $totalRecords,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => ceil($totalRecords / $perPage),
            ]
        ]);
    }

    public function exportInventoryValuationSummary(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $valuationData = $this->getInventoryValuationSummaryDataArray($companyId, $startDate, $endDate);

        return Excel::download(
            new InventoryValuationExport($valuationData),
            "inventory_valuation_{$startDate}_to_{$endDate}.xlsx"
        );
    }

    private function getInventoryValuationSummaryDataArray($companyId, $startDate, $endDate)
    {
        // 1. Get all products
        $products = DB::table('products as p')
            ->where('p.company_id', $companyId)
            ->whereNull('p.deleted_at')
            ->select('p.id', 'p.name')
            ->get();

        $productIds = $products->pluck('id')->toArray();

        // 2. Get ALL movements for these products in one query to avoid N+1
        $allMovements = DB::table('stock_movements_items as i')
            ->join('stock_movements as h', 'h.id', '=', 'i.stock_movement_id')
            ->leftJoin('item_units as u', 'i.unit_id', '=', 'u.id')
            ->where('h.company_id', $companyId)
            ->whereIn('i.product_id', $productIds)
            ->select(
                'i.product_id',
                'h.movement_date',
                'h.from_warehouse_id',
                'h.to_warehouse_id',
                'h.warehouse_id',
                'h.notes',
                'i.quantity',
                'i.cost_price',
                'u.name as unit_name'
            )
            ->get()
            ->groupBy('product_id');

        return $products->map(function ($product) use ($allMovements, $startDate, $endDate) {
            $movements = $allMovements->get($product->id, collect());
            
            // Get the unit name from the first movement found, if any
            $unitName = $movements->whereNotNull('unit_name')->first()?->unit_name ?? '-';

            $openingQty = 0;
            $openingValue = 0;
            $inQty = 0;
            $inValue = 0;
            $outQty = 0;
            $outValue = 0;

            foreach ($movements as $m) {
                $qty = (float)$m->quantity;
                $val = $qty * (float)($m->cost_price ?? 0);
                
                // Determine movement type and direction for COMPANY-WIDE summary
                $isTransfer = ($m->from_warehouse_id && $m->to_warehouse_id);
                $isOpening = (strpos($m->notes ?? '', 'OpeningStock') !== false);
                
                $direction = 0; // 0 = no change to company total, 1 = in, -1 = out
                
                if ($isTransfer) {
                    $direction = 0; // Internal transfers don't change company total
                } elseif ($isOpening || ($m->warehouse_id && !$m->from_warehouse_id && !$m->to_warehouse_id)) {
                    $direction = 1;
                } elseif ($m->to_warehouse_id && !$m->from_warehouse_id) {
                    $direction = 1;
                } elseif ($m->from_warehouse_id && !$m->to_warehouse_id) {
                    $direction = -1;
                }

                // Handle null dates - treat as opening (before start date)
                $mDate = $m->movement_date ?? '0000-00-00';

                if ($mDate < $startDate) {
                    $openingQty += ($qty * $direction);
                    $openingValue += ($val * $direction);
                } elseif ($mDate <= $endDate) {
                    if ($direction === 1) {
                        $inQty += $qty;
                        $inValue += $val;
                    } elseif ($direction === -1) {
                        $outQty += $qty;
                        $outValue += $val;
                    }
                }
            }

            $closingQty = $openingQty + $inQty - $outQty;
            $closingValue = $openingValue + $inValue - $outValue;
            
            // Average cost should be based on positive closing inventory
            $avgCost = 0;
            if ($closingQty > 0) {
                $avgCost = $closingValue / $closingQty;
            } elseif ($inQty > 0) {
                // Fallback to average cost of IN movements if closing is 0 or negative
                $avgCost = $inValue / $inQty;
            }

            return [
                'product_name' => $product->name,
                'unit' => $unitName,
                'opening_qty' => $openingQty,
                'opening_value' => $openingValue,
                'in_qty' => $inQty,
                'in_value' => $inValue,
                'out_qty' => $outQty,
                'out_value' => $outValue,
                'closing_qty' => $closingQty,
                'avg_cost' => $avgCost,
                'closing_value' => $closingValue,
            ];
        });
    }
}
