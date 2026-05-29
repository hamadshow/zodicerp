import React, { useState, useMemo, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate } from '@/utils/date';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Wallet, ArrowUpRight, ArrowDownRight, Building2, Clock,
    FileText, Calculator, TrendingUp, AlertCircle,
    PlusCircle, MinusCircle, RefreshCcw, Landmark,
    ArrowLeftRight, Search, Filter, ChevronRight,
    ChevronLeft, BarChart3, DollarSign, PiggyBank,
    CreditCard, Activity
} from 'lucide-react';

const formatMoney = (amount, decimals = 2) =>
    new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Number(amount || 0));

const formatTrend = (value) => {
    const num = Number(value || 0);
    if (num === 0) return '0%';
    const prefix = num > 0 ? '+' : '';
    return `${prefix}${num}%`;
};

const formatLastTx = (dateStr, t) => {
    if (!dateStr) return t('DashboardTreasury.no_activity');
    return formatDate(dateStr);
};

const formatWithCurrency = (amount, currency) => {
    const code = currency?.code || 'SAR';
    const symbol = currency?.symbol || code;
    return `${formatMoney(amount)} ${symbol}`;
};

const CurrencyChip = React.memo(({ item, t }) => (
    <div className="treasury-currency-chip">
        <span className="treasury-currency-chip__code">{item.code}</span>
        <div className="treasury-currency-chip__details">
            <div className="treasury-currency-chip__total">
                {formatMoney(item.total)} {item.symbol || item.code}
            </div>
            <div className="treasury-currency-chip__meta">
                {formatMoney(item.cash)} {t('DashboardTreasury.cash')}
                <span className="treasury-currency-chip__sep">·</span>
                {formatMoney(item.bank)} {t('DashboardTreasury.bank')}
            </div>
        </div>
    </div>
));

const StatCard = React.memo(({ title, value, subCurrency, trend, isUp, icon, color, isNegative }) => {
    const Icon = icon;
    return (
        <div className={`treasury-stat-card ${color} ${isNegative ? 'is-negative' : ''}`}>
            <div className="treasury-stat-card__header">
                <div className="treasury-stat-card__icon">
                    <Icon size={20} />
                </div>
                <div className={`treasury-stat-card__trend ${isUp ? 'trend-up' : 'trend-down'}`}>
                    <TrendingUp size={12} />
                    {trend}
                </div>
            </div>
            <div className="treasury-stat-card__body">
                <div className="treasury-stat-card__label">{title}</div>
                <div className="treasury-stat-card__value">{value}</div>
                {subCurrency && <span className="treasury-stat-card__currency">{subCurrency}</span>}
            </div>
        </div>
    );
});

const QuickAction = React.memo(({ label, icon, onClick }) => {
    const Icon = icon;
    return (
        <button type="button" className="treasury-action-card" onClick={onClick}>
            <div className="treasury-action-card__icon"><Icon size={22} /></div>
            <div className="treasury-action-card__label">{label}</div>
        </button>
    );
});

const TreasuryAccountCard = ({ account, t, onClick }) => {
    const isNegative = account.rawBalance < 0;
    return (
        <div 
            className={`treasury-account-card ${isNegative ? 'is-negative' : ''}`} 
            onClick={onClick}
            style={{ cursor: 'pointer' }}
        >
            <span className={`treasury-account-card__type type-${account.type}`}>
                {account.type === 'bank' ? t('DashboardTreasury.bank') : t('DashboardTreasury.cash')}
            </span>
            <div className="treasury-account-card__info">
                <div className="treasury-account-card__name-block">
                    <span className="treasury-account-card__name" title={account.name}>{account.name}</span>
                    {account.accountCode && <span className="treasury-account-card__code">{account.accountCode}</span>}
                </div>
                <div className="treasury-account-card__balance-block">
                    <span className={`treasury-account-card__balance ${isNegative ? 'is-negative' : ''}`}>
                        {account.balance}
                    </span>
                    <span className="treasury-account-card__currency">{account.currencyCode}</span>
                </div>
            </div>
            <div className="treasury-account-card__liquidity">
                <div className="treasury-account-card__liquidity-label">
                    <span>{t('DashboardTreasury.liquidity')}</span>
                    <span>{account.liquidity}%</span>
                </div>
                <div className="treasury-account-card__progress-bg">
                    <div
                        className={`treasury-account-card__progress-fill ${isNegative ? 'fill-negative' : ''}`}
                        style={{ width: `${Math.min(Math.abs(account.liquidity), 100)}%` }}
                    />
                </div>
            </div>
            <div className="treasury-account-card__footer">
                <span className="treasury-account-card__last-tx">
                    <Clock size={12} /> {account.lastTx}
                </span>
                <span className={`treasury-account-card__status status-${account.statusKey}`}>
                    {account.status}
                </span>
            </div>
        </div>
    );
};

