import React, { useState, useMemo, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate } from '@/utils/date';
import {
    ArrowLeft, Wallet, FileText, Search, Filter, 
    ArrowUpRight, ArrowDownRight, Calendar,
    Clock, Activity
} from 'lucide-react';

const formatMoney = (amount, decimals = 2) =>
    new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Number(amount || 0));

const formatWithCurrency = (amount, currency) => {
    const code = currency?.code || 'SAR';
    const symbol = currency?.symbol || code;
    return `${formatMoney(amount)} ${symbol}`;
};

const AccountTransactions = ({ 
    account, 
    filters, 
    transactions, 
    totals 
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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => 
            !searchQuery || 
            (tx.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transactions, searchQuery]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        router.get(getLocalizedRoute('admin.treasury.account.transactions'), {
            ...filters,
            account_id: account.id,
            type: account.type,
            [name]: value
        }, { preserveState: true });
    };

    const primaryCurrency = account.currency || { code: 'SAR', symbol: 'SAR' };

    return (
        <AdminLayout>
            <Head title={`${account.name} - ${t('DashboardTreasury.recent_transactions')}`} />
            
            <div className="treasury-dashboard">
                <header className="treasury-header">
                    <div className="treasury-header__main">
                        <button 
                            onClick={() => window.history.back()} 
                            className="treasury-back-btn"
                            style={{ 
                                background: 'white', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px',
                                cursor: 'pointer', 
                                padding: '8px', 
                                marginRight: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="treasury-title">
                                {account.name} - {t('DashboardTreasury.recent_transactions')}
                            </h1>
                            <p className="treasury-subtitle">
                                {formatDate(filters.start_date)} - {formatDate(filters.end_date)}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="treasury-stats-grid">
                    <div className="treasury-stat-card stat-blue">
                        <div className="treasury-stat-card__header">
                            <div className="treasury-stat-card__icon"><Activity size={20} /></div>
                        </div>
                        <div className="treasury-stat-card__body">
                            <div className="treasury-stat-card__label">{t('DashboardTreasury.total_balance')} (Opening)</div>
                            <div className="treasury-stat-card__value">{formatWithCurrency(totals.opening_balance, primaryCurrency)}</div>
                        </div>
                    </div>
                    <div className="treasury-stat-card stat-emerald">
                        <div className="treasury-stat-card__header">
                            <div className="treasury-stat-card__icon"><ArrowUpRight size={20} /></div>
                        </div>
                        <div className="treasury-stat-card__body">
                            <div className="treasury-stat-card__label">{t('DashboardTreasury.incoming')}</div>
                            <div className="treasury-stat-card__value">{formatWithCurrency(totals.total_receipts, primaryCurrency)}</div>
                        </div>
                    </div>
                    <div className="treasury-stat-card stat-rose">
                        <div className="treasury-stat-card__header">
                            <div className="treasury-stat-card__icon"><ArrowDownRight size={20} /></div>
                        </div>
                        <div className="treasury-stat-card__body">
                            <div className="treasury-stat-card__label">{t('DashboardTreasury.outgoing')}</div>
                            <div className="treasury-stat-card__value">{formatWithCurrency(totals.total_payments, primaryCurrency)}</div>
                        </div>
                    </div>
                    <div className="treasury-stat-card stat-indigo">
                        <div className="treasury-stat-card__header">
                            <div className="treasury-stat-card__icon"><Wallet size={20} /></div>
                        </div>
                        <div className="treasury-stat-card__body">
                            <div className="treasury-stat-card__label">{t('DashboardTreasury.total_balance')} (Closing)</div>
                            <div className="treasury-stat-card__value">{formatWithCurrency(totals.closing_balance, primaryCurrency)}</div>
                        </div>
                    </div>
                </div>

                <div className="treasury-card">
                    <div className="treasury-card__header">
                        <div className="treasury-card__title">
                            <Filter size={18} />
                            {t('DashboardTreasury.filter')}
                        </div>
                        <div className="treasury-card__actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={14} color="#64748b" />
                                <input 
                                    type="date" 
                                    name="start_date" 
                                    value={filters.start_date} 
                                    onChange={handleDateChange}
                                    className="treasury-card__select"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                />
                                <span style={{ color: '#64748b' }}>→</span>
                                <input 
                                    type="date" 
                                    name="end_date" 
                                    value={filters.end_date} 
                                    onChange={handleDateChange}
                                    className="treasury-card__select"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                />
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
                    </div>
                    <div className="treasury-card__body flush">
                        <div className="treasury-table-wrapper">
                            <table className="treasury-table">
                                <thead>
                                    <tr>
                                        <th>{t('DashboardTreasury.date')}</th>
                                        <th>{t('DashboardTreasury.type')}</th>
                                        <th>{t('DashboardTreasury.voucher_no')} / Ref</th>
                                        <th>Notes</th>
                                        <th className="amount-col">{t('DashboardTreasury.amount')}</th>
                                        <th className="amount-col">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <td colSpan="5" style={{ fontWeight: '600', color: '#475569' }}>
                                            [Opening Balance]
                                        </td>
                                        <td className="amount-col" style={{ fontWeight: '600', color: '#475569' }}>
                                            {formatMoney(totals.opening_balance)}
                                        </td>
                                    </tr>
                                    {filteredTransactions.map((tx) => (
                                        <tr key={`${tx.type}-${tx.id}`}>
                                            <td>{formatDate(tx.date)}</td>
                                            <td>
                                                <span className={`status-badge status-${tx.type === 'receipt' ? 'completed' : tx.type === 'payment' ? 'pending' : 'transfer'}`}>
                                                    {t(`DashboardTreasury.${tx.type}`)}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{tx.reference}</div>
                                            </td>
                                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.notes}>
                                                {tx.notes || '-'}
                                            </td>
                                            <td className={`amount-col ${tx.is_outgoing ? 'is-negative' : 'is-positive'}`} style={{ fontWeight: '500' }}>
                                                {tx.is_outgoing ? '-' : '+'}{formatMoney(tx.amount)}
                                            </td>
                                            <td className="amount-col" style={{ fontWeight: '500' }}>
                                                {formatMoney(tx.balance_after)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center" style={{ padding: '48px', color: '#64748b' }}>
                                                <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                                <p>{t('DashboardTreasury.no_transactions')}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AccountTransactions;
