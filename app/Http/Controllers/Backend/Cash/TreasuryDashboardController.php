<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\BankAccount;
use App\Models\BankPayment;
use App\Models\BankReceipt;
use App\Models\CashAccount;
use App\Models\CashPayment;
use App\Models\CashReceipt;
use App\Models\Currency;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

use Illuminate\Support\Facades\Cache;

class TreasuryDashboardController extends Controller
{
    protected array $postedJournalStatuses = ['Post', 'Posted'];
    protected string $cacheKeyPrefix = 'treasury_dashboard_';

    public function index()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $cacheKey = $this->cacheKeyPrefix . 'data';

        // Use Cache to store the entire dashboard data for 10 minutes
        // This dramatically reduces CPU and DB load on repeated visits
        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($today, $yesterday) {
            // 1. Get Accounts from bank_accounts with dynamic balance calculation
            $bankAccounts = BankAccount::query()
                ->with(['bank', 'currencyInfo'])
                ->withSum(['receipts as total_receipts' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->withSum(['payments as total_payments' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->get();

            // 2. Batch fetch last transaction dates
            $lastReceiptDates = BankReceipt::query()
                ->selectRaw('bank_account_id, MAX(receipt_date) as last_date')
                ->whereIn('bank_account_id', $bankAccounts->pluck('id'))
                ->groupBy('bank_account_id')
                ->pluck('last_date', 'bank_account_id');

            $lastPaymentDates = BankPayment::query()
                ->selectRaw('bank_account_id, MAX(payment_date) as last_date')
                ->whereIn('bank_account_id', $bankAccounts->pluck('id'))
                ->groupBy('bank_account_id')
                ->pluck('last_date', 'bank_account_id');

            $accounts = $bankAccounts->map(function ($account) use ($lastReceiptDates, $lastPaymentDates) {
                $receipts = (float) $account->total_receipts;
                $payments = (float) $account->total_payments;
                $balance = $receipts - $payments;

                $lastR = $lastReceiptDates[$account->id] ?? null;
                $lastP = $lastPaymentDates[$account->id] ?? null;
                $lastTx = ($lastR && $lastP) ? max($lastR, $lastP) : ($lastR ?: $lastP);

                return [
                    'id' => $account->id,
                    'name' => $account->bank?->name 
                        ? $account->bank->name . ' - ' . $account->account_name 
                        : $account->account_name,
                    'type' => 'bank',
                    'balance' => round($balance, 2),
                    'currency' => $this->resolveAccountCurrency($account),
                    'account_code' => $account->account_number,
                    'status' => $account->status,
                    'last_tx_at' => $lastTx,
                ];
            });

            $totalBalance = (float) $accounts->sum('balance');
            $bankBalance = (float) $accounts->where('type', 'bank')->sum('balance');
            $cashBalance = (float) $accounts->where('type', 'cash')->sum('balance');

            // 3. Batch fetch sums for today and yesterday
            $dailySums = $this->fetchDailySums([$today, $yesterday]);
            
            $receiptsToday = $dailySums[$today->toDateString()]['receipts'] ?? 0.0;
            $receiptsYesterday = $dailySums[$yesterday->toDateString()]['receipts'] ?? 0.0;
            $paymentsToday = $dailySums[$today->toDateString()]['payments'] ?? 0.0;
            $paymentsYesterday = $dailySums[$yesterday->toDateString()]['payments'] ?? 0.0;

            $balancesByCurrency = $this->buildBalancesByCurrency($accounts);
            $primaryCurrency = $this->resolvePrimaryCurrency($balancesByCurrency);

            $stats = [
                'total_balance' => $totalBalance,
                'receipts_today' => $receiptsToday,
                'payments_today' => $paymentsToday,
                'bank_balances' => $bankBalance,
                'cash_balances' => $cashBalance,
                'primary_currency' => $primaryCurrency,
                'balances_by_currency' => $balancesByCurrency,
                'trends' => [
                    'total_balance' => 0,
                    'receipts_today' => $this->percentChange($receiptsToday, $receiptsYesterday),
                    'payments_today' => $this->percentChange($paymentsToday, $paymentsYesterday),
                    'bank_balances' => 0,
                ],
            ];

            $chartData = $this->buildCashFlowChart($today);
            $recentTransactions = $this->buildRecentTransactions();
            $largestPayments = $this->fetchLargestPayments($today);

            $performance = [
                'highest_balance' => $accounts->max('balance') ?? 0,
                'largest_expense_today' => $largestPayments,
                'monthly_growth' => 0,
                'primary_currency' => $primaryCurrency,
            ];

            return Inertia::render('Backend/06-Cash/DashboardTreasury', [
                'stats' => $stats,
                'accounts' => $accounts->values(),
                'chartData' => $chartData,
                'recentTransactions' => $recentTransactions,
                'performance' => $performance,
            ]);
        });
    }

    protected function fetchDailySums(array $dates): array
    {
        $dateStrings = array_map(fn($d) => $d->toDateString(), $dates);

        $bankReceipts = BankReceipt::query()
            ->whereIn(DB::raw('DATE(receipt_date)'), $dateStrings)
            ->where('status', 'posted')
            ->selectRaw('DATE(receipt_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $cashReceipts = CashReceipt::query()
            ->whereIn(DB::raw('DATE(receipt_date)'), $dateStrings)
            ->where('status', 'posted')
            ->selectRaw('DATE(receipt_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $bankPayments = BankPayment::query()
            ->whereIn(DB::raw('DATE(payment_date)'), $dateStrings)
            ->where('status', 'posted')
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $cashPayments = CashPayment::query()
            ->whereIn(DB::raw('DATE(payment_date)'), $dateStrings)
            ->where('status', 'posted')
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $results = [];
        foreach ($dateStrings as $date) {
            $results[$date] = [
                'receipts' => (float)($bankReceipts[$date] ?? 0) + (float)($cashReceipts[$date] ?? 0),
                'payments' => (float)($bankPayments[$date] ?? 0) + (float)($cashPayments[$date] ?? 0),
            ];
        }

        return $results;
    }

    protected function fetchLargestPayments(Carbon $date): float
    {
        $bank = BankPayment::whereDate('payment_date', $date)->where('status', 'posted')->max('amount') ?? 0;
        $cash = CashPayment::whereDate('payment_date', $date)->where('status', 'posted')->max('amount') ?? 0;

        return (float) max($bank, $cash);
    }

    protected function sumReceiptsForDate(Carbon $date): float
    {
        $bank = (float) BankReceipt::whereDate('receipt_date', $date)
            ->where('status', 'posted')
            ->sum('amount');

        $cash = (float) CashReceipt::whereDate('receipt_date', $date)
            ->where('status', 'posted')
            ->sum('amount');

        return $bank + $cash;
    }

    protected function sumPaymentsForDate(Carbon $date): float
    {
        $bank = (float) BankPayment::whereDate('payment_date', $date)
            ->where('status', 'posted')
            ->sum('amount');

        $cash = (float) CashPayment::whereDate('payment_date', $date)
            ->where('status', 'posted')
            ->sum('amount');

        return $bank + $cash;
    }

    protected function percentChange(float $current, float $previous): float
    {
        if ($previous == 0.0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    protected function buildBalancesByCurrency(Collection $accounts): array
    {
        $grouped = [];

        foreach ($accounts as $account) {
            $code = $account['currency']['code'];
            if (! isset($grouped[$code])) {
                $grouped[$code] = [
                    'code' => $code,
                    'symbol' => $account['currency']['symbol'],
                    'name' => $account['currency']['name'],
                    'cash' => 0.0,
                    'bank' => 0.0,
                    'total' => 0.0,
                ];
            }

            $bucket = $account['type'] === 'bank' ? 'bank' : 'cash';
            $grouped[$code][$bucket] += $account['balance'];
            $grouped[$code]['total'] += $account['balance'];
        }

        return collect($grouped)
            ->sortByDesc('total')
            ->values()
            ->all();
    }

    protected function resolvePrimaryCurrency(array $balancesByCurrency): array
    {
        if ($balancesByCurrency !== []) {
            $first = $balancesByCurrency[0];

            return [
                'code' => $first['code'],
                'symbol' => $first['symbol'],
                'name' => $first['name'],
            ];
        }

        $base = Currency::where('is_base', true)->where('status', 'active')->first()
            ?? Currency::where('status', 'active')->orderBy('code')->first();

        if ($base) {
            return [
                'code' => $base->code,
                'symbol' => $base->symbol ?? $base->code,
                'name' => $base->name,
            ];
        }

        return ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'Saudi Riyal'];
    }

    protected function resolveAccountCurrency(Model $account): array
    {
        $currency = $account->relationLoaded('currencyInfo')
            ? $account->currencyInfo
            : $account->currencyInfo()->first();

        if ($currency) {
            return [
                'code' => $currency->code,
                'symbol' => $currency->symbol ?? $currency->code,
                'name' => $currency->name,
            ];
        }

        if (! empty($account->currency) && is_numeric($account->currency)) {
            $byId = Currency::find($account->currency);
            if ($byId) {
                return [
                    'code' => $byId->code,
                    'symbol' => $byId->symbol ?? $byId->code,
                    'name' => $byId->name,
                ];
            }
        }

        if (! empty($account->currency) && is_string($account->currency)) {
            return [
                'code' => strtoupper($account->currency),
                'symbol' => strtoupper($account->currency),
                'name' => strtoupper($account->currency),
            ];
        }

        return ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'Saudi Riyal'];
    }

    protected function buildAccountsSummary(): Collection
    {
        $cashReceiptTotals = $this->sumByAccountId(CashReceipt::query(), 'account_id', 'receipt_date');
        $cashPaymentTotals = $this->sumByAccountId(CashPayment::query(), 'account_id', 'payment_date');
        $bankReceiptTotals = $this->sumByAccountId(BankReceipt::query(), 'bank_account_id', 'receipt_date');
        $bankPaymentTotals = $this->sumByAccountId(BankPayment::query(), 'bank_account_id', 'payment_date');

        $cashAccounts = CashAccount::query()->with('currencyInfo')->orderBy('name')->get();
        $bankAccounts = BankAccount::query()->with(['bank', 'currencyInfo'])->orderBy('account_name')->get();

        $glAccountIds = $cashAccounts->pluck('gl_account_id')
            ->merge($bankAccounts->pluck('gl_account_id'))
            ->filter()
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $glBalances = $this->computeGlBalances($glAccountIds);

        $accounts = collect();

        foreach ($cashAccounts as $account) {
            $balance = $this->resolveCashAccountBalance(
                $account,
                $cashReceiptTotals,
                $cashPaymentTotals,
                $glBalances
            );

            $accounts->push([
                'id' => 'cash-'.$account->id,
                'name' => $account->name,
                'type' => 'cash',
                'balance' => $balance,
                'currency' => $this->resolveAccountCurrency($account),
                'account_code' => $account->account_code,
                'gl_account_id' => $account->gl_account_id,
                'last_tx_at' => $this->lastTransactionAtForCashAccount($account->id),
                'status' => $account->status,
            ]);
        }

        foreach ($bankAccounts as $account) {
            $balance = $this->resolveBankAccountBalance(
                $account,
                $bankReceiptTotals,
                $bankPaymentTotals,
                $glBalances
            );

            $accounts->push([
                'id' => 'bank-'.$account->id,
                'name' => $account->bank?->name
                    ? $account->bank->name.' - '.$account->account_name
                    : $account->account_name,
                'type' => 'bank',
                'balance' => $balance,
                'currency' => $this->resolveAccountCurrency($account),
                'account_code' => $account->account_number,
                'gl_account_id' => $account->gl_account_id,
                'last_tx_at' => $this->lastTransactionAtForBankAccount($account->id),
                'status' => $account->status,
            ]);
        }

        $totalBalance = (float) $accounts->sum('balance');

        $deduplicated = collect();
        $seenGl = [];

        foreach ($accounts as $row) {
            $glId = $row['gl_account_id'] ?? null;

            if ($glId && isset($seenGl[$glId])) {
                continue;
            }

            if ($glId) {
                $seenGl[$glId] = true;
            }

            $deduplicated->push($row);
        }

        return $deduplicated
            ->map(function (array $row) use ($totalBalance) {
                $row['liquidity'] = $totalBalance != 0
                    ? round(($row['balance'] / $totalBalance) * 100, 1)
                    : 0;

                return $row;
            })
            ->sortByDesc('balance')
            ->values();
    }

    protected function sumByAccountId($query, string $accountColumn, string $dateColumn): array
    {
        return $query
            ->where('status', 'posted')
            ->selectRaw("{$accountColumn} as account_id, COALESCE(SUM(amount), 0) as total")
            ->groupBy($accountColumn)
            ->pluck('total', 'account_id')
            ->map(fn ($value) => (float) $value)
            ->all();
    }

    protected function resolveCashAccountBalance(
        CashAccount $account,
        array $receiptTotals,
        array $paymentTotals,
        array $glBalances
    ): float {
        $opening = (float) $account->opening_balance;
        $stored = (float) $account->current_balance;
        $receipts = $receiptTotals[$account->id] ?? 0.0;
        $payments = $paymentTotals[$account->id] ?? 0.0;
        $fromTransactions = $opening + $receipts - $payments;

        if ($account->gl_account_id) {
            $glBalance = $glBalances[(int) $account->gl_account_id] ?? null;
            if ($glBalance !== null && abs($glBalance) > 0.0001) {
                return round($glBalance, 2);
            }
        }

        $balance = abs($stored) > 0.0001 ? $stored : $fromTransactions;
        return round($balance, 2);
    }

    protected function resolveBankAccountBalance(
        BankAccount $account,
        array $receiptTotals,
        array $paymentTotals,
        array $glBalances
    ): float {
        $opening = (float) $account->opening_balance;
        $stored = (float) $account->current_balance;
        $receipts = $receiptTotals[$account->id] ?? 0.0;
        $payments = $paymentTotals[$account->id] ?? 0.0;
        $fromTransactions = $opening + $receipts - $payments;

        if ($account->gl_account_id) {
            $glBalance = $glBalances[(int) $account->gl_account_id] ?? null;
            if ($glBalance !== null && abs($glBalance) > 0.0001) {
                return round($glBalance, 2);
            }
        }

        $balance = abs($stored) > 0.0001 ? $stored : $fromTransactions;
        return round($balance, 2);
    }

    protected function computeGlBalances(array $glAccountIds): array
    {
        if ($glAccountIds === []) {
            return [];
        }

        // Optimized query to fetch all balances in one go
        $glTotals = DB::table('journal_entry_lines as b')
            ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
            ->whereIn('h.status', $this->postedJournalStatuses)
            ->whereIn('b.account_id', $glAccountIds)
            ->selectRaw('b.account_id, COALESCE(SUM(b.debit), 0) as total_debit, COALESCE(SUM(b.credit), 0) as total_credit')
            ->groupBy('b.account_id')
            ->get()
            ->keyBy('account_id');

        $accounts = Account::query()
            ->whereIn('AccID', $glAccountIds)
            ->get(['AccID', 'AccCode', 'AccDmType'])
            ->keyBy('AccID');

        $balances = [];
        foreach ($glAccountIds as $id) {
            $account = $accounts[$id] ?? null;
            if (!$account) continue;

            $totals = $glTotals[$id] ?? null;
            $debit = (float) ($totals->total_debit ?? 0);
            $credit = (float) ($totals->total_credit ?? 0);
            $nature = (int) ($account->AccDmType ?? 0);

            $balances[(int) $id] = $nature === 0
                ? round($debit - $credit, 2)
                : round($credit - $debit, 2);
        }

        return $balances;
    }

    protected function lastTransactionAtForCashAccount(int $accountId): ?string
    {
        $lastReceipt = CashReceipt::where('account_id', $accountId)->max('receipt_date');
        $lastPayment = CashPayment::where('account_id', $accountId)->max('payment_date');
        $dates = array_filter([$lastReceipt, $lastPayment]);

        return $dates ? max($dates) : null;
    }

    protected function lastTransactionAtForBankAccount(int $accountId): ?string
    {
        $lastReceipt = BankReceipt::where('bank_account_id', $accountId)->max('receipt_date');
        $lastPayment = BankPayment::where('bank_account_id', $accountId)->max('payment_date');
        $dates = array_filter([$lastReceipt, $lastPayment]);

        return $dates ? max($dates) : null;
    }

    protected function buildCashFlowChart(Carbon $endDate): array
    {
        $startDate = $endDate->copy()->subDays(6);

        // Optimized Query for Receipts
        $receipts = BankReceipt::query()
            ->where('status', 'posted')
            ->whereDate('receipt_date', '>=', $startDate)
            ->whereDate('receipt_date', '<=', $endDate)
            ->selectRaw('DATE(receipt_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->all();

        // Optimized Query for Payments
        $payments = BankPayment::query()
            ->where('status', 'posted')
            ->whereDate('payment_date', '>=', $startDate)
            ->whereDate('payment_date', '<=', $endDate)
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->all();

        $chart = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = $endDate->copy()->subDays($i)->toDateString();
            $dayName = Carbon::parse($date)->format('D');
            
            $chart[] = [
                'date' => $date,
                'name' => $dayName,
                'incoming' => (float) ($receipts[$date] ?? 0),
                'outgoing' => (float) ($payments[$date] ?? 0),
            ];
        }

        return $chart;
    }

    protected function buildRecentTransactions(): array
    {
        $bankReceipts = BankReceipt::query()
            ->with(['bankAccount.bank', 'bankAccount.currencyInfo', 'creator:id,username,fullname'])
            ->latest('receipt_date')
            ->limit(5)
            ->get()
            ->map(fn (BankReceipt $r) => [
                'id' => $r->receipt_no,
                'date' => $r->receipt_date?->toDateString(),
                'treasury' => $r->bankAccount?->account_name ?? '-',
                'type' => 'receipt',
                'amount' => (float) $r->amount,
                'currency' => $r->bankAccount
                    ? $this->resolveAccountCurrency($r->bankAccount)
                    : ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'SAR'],
                'user' => $this->userDisplayName($r->creator),
                'status' => $r->status === 'posted' ? 'completed' : $r->status,
            ]);

        $bankPayments = BankPayment::query()
            ->with(['bankAccount.bank', 'bankAccount.currencyInfo', 'creator:id,username,fullname'])
            ->latest('payment_date')
            ->limit(5)
            ->get()
            ->map(fn (BankPayment $p) => [
                'id' => $p->payment_no,
                'date' => $p->payment_date?->toDateString(),
                'treasury' => $p->bankAccount?->account_name ?? '-',
                'type' => 'payment',
                'amount' => (float) $p->amount,
                'currency' => $p->bankAccount
                    ? $this->resolveAccountCurrency($p->bankAccount)
                    : ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'SAR'],
                'user' => $this->userDisplayName($p->creator),
                'status' => $p->status === 'posted' ? 'completed' : $p->status,
            ]);

        $cashReceipts = CashReceipt::query()
            ->with(['account.currencyInfo', 'creator:id,username,fullname'])
            ->latest('receipt_date')
            ->limit(5)
            ->get()
            ->map(fn (CashReceipt $r) => [
                'id' => $r->voucher_no,
                'date' => $r->receipt_date?->toDateString(),
                'treasury' => $r->account?->name ?? '-',
                'type' => 'receipt',
                'amount' => (float) $r->amount,
                'currency' => $r->account
                    ? $this->resolveAccountCurrency($r->account)
                    : ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'SAR'],
                'user' => $this->userDisplayName($r->creator),
                'status' => $r->status === 'posted' ? 'completed' : $r->status,
            ]);

        $cashPayments = CashPayment::query()
            ->with(['account.currencyInfo', 'creator:id,username,fullname'])
            ->latest('payment_date')
            ->limit(5)
            ->get()
            ->map(fn (CashPayment $p) => [
                'id' => $p->voucher_no,
                'date' => $p->payment_date?->toDateString(),
                'treasury' => $p->account?->name ?? '-',
                'type' => 'payment',
                'amount' => (float) $p->amount,
                'currency' => $p->account
                    ? $this->resolveAccountCurrency($p->account)
                    : ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'SAR'],
                'user' => $this->userDisplayName($p->creator),
                'status' => $p->status === 'posted' ? 'completed' : $p->status,
            ]);

        return collect()
            ->merge($bankReceipts)
            ->merge($bankPayments)
            ->merge($cashReceipts)
            ->merge($cashPayments)
            ->sortByDesc('date')
            ->take(10)
            ->values()
            ->all();
    }

    protected function userDisplayName(?User $user): string
    {
        if (! $user) {
            return '-';
        }

        return $user->fullname ?: $user->username ?: '-';
    }
}
