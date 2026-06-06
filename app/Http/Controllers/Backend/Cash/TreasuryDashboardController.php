<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\BankAccount;
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

    public function index(\Illuminate\Http\Request $request)
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        
        // Handle filter for chart (daily, weekly, monthly)
        $filter = $request->input('filter', 'weekly');
        $cacheKey = $this->cacheKeyPrefix . 'data_' . $filter;

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($today, $yesterday, $filter) {
            // 1. Get All Treasury Accounts (Bank & Cash) from bank_accounts
            $allAccounts = BankAccount::query()
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

            // 2. Batch fetch last transaction dates for all accounts
            $lastTxDates = TreasuryTransaction::query()
                ->selectRaw('COALESCE(source_account_id, destination_account_id) as account_id, MAX(transaction_date) as last_date')
                ->where(function($q) use ($allAccounts) {
                    $q->where(fn($sq) => $sq->whereIn('source_account_id', $allAccounts->pluck('id')))
                      ->orWhere(fn($sq) => $sq->whereIn('destination_account_id', $allAccounts->pluck('id')));
                })
                ->groupBy('account_id')
                ->pluck('last_date', 'account_id');

            $accounts = $allAccounts->map(function ($acc) use ($lastTxDates) {
                $lastTx = $lastTxDates[$acc->id] ?? null;

                return (object) [
                    'id' => $acc->id,
                    'name' => $acc->account_type === 'bank' && $acc->bank 
                        ? $acc->bank->name . ' - ' . $acc->account_name 
                        : $acc->account_name,
                    'account_code' => $acc->account_number,
                    'type' => $acc->account_type, // 'bank' or 'cash'
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

            $totalBalance = (float) $accounts->sum('balance');
            $accountsSummary = $accounts->map(function ($acc) use ($totalBalance) {
                $acc->liquidity = $totalBalance != 0 ? round(($acc->balance / $totalBalance) * 100, 1) : 0;
                return $acc;
            })->sortByDesc('balance')->values();
            
            // 2. Primary Currency and Stats
            $balancesByCurrency = $this->buildBalancesByCurrency($accountsSummary);
            $primaryCurrency = $this->resolvePrimaryCurrency($balancesByCurrency);

            $stats = [
                'total_balance' => $totalBalance,
                'receipts_today' => $this->sumReceiptsForDate($today),
                'payments_today' => $this->sumPaymentsForDate($today),
                'bank_balances' => (float) $accountsSummary->where('type', 'bank')->sum('balance'),
                'primary_currency' => $primaryCurrency,
                'balances_by_currency' => $balancesByCurrency,
            ];

            // 3. Chart Data with filter support
            $chartData = $this->buildCashFlowChart($today, $filter);
            
            // 4. Recent Transactions
            $recentTransactions = $this->buildRecentTransactions();
            
            // 5. Performance Analytics
            $performance = [
                'highest_balance' => (float) $accountsSummary->max('balance') ?? 0,
                'largest_expense_today' => $this->fetchLargestPayments($today),
                'monthly_growth' => $this->calculateMonthlyGrowth($today),
                'primary_currency' => $primaryCurrency,
            ];

            return Inertia::render('Backend/06-Cash/DashboardTreasury', [
                'stats' => $stats,
                'accounts' => $accountsSummary,
                'chartData' => $chartData,
                'recentTransactions' => $recentTransactions,
                'performance' => $performance,
                'filters' => [
                    'chart' => $filter
                ]
            ]);
        });
    }

    public function accountTransactions(\Illuminate\Http\Request $request)
    {
        $accountId = $request->account_id;
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::now()->subMonth()->startOfMonth();
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::now()->subMonth()->endOfMonth();

        $account = BankAccount::with(['bank', 'currencyInfo'])->findOrFail($accountId);

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

        $formattedTransactions = $transactions->map(function ($tx) use ($accountId, &$runningBalance, &$totalReceipts, &$totalPayments) {
            $amount = (float) $tx->amount;
            $isSource = (int) $tx->source_account_id === (int) $accountId;
            $isDestination = (int) $tx->destination_account_id === (int) $accountId;

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
                'name' => $account->account_name,
                'type' => $account->account_type,
                'code' => $account->account_number,
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
            $currency = $account->currency;
            if (!$currency) continue;
            
            $code = $currency->code;
            if (! isset($grouped[$code])) {
                $grouped[$code] = [
                    'code' => $code,
                    'symbol' => $currency->symbol,
                    'name' => $currency->name,
                    'cash' => 0.0,
                    'bank' => 0.0,
                    'total' => 0.0,
                ];
            }

            $bucket = $account->type === 'bank' ? 'bank' : 'cash';
            $grouped[$code][$bucket] += (float) $account->balance;
            $grouped[$code]['total'] += (float) $account->balance;
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

    protected function buildCashFlowChart(Carbon $endDate, string $filter = 'weekly'): array
    {
        $days = match($filter) {
            'daily' => 1,
            'weekly' => 7,
            'monthly' => 30,
            default => 7
        };

        $startDate = $endDate->copy()->subDays($days - 1);

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
        for ($i = $days - 1; $i >= 0; $i--) {
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

    protected function calculateMonthlyGrowth(Carbon $today): float
    {
        $lastMonthEnd = $today->copy()->subMonth()->endOfMonth();

        $currentBalance = (float) TreasuryTransaction::where('status', 'posted')
            ->whereDate('transaction_date', '<=', $today)
            ->sum(DB::raw("CASE WHEN transaction_type = 'deposit' THEN amount ELSE -amount END"));

        $lastMonthBalance = (float) TreasuryTransaction::where('status', 'posted')
            ->whereDate('transaction_date', '<=', $lastMonthEnd)
            ->sum(DB::raw("CASE WHEN transaction_type = 'deposit' THEN amount ELSE -amount END"));

        return $this->percentChange($currentBalance, $lastMonthBalance);
    }

    protected function buildRecentTransactions(): array
    {
        return TreasuryTransaction::query()
            ->with(['sourceAccount.currencyInfo', 'destinationAccount.currencyInfo', 'creator:id,username,fullname'])
            ->latest('transaction_date')
            ->limit(10)
            ->get()
            ->map(function (TreasuryTransaction $t) {
                // Since we unified accounts, sourceAccount and destinationAccount relationships 
                // in TreasuryTransaction should now point to BankAccount model.
                // I need to check TreasuryTransaction model.
                $account = $t->transaction_type === 'deposit' ? $t->destinationAccount : $t->sourceAccount;
                
                $currency = $account ? $account->currencyInfo : null;
                
                return [
                    'id' => $t->transaction_no,
                    'date' => $t->transaction_date?->toDateString(),
                    'treasury' => $account ? $account->account_name : '-',
                    'type' => $t->transaction_type === 'deposit' ? 'receipt' : ($t->transaction_type === 'withdrawal' ? 'payment' : 'transfer'),
                    'amount' => (float) $t->amount,
                    'currency' => [
                        'code' => $currency->code ?? 'EGP',
                        'symbol' => $currency->symbol ?? 'EGP',
                        'name' => $currency->name ?? 'EGP',
                    ],
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