const TreasuryDashboard = ({
    stats = {},
    accounts = [],
    chartData = [],
    recentTransactions = [],
    performance = {},
}) => {
    const { props } = usePage();
    const localization = props.localization;
    const { t } = useTranslation();

    const getLocalizedRoute = useCallback((name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    }, [localization]);

    const [searchQuery, setSearchQuery] = useState('');
    const [chartPeriod, setChartPeriod] = useState('weekly');
    const [filterOpen, setFilterOpen] = useState(false);

    const primaryCurrency = stats.primary_currency || performance.primary_currency || { code: 'SAR', symbol: 'SAR' };
    const balancesByCurrency = stats.balances_by_currency || [];
    const hasMultipleCurrencies = balancesByCurrency.length > 1;

    const formatAmount = (amount, currency = primaryCurrency) =>
        formatWithCurrency(amount, currency);

    const statsData = useMemo(() => {
        const trends = stats.trends || {};
        const currencyLabel = hasMultipleCurrencies
            ? t('DashboardTreasury.multi_currency')
            : primaryCurrency.code;

        return [
            {
                title: t('DashboardTreasury.total_balance'),
                value: formatAmount(stats.total_balance),
                subCurrency: currencyLabel,
                trend: formatTrend(trends.total_balance),
                isUp: (trends.total_balance ?? 0) >= 0,
                isNegative: (stats.total_balance ?? 0) < 0,
                icon: Wallet,
                color: 'stat-emerald',
            },
            {
                title: t('DashboardTreasury.receipts_today'),
                value: formatAmount(stats.receipts_today),
                subCurrency: primaryCurrency.code,
                trend: formatTrend(trends.receipts_today),
                isUp: (trends.receipts_today ?? 0) >= 0,
                icon: ArrowUpRight,
                color: 'stat-blue',
            },
            {
                title: t('DashboardTreasury.payments_today'),
                value: formatAmount(stats.payments_today),
                subCurrency: primaryCurrency.code,
                trend: formatTrend(trends.payments_today),
                isUp: (trends.payments_today ?? 0) <= 0,
                icon: ArrowDownRight,
                color: 'stat-rose',
            },
            {
                title: t('DashboardTreasury.bank_balances'),
                value: formatAmount(stats.bank_balances),
                subCurrency: primaryCurrency.code,
                trend: formatTrend(trends.bank_balances),
                isUp: (trends.bank_balances ?? 0) >= 0,
                isNegative: (stats.bank_balances ?? 0) < 0,
                icon: Landmark,
                color: 'stat-indigo',
            },
        ];
    }, [stats, t, primaryCurrency, hasMultipleCurrencies]);

    const accountsData = useMemo(() =>
        accounts.map((acc) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            accountCode: acc.account_code,
            rawBalance: Number(acc.balance),
            balance: formatWithCurrency(acc.balance, acc.currency),
            currencyCode: acc.currency?.code || 'SAR',
            liquidity: acc.liquidity ?? 0,
            lastTx: formatLastTx(acc.last_tx_at, t),
            status: acc.status === 'active' ? t('DashboardTreasury.active') : acc.status,
            statusKey: acc.status === 'active' ? 'completed' : 'pending',
        })),
    [accounts, t]);

    const hasNegativeAccounts = accountsData.some((a) => a.rawBalance < 0);
    const transactionsData = useMemo(() =>
        recentTransactions
            .map((tx) => ({
                ...tx,
                typeLabel: tx.type === 'receipt' ? t('DashboardTreasury.receipt') : t('DashboardTreasury.payment'),
                amountFormatted: formatMoney(tx.amount),
                currencyCode: tx.currency?.code || 'SAR',
                date: tx.date ? formatDate(tx.date) : '-',
            }))
            .filter((tx) =>
                !searchQuery ||
                tx.id?.toString().includes(searchQuery) ||
                (tx.treasury || '').toLowerCase().includes(searchQuery.toLowerCase())
            ),
    [recentTransactions, t, searchQuery]);

    const hasNoData = !stats.total_balance && !stats.receipts_today && accounts.length === 0;

    const handleAccountClick = useCallback((account) => {
        const now = new Date();
        // Previous month calculation
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const formatDateString = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        router.get(getLocalizedRoute('admin.treasury.account.transactions'), {
              account_id: account.id,
              type: account.type,
              start_date: formatDateString(firstDayPrevMonth),
              end_date: formatDateString(lastDayPrevMonth)
          });
    }, [getLocalizedRoute]);

    const StatCardSkeleton = () => (
        <div className="treasury-stat-card is-loading">
            <div className="treasury-stat-card__header">
                <div className="skeleton skeleton--circle" />
                <div className="skeleton skeleton--sm" />
            </div>
            <div className="treasury-stat-card__body">
                <div className="skeleton skeleton--xs" />
                <div className="skeleton skeleton--md" />
                <div className="skeleton skeleton--xs" />
            </div>
        </div>
    );

    if (hasNoData) {
        return (
            <AdminLayout activeMenu="Treasury">
                <Head title={`${t('DashboardTreasury.title')} - ZodicERP`} />
                <div className="treasury-dashboard">
                    <div className="treasury-dashboard__empty">
                        <BarChart3 size={48} />
                        <h3>{t('DashboardTreasury.no_data_title') || 'No Data Available'}</h3>
                        <p>{t('DashboardTreasury.no_data_desc') || 'Start by adding cash accounts and recording transactions.'}</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout activeMenu="Treasury">
            <Head title={`${t('DashboardTreasury.title')} - ZodicERP`} />

            <div className="treasury-dashboard">
                <header className="treasury-page-header">
                    <div className="treasury-page-header__text">
                        <h1>{t('DashboardTreasury.title')}</h1>
                        <p>{t('DashboardTreasury.subtitle')}</p>
                    </div>
                    <div className="treasury-page-header__actions">
                        <button
                            type="button"
                            className="td-btn td-btn--ghost"
                            onClick={() => setFilterOpen(!filterOpen)}
                        >
                            <Filter size={16} />
                            {t('DashboardTreasury.filter')}
                        </button>
                    </div>
                </header>

                {balancesByCurrency.length > 0 && (
                    <section className="treasury-currency-strip" aria-label={t('DashboardTreasury.balances_by_currency')}>
                        <div className="treasury-currency-strip__scroll">
                            {balancesByCurrency.map((item) => (
                                <CurrencyChip key={item.code} item={item} t={t} />
                            ))}
                        </div>
                    </section>
                )}

                <section className="treasury-stats-grid">
                    {statsData.map((stat) => (
                        <StatCard key={stat.title} {...stat} />
                    ))}
                </section>

                <section className="treasury-actions-strip">
                    <QuickAction
                        label={t('DashboardTreasury.treasury_transfer')}
                        icon={ArrowLeftRight}
                    />
                    <QuickAction
                        label={t('DashboardTreasury.bank_deposit')}
                        icon={Landmark}
                    />
                    <QuickAction
                        label={t('DashboardTreasury.currency_exchange')}
                        icon={RefreshCcw}
                    />
                    <QuickAction
                        label={t('DashboardTreasury.daily_closing')}
                        icon={Calculator}
                    />
                </section>

                <div className="treasury-main-grid">
                    <div className="treasury-main-grid__primary">
                        <div className="treasury-card">
                            <div className="treasury-card__header">
                                <div className="treasury-card__title">
                                    <Activity size={18} />
                                    {t('DashboardTreasury.cash_flow')}
                                </div>
                                <select
                                    className="treasury-card__select"
                                    value={chartPeriod}
                                    onChange={(e) => setChartPeriod(e.target.value)}
                                    aria-label={t('DashboardTreasury.period')}
                                >
                                    <option value="weekly">{t('DashboardTreasury.weekly')}</option>
                                    <option value="monthly">{t('DashboardTreasury.monthly')}</option>
                                </select>
                            </div>
                            <div className="treasury-card__body">
                                {chartData.length === 0 ? (
                                    <div className="treasury-card__empty-chart">
                                        <BarChart3 size={32} />
                                        <p>{t('DashboardTreasury.no_chart_data') || 'No chart data available'}</p>
                                    </div>
                                ) : (
                                    <div className="treasury-chart-container">
                                        <ResponsiveContainer width="100%" height={320}>
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="tdGradIn" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="tdGradOut" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    tickFormatter={(v) => formatMoney(v, 0)}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '12px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                                                    }}
                                                    formatter={(value, name) => [
                                                        formatMoney(value),
                                                        name === 'incoming'
                                                            ? t('DashboardTreasury.incoming')
                                                            : t('DashboardTreasury.outgoing'),
                                                    ]}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="incoming"
                                                    stroke="#059669"
                                                    strokeWidth={2.5}
                                                    fill="url(#tdGradIn)"
                                                    name="incoming"
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="outgoing"
                                                    stroke="#e11d48"
                                                    strokeWidth={2.5}
                                                    fill="url(#tdGradOut)"
                                                    name="outgoing"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="treasury-card">
                            <div className="treasury-card__header">
                                <div className="treasury-card__title">
                                    <FileText size={18} />
                                    {t('DashboardTreasury.recent_transactions')}
                                </div>
                                <div className="treasury-card__search">
                                    <Search size={14} className="treasury-card__search-icon" />
                                    <input
                                        type="text"
                                        className="treasury-card__search-input"
                                        placeholder={t('DashboardTreasury.search')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="treasury-card__body flush">
                                <div className="treasury-table-wrapper">
                                    <table className="treasury-table">
                                        <thead>
                                            <tr>
                                                <th>{t('DashboardTreasury.voucher_no')}</th>
                                                <th>{t('DashboardTreasury.date')}</th>
                                                <th>{t('DashboardTreasury.treasury')}</th>
                                                <th>{t('DashboardTreasury.type')}</th>
                                                <th className="amount-col">{t('DashboardTreasury.amount')}</th>
                                                <th>{t('DashboardTreasury.currency')}</th>
                                                <th>{t('DashboardTreasury.user')}</th>
                                                <th>{t('DashboardTreasury.status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8">
                                                        <div className="treasury-table__empty">
                                                            {searchQuery
                                                                ? (t('DashboardTreasury.no_search_results') || 'No transactions match your search')
                                                                : t('DashboardTreasury.no_transactions')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : transactionsData.map((tx) => (
                                                <tr key={`${tx.type}-${tx.id}`}>
                                                    <td className="treasury-table__voucher">{tx.id}</td>
                                                    <td>{tx.date}</td>
                                                    <td className="treasury-table__treasury">{tx.treasury}</td>
                                                    <td>
                                                        <span className={`treasury-table__type type-${tx.type}`}>
                                                            {tx.type === 'receipt' ? <PlusCircle size={13} /> : <MinusCircle size={13} />}
                                                            {tx.typeLabel}
                                                        </span>
                                                    </td>
                                                    <td className="treasury-table__amount">{tx.amountFormatted}</td>
                                                    <td><span className="treasury-table__currency">{tx.currencyCode}</span></td>
                                                    <td className="treasury-table__user">{tx.user}</td>
                                                    <td>
                                                        <span className={`treasury-table__status status-${tx.status}`}>
                                                            {tx.status === 'completed'
                                                                ? t('DashboardTreasury.completed')
                                                                : t('DashboardTreasury.pending')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="treasury-main-grid__sidebar">
                        <div className="treasury-card">
                            <div className="treasury-card__header">
                                <div className="treasury-card__title">
                                    <Building2 size={18} />
                                    {t('DashboardTreasury.accounts_summary')}
                                </div>
                                {hasNegativeAccounts && (
                                    <span className="treasury-badge treasury-badge--warning">
                                        {t('DashboardTreasury.negative_balance') || 'Negative'}
                                    </span>
                                )}
                            </div>
                            <div className="treasury-card__body">
                                {accountsData.length === 0 ? (
                                    <div className="treasury-card__empty">
                                        <PiggyBank size={28} />
                                        <p>{t('DashboardTreasury.no_accounts')}</p>
                                    </div>
                                ) : (
                                    <div className="treasury-accounts-list">
                                        {accountsData.map((acc) => (
                                            <TreasuryAccountCard 
                                                key={`${acc.type}-${acc.id}`} 
                                                account={acc} 
                                                t={t} 
                                                onClick={() => handleAccountClick(acc)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="treasury-card">
                            <div className="treasury-card__header">
                                <div className="treasury-card__title">
                                    <AlertCircle size={18} />
                                    {t('DashboardTreasury.important_alerts')}
                                </div>
                            </div>
                            <div className="treasury-card__body">
                                <div className="treasury-alerts">
                                    <div className="treasury-alerts__item danger">
                                        <AlertCircle size={18} />
                                        <div>
                                            <div className="treasury-alerts__title">{t('DashboardTreasury.low_balance')}</div>
                                            <div className="treasury-alerts__desc">{t('DashboardTreasury.low_balance_desc')}</div>
                                        </div>
                                    </div>
                                    <div className="treasury-alerts__item warning">
                                        <Clock size={18} />
                                        <div>
                                            <div className="treasury-alerts__title">{t('DashboardTreasury.daily_closing_alert')}</div>
                                            <div className="treasury-alerts__desc">{t('DashboardTreasury.daily_closing_desc')}</div>
                                        </div>
                                    </div>
                                    <div className="treasury-alerts__item info">
                                        <Landmark size={18} />
                                        <div>
                                            <div className="treasury-alerts__title">{t('DashboardTreasury.bank_transfer')}</div>
                                            <div className="treasury-alerts__desc">{t('DashboardTreasury.bank_transfer_desc')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="treasury-card">
                            <div className="treasury-card__header">
                                <div className="treasury-card__title">
                                    <BarChart3 size={18} />
                                    {t('DashboardTreasury.performance_analytics')}
                                </div>
                            </div>
                            <div className="treasury-card__body">
                                <div className="treasury-performance">
                                    <div className="treasury-performance__row">
                                        <span className="treasury-performance__label">{t('DashboardTreasury.highest_balance_today')}</span>
                                        <span className="treasury-performance__value">
                                            {formatWithCurrency(performance.highest_balance, primaryCurrency)}
                                        </span>
                                    </div>
                                    <div className="treasury-performance__row">
                                        <span className="treasury-performance__label">{t('DashboardTreasury.largest_expense')}</span>
                                        <span className="treasury-performance__value is-danger">
                                            {formatWithCurrency(performance.largest_expense_today, primaryCurrency)}
                                        </span>
                                    </div>
                                    <div className="treasury-performance__row">
                                        <span className="treasury-performance__label">{t('DashboardTreasury.monthly_growth')}</span>
                                        <span className={`treasury-performance__value ${(performance.monthly_growth ?? 0) >= 0 ? 'is-success' : 'is-danger'}`}>
                                            {formatTrend(performance.monthly_growth)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default TreasuryDashboard;
