<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\BankAccount;
use App\Models\CashAccount;
use App\Models\Currency;
use App\Models\TreasuryTransaction;
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
                ->withSum(['transfersTo as total_transfers_to' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->withSum(['transfersFrom as total_transfers_from' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->get();

            // 2. Batch fetch last transaction dates for Bank Accounts
            $lastTxDates = TreasuryTransaction::query()
                ->selectRaw('COALESCE(source_account_id, destination_account_id) as account_id, MAX(transaction_date) as last_date')
                ->where(function($q) use ($bankAccounts) {
                    $q->where(fn($sq) => $sq->where('source_account_type', 'bank')->whereIn('source_account_id', $bankAccounts->pluck('id')))
                      ->orWhere(fn($sq) => $sq->where('destination_account_type', 'bank')->whereIn('destination_account_id', $bankAccounts->pluck('id')));
                })
                ->groupBy('account_id')
                ->pluck('last_date', 'account_id');

            $accounts = $bankAccounts->map(function ($acc) use ($lastTxDates) {
                $lastTx = $lastTxDates[$acc->id] ?? null;

                return (object) [
                    'id' => $acc->id,
                    'name' => $acc->bank ? $acc->bank->name . ' - ' . $acc->account_name : $acc->account_name,
                    'account_code' => $acc->account_number,
                    'type' => 'bank',
                    'bank' => $acc->bank,
                    'currency' => $acc->currencyInfo,
                    'balance' => (float) $acc->opening_balance
                        + (float) $acc->total_receipts
                        + (float) $acc->total_transfers_to
                        - (float) $acc->total_payments
                        - (float) $acc->total_transfers_from,
                    'liquidity' => 0,
                    'last_tx_at' => $lastTx,
                    'status' => $acc->status,
                ];
            });

            // 3. Get Cash Accounts
            $cashAccounts = CashAccount::query()
                ->with(['currencyInfo'])
                ->withSum(['receipts as total_receipts' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->withSum(['payments as total_payments' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->withSum(['transfersTo as total_transfers_to' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->withSum(['transfersFrom as total_transfers_from' => function ($query) {
                    $query->where('status', 'posted');
                }], 'amount')
                ->get();

            // 4. Batch fetch last transaction dates for Cash Accounts
            $lastCashTxDates = TreasuryTransaction::query()
                ->selectRaw('COALESCE(source_account_id, destination_account_id) as account_id, MAX(transaction_date) as last_date')
                ->where(function($q) use ($cashAccounts) {
                    $q->where(fn($sq) => $sq->where('source_account_type', 'cash')->whereIn('source_account_id', $cashAccounts->pluck('id')))
                      ->orWhere(fn($sq) => $sq->where('destination_account_type', 'cash')->whereIn('destination_account_id', $cashAccounts->pluck('id')));
                })
                ->groupBy('account_id')
                ->pluck('last_date', 'account_id');

            $accounts = $accounts->concat($cashAccounts->map(function ($acc) use ($lastCashTxDates) {
                $lastTx = $lastCashTxDates[$acc->id] ?? null;

                return (object) [
                    'id' => $acc->id,
                    'name' => $acc->name,
                    'type' => 'cash',
                    'balance' => (float) $acc->opening_balance + (float) $acc->total_receipts - (float) $acc->total_payments + (float) $acc->total_transfers_to - (float) $acc->total_transfers_from,
                    'currency' => $acc->currencyInfo,
                    'account_code' => $acc->account_code,
                    'last_tx_at' => $lastTx,
                    'status' => $acc->status,
                    'liquidity' => 0,
                ];
            }));

            $primaryCurrency = Currency::where('is_base', true)->first() ?? Currency::first();
            $stats = [
                'total_balance' => $accounts->sum('balance'),
                'receipts_today' => TreasuryTransaction::whereDate('transaction_date', $today)->where('transaction_type', 'deposit')->where('status', 'posted')->sum('amount'),
                'payments_today' => TreasuryTransaction::whereDate('transaction_date', $today)->where('transaction_type', 'withdrawal')->where('status', 'posted')->sum('amount'),
                'bank_balances' => $accounts->where('type', 'bank')->sum('balance'),
                'primary_currency' => $primaryCurrency,
            ];

            $chartData = $this->buildCashFlowChart($today);
            $recentTransactions = $this->buildRecentTransactions();
            $performance = [
                'highest_balance' => $accounts->max('balance') ?? 0,
                'largest_expense_today' => $this->fetchLargestPayments($today),
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

    public function accountTransactions(\Illuminate\Http\Request $request)
    {
        $accountId = $request->account_id;
        $type = $request->type;
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::now()->subMonth()->startOfMonth();
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::now()->subMonth()->endOfMonth();

        if ($type === 'cash') {
            $account = CashAccount::with('currencyInfo')->findOrFail($accountId);
        } else {
            $account = BankAccount::with(['bank', 'currencyInfo'])->findOrFail($accountId);
        }

        $openingBalance = (float) $account->opening_balance;
        
        $previousReceipts = (float) $account->receipts()
            ->where('status', 'posted')
            ->whereDate('transaction_date', '<', $startDate)
            ->sum('amount');

        $previousPayments = (float) $account->payments()
            ->where('status', 'posted')
            ->whereDate('transaction_date', '<', $startDate)
            ->sum('amount');
        
        $balanceAtStart = $openingBalance + $previousReceipts - $previousPayments;
        
        $previousTransfersFrom = (float) $account->transfersFrom()
            ->where('status', 'posted')
            ->whereDate('transaction_date', '<', $startDate)
            ->sum('amount');

        $previousTransfersTo = (float) $account->transfersTo()
            ->where('status', 'posted')
            ->whereDate('transaction_date', '<', $startDate)
            ->sum('amount');

        $balanceAtStart += ($previousTransfersTo - $previousTransfersFrom);

        $transactions = $account->transactions()
            ->where('status', 'posted')
            ->whereDate('transaction_date', '>=', $startDate)
            ->whereDate('transaction_date', '<=', $endDate)
            ->orderBy('transaction_date', 'asc')
            ->get();

        $runningBalance = $balanceAtStart;
        $totalReceipts = 0;
        $totalPayments = 0;

        $formattedTransactions = $transactions->map(function ($tx) use ($accountId, $type, &$runningBalance, &$totalReceipts, &$totalPayments) {
            $amount = (float) $tx->amount;
            $isSource = $tx->source_account_type === $type && (int) $tx->source_account_id === (int) $accountId;
            $isDestination = $tx->destination_account_type === $type && (int) $tx->destination_account_id === (int) $accountId;

            $entryType = 'transfer';
            $signedAmount = 0.0;

            if ($tx->transaction_type === 'deposit' && $isDestination) {
                $entryType = 'receipt';
                $signedAmount = $amount;
                $runningBalance += $amount;
                $totalReceipts += $amount;
            } elseif ($tx->transaction_type === 'withdrawal' && $isSource) {
                $entryType = 'payment';
                $signedAmount = $amount;
                $runningBalance -= $amount;
                $totalPayments += $amount;
            } elseif ($tx->transaction_type === 'transfer') {
                $entryType = 'transfer';
                $signedAmount = $isDestination ? $amount : ($isSource ? -$amount : 0.0);
                $runningBalance += $signedAmount;
                if ($signedAmount > 0) {
                    $totalReceipts += $signedAmount;
                } else {
                    $totalPayments += abs($signedAmount);
                }
            } else {
                if ($isDestination) {
                    $entryType = 'receipt';
                    $signedAmount = $amount;
                    $runningBalance += $amount;
                    $totalReceipts += $amount;
                } elseif ($isSource) {
                    $entryType = 'payment';
                    $signedAmount = $amount;
                    $runningBalance -= $amount;
                    $totalPayments += $amount;
                }
            }

            return [
                'id' => $tx->id,
                'date' => $tx->transaction_date?->format('Y-m-d'),
                'type' => $entryType,
                'amount' => abs($signedAmount),
                'balance_after' => $runningBalance,
                'reference' => $tx->reference,
                'notes' => $tx->notes,
                'is_outgoing' => ($entryType === 'payment' || ($entryType === 'transfer' && $signedAmount < 0)),
            ];
        });

        return Inertia::render('Backend/06-Cash/AccountTransactions', [
            'account' => [
                'id' => $account->id,
                'name' => $type === 'bank' ? $account->account_name : $account->name,
                'type' => $type,
                'code' => $account->account_code ?? $account->account_number,
                'currency' => $account->currencyInfo,
            ],
            'filters' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'transactions' => $formattedTransactions,
            'totals' => [
                'opening_balance' => $balanceAtStart,
                'total_receipts' => $totalReceipts,
                'total_payments' => $totalPayments,
                'closing_balance' => $runningBalance,
            ]
        ]);
    }

    protected function fetchDailySums(array $dates): array
    {
        $dateStrings = array_map(fn($d) => $d->toDateString(), $dates);

        $receipts = TreasuryTransaction::query()
            ->whereIn('transaction_date', $dateStrings)
            ->where('transaction_type', 'deposit')
            ->where('status', 'posted')
            ->selectRaw('transaction_date as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $payments = TreasuryTransaction::query()
            ->whereIn('transaction_date', $dateStrings)
            ->where('transaction_type', 'withdrawal')
            ->where('status', 'posted')
            ->selectRaw('transaction_date as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $results = [];
        foreach ($dateStrings as $date) {
            $results[$date] = [
                'receipts' => (float)($receipts[$date] ?? 0),
                'payments' => (float)($payments[$date] ?? 0),
            ];
        }

        return $results;
    }

    protected function fetchLargestPayments(Carbon $date): float
    {
        return (float) TreasuryTransaction::whereDate('transaction_date', $date)
            ->where('transaction_type', 'withdrawal')
            ->where('status', 'posted')
            ->max('amount') ?? 0;
    }

    protected function sumReceiptsForDate(Carbon $date): float
    {
        return (float) TreasuryTransaction::whereDate('transaction_date', $date)
            ->where('transaction_type', 'deposit')
            ->where('status', 'posted')
            ->sum('amount');
    }

    protected function sumPaymentsForDate(Carbon $date): float
    {
        return (float) TreasuryTransaction::whereDate('transaction_date', $date)
            ->where('transaction_type', 'withdrawal')
            ->where('status', 'posted')
            ->sum('amount');
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
        $cashDepositTotals = $this->sumTreasuryByAccount('cash', 'deposit', 'destination');
        $cashWithdrawalTotals = $this->sumTreasuryByAccount('cash', 'withdrawal', 'source');
        $cashTransfersToTotals = $this->sumTreasuryByAccount('cash', 'transfer', 'destination');
        $cashTransfersFromTotals = $this->sumTreasuryByAccount('cash', 'transfer', 'source');

        $bankDepositTotals = $this->sumTreasuryByAccount('bank', 'deposit', 'destination');
        $bankWithdrawalTotals = $this->sumTreasuryByAccount('bank', 'withdrawal', 'source');
        $bankTransfersToTotals = $this->sumTreasuryByAccount('bank', 'transfer', 'destination');
        $bankTransfersFromTotals = $this->sumTreasuryByAccount('bank', 'transfer', 'source');

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
                $cashDepositTotals,
                $cashWithdrawalTotals,
                $cashTransfersToTotals,
                $cashTransfersFromTotals,
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
                $bankDepositTotals,
                $bankWithdrawalTotals,
                $bankTransfersToTotals,
                $bankTransfersFromTotals,
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

    protected function sumTreasuryByAccount(string $accountType, string $transactionType, string $direction): array
    {
        $accountColumn = $direction === 'source' ? 'source_account_id' : 'destination_account_id';
        $typeColumn = $direction === 'source' ? 'source_account_type' : 'destination_account_type';

        return TreasuryTransaction::query()
            ->where('status', 'posted')
            ->where('transaction_type', $transactionType)
            ->where($typeColumn, $accountType)
            ->selectRaw("{$accountColumn} as account_id, COALESCE(SUM(amount), 0) as total")
            ->groupBy($accountColumn)
            ->pluck('total', 'account_id')
            ->map(fn ($value) => (float) $value)
            ->all();
    }

    protected function resolveCashAccountBalance(
        CashAccount $account,
        array $depositTotals,
        array $withdrawalTotals,
        array $transferToTotals,
        array $transferFromTotals,
        array $glBalances
    ): float {
        $opening = (float) $account->opening_balance;
        $stored = (float) $account->current_balance;
        $deposits = $depositTotals[$account->id] ?? 0.0;
        $withdrawals = $withdrawalTotals[$account->id] ?? 0.0;
        $transfersTo = $transferToTotals[$account->id] ?? 0.0;
        $transfersFrom = $transferFromTotals[$account->id] ?? 0.0;
        $fromTransactions = $opening + $deposits + $transfersTo - $withdrawals - $transfersFrom;

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
        array $depositTotals,
        array $withdrawalTotals,
        array $transferToTotals,
        array $transferFromTotals,
        array $glBalances
    ): float {
        $opening = (float) $account->opening_balance;
        $stored = (float) $account->current_balance;
        $deposits = $depositTotals[$account->id] ?? 0.0;
        $withdrawals = $withdrawalTotals[$account->id] ?? 0.0;
        $transfersTo = $transferToTotals[$account->id] ?? 0.0;
        $transfersFrom = $transferFromTotals[$account->id] ?? 0.0;
        $fromTransactions = $opening + $deposits + $transfersTo - $withdrawals - $transfersFrom;

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
        return TreasuryTransaction::where(function($q) use ($accountId) {
            $q->where(fn($sq) => $sq->where('source_account_type', 'cash')->where('source_account_id', $accountId))
              ->orWhere(fn($sq) => $sq->where('destination_account_type', 'cash')->where('destination_account_id', $accountId));
        })->max('transaction_date');
    }

    protected function lastTransactionAtForBankAccount(int $accountId): ?string
    {
        return TreasuryTransaction::where(function($q) use ($accountId) {
            $q->where(fn($sq) => $sq->where('source_account_type', 'bank')->where('source_account_id', $accountId))
              ->orWhere(fn($sq) => $sq->where('destination_account_type', 'bank')->where('destination_account_id', $accountId));
        })->max('transaction_date');
    }

    protected function buildCashFlowChart(Carbon $endDate): array
    {
        $startDate = $endDate->copy()->subDays(6);

        $receipts = TreasuryTransaction::query()
            ->where('status', 'posted')
            ->where('transaction_type', 'deposit')
            ->whereDate('transaction_date', '>=', $startDate)
            ->whereDate('transaction_date', '<=', $endDate)
            ->selectRaw('transaction_date as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->all();

        $payments = TreasuryTransaction::query()
            ->where('status', 'posted')
            ->where('transaction_type', 'withdrawal')
            ->whereDate('transaction_date', '>=', $startDate)
            ->whereDate('transaction_date', '<=', $endDate)
            ->selectRaw('transaction_date as date, SUM(amount) as total')
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
        return TreasuryTransaction::query()
            ->with(['sourceAccount.currencyInfo', 'destinationAccount.currencyInfo', 'creator:id,username,fullname'])
            ->latest('transaction_date')
            ->limit(10)
            ->get()
            ->map(function (TreasuryTransaction $t) {
                $account = $t->transaction_type === 'deposit' ? $t->destinationAccount : $t->sourceAccount;
                return [
                    'id' => $t->transaction_no,
                    'date' => $t->transaction_date?->toDateString(),
                    'treasury' => $account ? ($account->account_name ?? $account->name ?? '-') : '-',
                    'type' => $t->transaction_type === 'deposit' ? 'receipt' : ($t->transaction_type === 'withdrawal' ? 'payment' : 'transfer'),
                    'amount' => (float) $t->amount,
                    'currency' => $account
                        ? $this->resolveAccountCurrency($account)
                        : ['code' => 'SAR', 'symbol' => 'SAR', 'name' => 'SAR'],
                    'user' => $this->userDisplayName($t->creator),
                    'status' => $t->status === 'posted' ? 'completed' : $t->status,
                ];
            })
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
