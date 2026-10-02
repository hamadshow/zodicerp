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

use App\Support\JournalStatus;

class FinancialReportController extends Controller
{
    private const POSTED_STATUSES = ['Post', 'posted'];

    private function postedJournalQuery($query, string $alias = 'e')
    {
        return $query->whereIn("{$alias}.status", JournalStatus::postedValues());
    }

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

        $reportsQuery = FinancialReport::query()
            ->where('is_active', true)
            ->where('route_name', '!=', '#');

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

        $payload = $reports->map(function (FinancialReport $report) use ($favoriteIds, $request) {
            $route = null;
            $routeName = null;

            if ($report->route_name && $report->route_name !== '#') {
                $routeName = $report->route_name;
                try {
                    $country = $request->route('country')
                        ?? session('country_code')
                        ?? $request->header('X-Country-Code')
                        ?? config('app.default_country', 'sa');
                    $lang = $request->route('lang')
                        ?? session('locale')
                        ?? $request->header('X-Locale')
                        ?? app()->getLocale()
                        ?? config('app.fallback_locale', 'en');

                    if (preg_match('/^[a-zA-Z]{2,3}$/', (string) $country) !== 1) {
                        $country = 'sa';
                    }
                    if (preg_match('/^[a-z]{2}$/', (string) $lang) !== 1) {
                        $lang = 'en';
                    }

                    $params = [
                        'country' => strtolower((string) $country),
                        'lang' => strtolower((string) $lang),
                    ];
                    $route = route($report->route_name, $params, false);
                } catch (\Throwable) {
                    $route = null;
                }
            }

            return [
                'id' => $report->id,
                'report_key' => $report->report_key,
                'report_name' => $report->report_name,
                'report_name_ar' => $report->report_name_ar,
                'description' => $report->description,
                'description_ar' => $report->description_ar,
                'category' => $report->category,
                'category_ar' => $report->category_ar,
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
            ->map(function (UserFavoriteReport $favorite) use ($request) {
                $report = $favorite->report;

                $route = null;

                if ($report->route_name && $report->route_name !== '#') {
                    try {
                        $country = $request->route('country')
                            ?? session('country_code')
                            ?? $request->header('X-Country-Code')
                            ?? config('app.default_country', 'sa');
                        $lang = $request->route('lang')
                            ?? session('locale')
                            ?? $request->header('X-Locale')
                            ?? app()->getLocale()
                            ?? config('app.fallback_locale', 'en');

                        if (preg_match('/^[a-zA-Z]{2,3}$/', (string) $country) !== 1) {
                            $country = 'sa';
                        }
                        if (preg_match('/^[a-z]{2}$/', (string) $lang) !== 1) {
                            $lang = 'en';
                        }

                        $params = [
                            'country' => strtolower((string) $country),
                            'lang' => strtolower((string) $lang),
                        ];
                        $route = route($report->route_name, $params, false);
                    } catch (\Throwable) {
                        $route = null;
                    }
                }

                return [
                    'id' => $report->id,
                    'report_key' => $report->report_key,
                    'report_name' => $report->report_name,
                    'report_name_ar' => $report->report_name_ar,
                    'category' => $report->category,
                    'category_ar' => $report->category_ar,
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

        // The journal model supports accrual reporting only; there is no settlement
        // dimension to calculate a genuine cash-basis balance sheet.

        // Get data for the main date
        $data = $this->fetchBalanceSheetData($companyId, $asOfDate);

        // Get data for comparison date if requested
        $comparisonData = null;
        if ($compareToOpening) {
            // Compare to opening balance (start of the fiscal year for the as-of date)
            $openingDate = date('Y-01-01', strtotime($asOfDate));
            $comparisonData = $this->fetchBalanceSheetData($companyId, $openingDate);
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

    private function fetchBalanceSheetData($companyId, $date)
    {
        // 1. Get all accounts for this company that are Balance Sheet accounts (AccFinal = 0 or NULL)
        $accounts = DB::table('accounts')
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereNull('AccFinal')->orWhere('AccFinal', 0);
            })
            ->get(['AccID', 'AccCode', 'AccName', 'AccType', 'AccParent', 'Nature']);

        // 2. Calculate balances from journal_entry_lines (source of truth)
        //    Filter: posted journals only, date <= $date
        $activity = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->where('e.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
            ->where('e.date', '<=', $date)
            ->select(
                'l.account_id',
                DB::raw('SUM(l.debit) as total_debit'),
                DB::raw('SUM(l.credit) as total_credit')
            )
            ->groupBy('l.account_id')
            ->get();

        $activityById = $activity->keyBy('account_id');

        $accountData = [];
        foreach ($accounts as $account) {
            $code = $account->AccCode;
            $id = $account->AccID;

        // journal_entry_lines.account_id references accounts.AccID — the ONLY
        // correct lookup key. The previous `$activityById->get($id)
        // ?? $activityById->get($code)` fallback collided with it: when a
        // tree node's AccCode (e.g. equity root '3') equals some OTHER
        // account's AccID (AccID=3 = cash 1001), the fallback attached that
        // foreign activity to the node — inflating Assets and deflating
        // Equity. Verified: zero orphan lines reference a non-AccID value,
        // so the fallback was dead code that only ever corrupted results.
        $act = $activityById->get($id);

            $debit = (float)($act?->total_debit ?? 0);
            $credit = (float)($act?->total_credit ?? 0);

            $balance = 0;
            $firstDigit = substr((string) $code, 0, 1);
            if ($firstDigit === '1') { // Assets
                $balance = $debit - $credit;
            } else { // Liabilities & Equity
                $balance = $credit - $debit;
            }

            $accountData[$code] = [
                'AccID' => $id,
                'AccCode' => $code,
                'AccName' => $account->AccName,
                'AccType' => (int) $account->AccType,
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
            $firstDigit = substr((string) $node['AccCode'], 0, 1);
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

        // 6. Fiscal result not yet closed into equity: P&L accounts (4/5/6)
        // stay open in this system (there is no year-end closing entry), so
        // the Balance Sheet must add net income (income − cogs − expenses)
        // to Equity — otherwise Assets can never equal Liabilities + Equity.
        // Aggregated from leaf journal lines by account-code family, using
        // AccID joins only (same collision-free lookup as above).
        $pl = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->join('accounts as a', 'a.AccID', '=', 'l.account_id')
            ->where('e.company_id', $companyId)
            ->where('a.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
            ->where('e.date', '<=', $date)
            ->selectRaw("SUM(CASE WHEN a.AccCode LIKE '4%' THEN l.credit - l.debit ELSE 0 END) as income")
            ->selectRaw("SUM(CASE WHEN a.AccCode LIKE '5%' THEN l.debit - l.credit ELSE 0 END) as cogs")
            ->selectRaw("SUM(CASE WHEN a.AccCode LIKE '6%' THEN l.debit - l.credit ELSE 0 END) as expenses")
            ->first();

        $netIncome = (float) ($pl->income ?? 0) - (float) ($pl->cogs ?? 0) - (float) ($pl->expenses ?? 0);
        $result['total_equity'] += $netIncome;
        $result['net_income'] = $netIncome;

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

        return response()->json([
            'message' => 'Profit & Loss by Class is unavailable because journal entries have no class dimension.',
            'period' => ['start' => $startDate, 'end' => $endDate],
        ], 501);
    }

    public function getProfitLossByCustomerData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->query('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        return response()->json([
            'message' => 'Profit & Loss by Customer is unavailable because journal entries have no customer attribution.',
            'period' => ['start' => $startDate, 'end' => $endDate],
        ], 501);
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
        $months = [];
        $cursor = new \DateTimeImmutable(substr($startDate, 0, 7) . '-01');
        $lastMonth = new \DateTimeImmutable(substr($endDate, 0, 7) . '-01');
        while ($cursor <= $lastMonth) {
            $monthStart = $cursor->format('Y-m-01');
            $monthEnd = min($endDate, $cursor->format('Y-m-t'));
            $months[$cursor->format('Y-m')] = $this->fetchProfitLossData($companyId, $monthStart, $monthEnd);
            $cursor = $cursor->modify('+1 month');
        }
        $data['months'] = $months;

        return response()->json([
            'main' => $data,
            'months' => $months,
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

        $variance = null;
        if ($comparisonData) {
            $variance = [
                'total_income' => $data['total_income'] - $comparisonData['total_income'],
                'total_cogs' => $data['total_cogs'] - $comparisonData['total_cogs'],
                'total_expenses' => $data['total_expenses'] - $comparisonData['total_expenses'],
                'net_income' => $data['net_income'] - $comparisonData['net_income'],
                'net_income_percentage' => $comparisonData['net_income'] == 0
                    ? null
                    : (($data['net_income'] - $comparisonData['net_income']) / abs($comparisonData['net_income'])) * 100,
            ];
        }

        return response()->json([
            'main' => $data,
            'comparison' => $comparisonData,
            'variance' => $variance,
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
        $data['details'] = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->join('accounts as a', 'a.AccID', '=', 'l.account_id')
            ->where('e.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
            ->whereBetween('e.date', [$startDate, $endDate])
            ->where(function ($query) {
                $query->where('a.AccCode', 'like', '4%')
                    ->orWhere('a.AccCode', 'like', '5%')
                    ->orWhere('a.AccCode', 'like', '6%');
            })
            ->orderBy('e.date')
            ->orderBy('e.entry_code')
            ->orderBy('l.id')
            ->get([
                'e.entry_code as journal_entry_code', 'e.date', 'e.reference',
                'e.description as entry_description', 'l.id as journal_line_id',
                'a.AccID', 'a.AccCode', 'a.AccName', 'l.debit', 'l.credit',
                'l.description as line_description',
            ]);

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
            ->where(function ($query) {
                $query->where('AccCode', 'like', '10%')->orWhere('AccCode', 'like', '11%');
            })
            ->get();

        $cashAccountCodes = $cashAccounts->pluck('AccCode')->all();
        $cashAccountIds = $cashAccounts->pluck('AccID')->all();
        $allCashIds = array_unique(array_merge($cashAccountCodes, $cashAccountIds));

        // Beginning cash is calculated only from authoritative posted journal lines.
        $beginningCash = (float) (DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->where('e.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
            ->whereIn('l.account_id', $allCashIds)
            ->where('e.date', '<', $startDate)
            ->selectRaw('COALESCE(SUM(l.debit - l.credit), 0) as balance')
            ->value('balance'));

        // 3. Calculate Net Income for the period (Revenue - Expenses)
        // Usually accounts starting with 4 (Revenue) and 5, 6 (Expenses)
        $revenue = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->join('accounts as a', 'a.AccID', '=', 'l.account_id')
            ->where('e.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
            ->whereBetween('e.date', [$startDate, $endDate])
            ->where('a.AccCode', 'like', '4%')
            ->select(DB::raw('SUM(l.credit - l.debit) as total'))
            ->first()->total ?? 0;

        $expenses = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->join('accounts as a', 'a.AccID', '=', 'l.account_id')
            ->where('e.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
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
            ->where('AccCode', 'not like', '10%')
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
                ->whereIn('e.status', self::POSTED_STATUSES)
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
                ->whereIn('e.status', self::POSTED_STATUSES)
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

        // journal_entry_lines.account_id references accounts.AccID — the ONLY
        // correct lookup key. The previous `$activity->get($id)
        // ?? $activity->get($code)` fallback collided with it: PHP normalizes
        // numeric-string collection keys to ints, so for a P&L root node whose
        // AccCode is '5' (AccID 154) the fallback resolved to the activity of
        // the unrelated AccID=5 account, inflating COGS/Expenses (and for '6'
        // inflating Expenses again) and corrupting gross/net profit. Verified:
        // zero journal lines reference a non-AccID value, so the fallback was
        // dead code that only ever corrupted results. Same fix already applied
        // to fetchBalanceSheetData().
        $act = $activity->get($id);

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

        // 2. Get balances from journal activity (authoritative source).
        //    Classification follows journal_entries.entry_type:
        //      - Beginning: ONLY 'Opening' entries (opening balances), up to as_of_date.
        //        Note: the date-window split (date < startDate) deliberately does NOT
        //        apply here — an opening entry dated exactly at the fiscal-period
        //        start must still land in BEGINNING, not be dropped.
        //      - CURRENT: every non-Opening entry (Regular + domain types like
        //        SalesInvoice, PurchaseInvoice, SupplierPayment, CustomerReceipt,
        //        SalesReturn, PurchaseReturn, StockAdjustment, Bnk*, Depreciation,
        //        AssetDisposal, LandedCost, ...) dated within the selected period.
        //    Both buckets stay bound by the existing filters: company, posted
        //    status, date <= as_of_date.
        $asOfDate = $request->query('as_of_date', $request->query('date'));
        if (! $asOfDate) {
            // Default to the latest POSTED activity date instead of "today":
            // with the canonical Opening/Regular classification the report
            // window must cover the fiscal year that actually has movements,
            // otherwise CURRENT renders empty for datasets whose activity
            // precedes the current calendar year. Explicit query params win.
            $latestPosted = DB::table('journal_entries')
                ->where('company_id', $companyId)
                ->whereIn('status', self::POSTED_STATUSES)
                ->max('date');
            $asOfDate = $latestPosted
                ? date('Y-m-d', strtotime($latestPosted))
                : now()->toDateString();
        }
        $startDate = $request->query('start_date', date('Y-01-01', strtotime($asOfDate)));

        $activity = DB::table('journal_entry_lines as l')
            ->join('journal_entries as e', 'e.entry_code', '=', 'l.journal_entry_code')
            ->where('e.company_id', $companyId)
            ->whereIn('e.status', self::POSTED_STATUSES)
            ->where('e.date', '<=', $asOfDate)
            ->select('l.account_id', DB::raw("SUM(CASE WHEN e.entry_type = 'Opening' THEN l.debit ELSE 0 END) as beginning_debit"), DB::raw("SUM(CASE WHEN e.entry_type = 'Opening' THEN l.credit ELSE 0 END) as beginning_credit"), DB::raw("SUM(CASE WHEN (e.entry_type IS NULL OR e.entry_type <> 'Opening') AND e.date >= ? THEN l.debit ELSE 0 END) as current_debit"), DB::raw("SUM(CASE WHEN (e.entry_type IS NULL OR e.entry_type <> 'Opening') AND e.date >= ? THEN l.credit ELSE 0 END) as current_credit"))
            ->addBinding([$startDate, $startDate], 'select')
            ->groupBy('l.account_id')
            ->get()
            ->keyBy('account_id');

        // 3. Prepare account data from authoritative journal activity
        $accountData = [];
        foreach ($accounts as $account) {
            $id = $account->AccID;
            $code = $account->AccCode;
            $activityRow = $activity->get($id) ?? $activity->get($code);
            
            $accountData[$code] = [ // Key by AccCode for tree building
                'AccID' => $account->AccID,
                'AccCode' => $account->AccCode,
                'AccName' => $account->AccName,
                'AccType' => (int)$account->AccType,
                'AccParent' => $account->AccParent,
                'beginning_debit' => (float)($activityRow?->beginning_debit ?? 0),
                'beginning_credit' => (float)($activityRow?->beginning_credit ?? 0),
                'current_debit' => (float)($activityRow?->current_debit ?? 0),
                'current_credit' => (float)($activityRow?->current_credit ?? 0),
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
                
                $endDebit = 0;
                $endCredit = 0;

                if (empty($children)) {
                    // Leaf Account: Calculate Net Ending Balance
                    $totalDebit = $account['beginning_debit'] + $account['current_debit'];
                    $totalCredit = $account['beginning_credit'] + $account['current_credit'];

                    if ($totalDebit >= $totalCredit) {
                        $endDebit = $totalDebit - $totalCredit;
                        $endCredit = 0;
                    } else {
                        $endDebit = 0;
                        $endCredit = $totalCredit - $totalDebit;
                    }
                } else {
                    // Parent Account: Reset direct balances to avoid double counting
                    // and aggregate strictly from children
                    $account['beginning_debit'] = 0;
                    $account['beginning_credit'] = 0;
                    $account['current_debit'] = 0;
                    $account['current_credit'] = 0;

                    foreach ($children as $child) {
                        $account['beginning_debit'] += $child['beginning_debit'];
                        $account['beginning_credit'] += $child['beginning_credit'];
                        $account['current_debit'] += $child['current_debit'];
                        $account['current_credit'] += $child['current_credit'];
                        $endDebit += $child['ending_debit'];
                        $endCredit += $child['ending_credit'];
                    }
                }

                $account['ending_debit'] = $endDebit;
                $account['ending_credit'] = $endCredit;
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

    // P0-07: postJournalToPostings() and unpostJournalFromPostings() removed.
    // These were dead code with zero callers in the repository.
    // Caveat: Repository-static analysis cannot rule out runtime-only external invocation.

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
        $allMovements = DB::table('inventory_movement_lines as i')
            ->join('inventory_movement_headers as h', 'h.id', '=', 'i.stock_movement_id')
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
