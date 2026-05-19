import React, { useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
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
    ArrowLeftRight, Search, Filter
} from 'lucide-react';

const formatMoney = (amount, decimals = 2) =>
    new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Number(amount || 0));

const formatTrend = (value) => {
    const num = Number(value || 0);
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

const StatCard = ({ title, value, subCurrency, trend, isUp, icon, color }) => {
    const IconComponent = icon;
    return (
        <div className={`stat-card ${color}`}>
            <div className="stat-header">
                <div className="stat-icon-wrapper">
                    <IconComponent size={22} />
                </div>
                <div className={`trend-badge ${isUp ? 'trend-up' : 'trend-down'}`}>
                    {isUp ? <TrendingUp size={13} /> : <TrendingUp size={13} style={{ transform: 'rotate(180deg)' }} />}
                    {trend}
                </div>
            </div>
            <div className="stat-body">
                <div className="stat-label">{title}</div>
                <div className="stat-value">{value}</div>
                {subCurrency && <span className="stat-currency">{subCurrency}</span>}
            </div>
        </div>
    );
};

const QuickAction = ({ label, icon, onClick }) => {
    const IconComponent = icon;
    return (
        <div className="action-card" onClick={onClick} role="button" tabIndex={0}>
            <IconComponent className="action-icon" />
            <div className="action-label">{label}</div>
        </div>
    );
};

const CurrencyChip = ({ item, t }) => (
    <div className="currency-chip">
        <span className="chip-code">{item.code}</span>
        <div className="chip-details">
            <div className="chip-total">{formatMoney(item.total)} {item.symbol || item.code}</div>
            <div className="chip-meta">
                {formatMoney(item.cash)} {t('DashboardTreasury.cash')} · {formatMoney(item.bank)} {t('DashboardTreasury.bank')}
            </div>
        </div>
    </div>
);

const TreasuryAccountCard = ({ account, t }) => (
    <div className="account-mini-card">
        <span className={`account-type-pill type-${account.type}`}>
            {account.type === 'bank' ? t('DashboardTreasury.bank') : t('DashboardTreasury.cash')}
        </span>
        <div className="account-info">
            <div className="name-block">
                <span className="name" title={account.name}>{account.name}</span>
                {account.accountCode && <span className="account-code">{account.accountCode}</span>}
            </div>
            <div className="balance-block">
                <span className="balance">{account.balance}</span>
                <span className="currency-badge">{account.currencyCode}</span>
            </div>
        </div>
        <div className="liquidity-bar-wrapper">
            <div className="bar-label">
                <span>{t('DashboardTreasury.liquidity')}</span>
                <span>{account.liquidity}%</span>
            </div>
            <div className="progress-bg">
                <div className="progress-fill" style={{ width: `${Math.min(account.liquidity, 100)}%` }} />
            </div>
        </div>
        <div className="account-footer">
            <span><Clock size={12} /> {account.lastTx}</span>
            <span className={`status-pill ${account.statusKey}`}>{account.status}</span>
        </div>
    </div>
);

const TreasuryDashboard = ({
    stats = {},
    accounts = [],
    chartData = [],
    recentTransactions = [],
    performance = {},
}) => {
    const { props } = usePage();
    const isArabic = props.localization?.current_locale === 'ar';
    const { t } = useTranslation();

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
            balance: formatWithCurrency(acc.balance, acc.currency),
            currencyCode: acc.currency?.code || 'SAR',
            liquidity: acc.liquidity ?? 0,
            lastTx: formatLastTx(acc.last_tx_at, t),
            status: acc.status === 'active' ? t('DashboardTreasury.active') : acc.status,
            statusKey: acc.status === 'active' ? 'completed' : 'pending',
        })),
    [accounts, t]);

    const transactionsData = useMemo(() =>
        recentTransactions.map((tx) => ({
            ...tx,
            typeLabel: tx.type === 'receipt' ? t('DashboardTreasury.receipt') : t('DashboardTreasury.payment'),
            amountFormatted: formatMoney(tx.amount),
            currencyCode: tx.currency?.code || 'SAR',
            date: tx.date ? formatDate(tx.date) : '-',
        })),
    [recentTransactions, t]);

    return (
        <AdminLayout activeMenu="Treasury">
            <Head title={`${t('DashboardTreasury.title')} - ZodicERP`} />

            <div className="treasury-dashboard">
                <header className="treasury-page-header">
                    <div className="header-text">
                        <h1>{t('DashboardTreasury.title')}</h1>
                        <p>{t('DashboardTreasury.subtitle')}</p>
                    </div>
                    <div className="header-actions">
                        <button type="button" className="td-btn">
                            <Filter size={17} />
                            {t('DashboardTreasury.filter')}
                        </button>
                        <button type="button" className="td-btn td-btn--primary">
                            <PlusCircle size={17} />
                            {t('DashboardTreasury.new_voucher')}
                        </button>
                    </div>
                </header>

                {balancesByCurrency.length > 0 && (
                    <section className="currency-breakdown" aria-label={t('DashboardTreasury.balances_by_currency')}>
                        {balancesByCurrency.map((item) => (
                            <CurrencyChip key={item.code} item={item} t={t} />
                        ))}
                    </section>
                )}

                <section className="stats-grid">
                    {statsData.map((stat) => (
                        <StatCard key={stat.title} {...stat} />
                    ))}
                </section>

                <section className="quick-actions-grid">
                    <QuickAction label={t('DashboardTreasury.receipt_voucher')} icon={PlusCircle} />
                    <QuickAction label={t('DashboardTreasury.payment_voucher')} icon={MinusCircle} />
                    <QuickAction label={t('DashboardTreasury.treasury_transfer')} icon={ArrowLeftRight} />
                    <QuickAction label={t('DashboardTreasury.bank_deposit')} icon={Landmark} />
                    <QuickAction label={t('DashboardTreasury.currency_exchange')} icon={RefreshCcw} />
                    <QuickAction label={t('DashboardTreasury.daily_closing')} icon={Calculator} />
                </section>

                <div className="dashboard-main-grid">
                    <div className="dashboard-column">
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <TrendingUp size={18} style={{ color: '#4f46e5' }} />
                                    {t('DashboardTreasury.cash_flow')}
                                </div>
                                <div className="card-actions">
                                    <select defaultValue="weekly" aria-label={t('DashboardTreasury.weekly')}>
                                        <option value="weekly">{t('DashboardTreasury.weekly')}</option>
                                        <option value="monthly">{t('DashboardTreasury.monthly')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={320}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="tdColorIn" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="tdColorOut" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' }}
                                                formatter={(value, name) => [
                                                    formatMoney(value),
                                                    name === 'incoming' ? t('DashboardTreasury.incoming') : t('DashboardTreasury.outgoing'),
                                                ]}
                                            />
                                            <Area type="monotone" dataKey="incoming" stroke="#059669" strokeWidth={2.5} fill="url(#tdColorIn)" />
                                            <Area type="monotone" dataKey="outgoing" stroke="#e11d48" strokeWidth={2.5} fill="url(#tdColorOut)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <FileText size={18} style={{ color: '#2563eb' }} />
                                    {t('DashboardTreasury.recent_transactions')}
                                </div>
                                <div className="card-actions">
                                    <div style={{ position: 'relative' }}>
                                        <Search
                                            size={14}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                [isArabic ? 'right' : 'left']: '8px',
                                                color: '#94a3b8',
                                            }}
                                        />
                                        <input
                                            type="text"
                                            placeholder={t('DashboardTreasury.search')}
                                            style={{ paddingInlineStart: isArabic ? '0.75rem' : '1.75rem', paddingInlineEnd: isArabic ? '1.75rem' : '0.75rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="card-body card-body--flush">
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="dashboard-table">
                                        <thead>
                                            <tr>
                                                <th>{t('DashboardTreasury.voucher_no')}</th>
                                                <th>{t('DashboardTreasury.date')}</th>
                                                <th>{t('DashboardTreasury.treasury')}</th>
                                                <th>{t('DashboardTreasury.type')}</th>
                                                <th>{t('DashboardTreasury.amount')}</th>
                                                <th>{t('DashboardTreasury.currency')}</th>
                                                <th>{t('DashboardTreasury.user')}</th>
                                                <th>{t('DashboardTreasury.status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8">
                                                        <div className="empty-state">{t('DashboardTreasury.no_transactions')}</div>
                                                    </td>
                                                </tr>
                                            ) : transactionsData.map((tx) => (
                                                <tr key={`${tx.type}-${tx.id}`}>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.id}</td>
                                                    <td>{tx.date}</td>
                                                    <td>{tx.treasury}</td>
                                                    <td>
                                                        <span className={`type-indicator ${tx.type === 'receipt' ? 'receipt' : 'payment'}`}>
                                                            {tx.type === 'receipt' ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
                                                            {tx.typeLabel}
                                                        </span>
                                                    </td>
                                                    <td className="amount-cell">{tx.amountFormatted}</td>
                                                    <td><span className="currency-badge">{tx.currencyCode}</span></td>
                                                    <td>{tx.user}</td>
                                                    <td>
                                                        <span className={`status-pill ${tx.status}`}>
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

                    <div className="dashboard-column">
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <Building2 size={18} style={{ color: '#d97706' }} />
                                    {t('DashboardTreasury.accounts_summary')}
                                </div>
                            </div>
                            <div className="card-body">
                                {accountsData.length === 0 ? (
                                    <div className="empty-state">{t('DashboardTreasury.no_accounts')}</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {accountsData.map((acc) => (
                                            <TreasuryAccountCard key={acc.id} account={acc} t={t} />
                                        ))}
                                    </div>
                                )}
                                <button type="button" className="td-link-btn">
                                    {t('DashboardTreasury.view_all_accounts')}
                                </button>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <AlertCircle size={18} style={{ color: '#e11d48' }} />
                                    {t('DashboardTreasury.important_alerts')}
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="alerts-panel">
                                    <div className="alert-item alert-danger">
                                        <AlertCircle size={18} className="alert-icon" />
                                        <div>
                                            <div className="alert-title">{t('DashboardTreasury.low_balance')}</div>
                                            <div className="alert-desc">{t('DashboardTreasury.low_balance_desc')}</div>
                                        </div>
                                    </div>
                                    <div className="alert-item alert-warning">
                                        <Clock size={18} className="alert-icon" />
                                        <div>
                                            <div className="alert-title">{t('DashboardTreasury.daily_closing_alert')}</div>
                                            <div className="alert-desc">{t('DashboardTreasury.daily_closing_desc')}</div>
                                        </div>
                                    </div>
                                    <div className="alert-item alert-info">
                                        <Landmark size={18} className="alert-icon" />
                                        <div>
                                            <div className="alert-title">{t('DashboardTreasury.bank_transfer')}</div>
                                            <div className="alert-desc">{t('DashboardTreasury.bank_transfer_desc')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <Calculator size={18} style={{ color: '#4f46e5' }} />
                                    {t('DashboardTreasury.performance_analytics')}
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="performance-list">
                                    <div className="performance-row">
                                        <span className="label">{t('DashboardTreasury.highest_balance_today')}</span>
                                        <span className="value">
                                            {formatWithCurrency(performance.highest_balance, primaryCurrency)}
                                        </span>
                                    </div>
                                    <div className="performance-row">
                                        <span className="label">{t('DashboardTreasury.largest_expense')}</span>
                                        <span className="value value--danger">
                                            {formatWithCurrency(performance.largest_expense_today, primaryCurrency)}
                                        </span>
                                    </div>
                                    <div className="performance-row">
                                        <span className="label">{t('DashboardTreasury.monthly_growth')}</span>
                                        <span className={`value ${(performance.monthly_growth ?? 0) >= 0 ? 'value--success' : 'value--danger'}`}>
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
