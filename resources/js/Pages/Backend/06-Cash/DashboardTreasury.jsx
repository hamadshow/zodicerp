import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
    Wallet, ArrowUpRight, ArrowDownRight, Building2, Clock, 
    FileText, Calculator, TrendingUp, AlertCircle, 
    PlusCircle, MinusCircle, RefreshCcw, Landmark, 
    ArrowLeftRight, Search, Filter
} from 'lucide-react';

// --- Sub-components ---

const StatCard = ({ title, value, trend, isUp, icon, color }) => {
    const IconComponent = icon;
    return (
        <div className={`stat-card ${color}`}>
            <div className="stat-header">
                <div className="stat-icon-wrapper">
                    <IconComponent size={24} />
                </div>
                <div className={`trend-badge ${isUp ? 'trend-up' : 'trend-down'}`}>
                    {isUp ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'rotate(180deg)' }} />}
                    {trend}
                </div>
            </div>
            <div className="stat-body">
                <div className="stat-label">{title}</div>
                <div className="stat-value">{value}</div>
            </div>
        </div>
    );
};

const QuickAction = ({ label, icon, onClick }) => {
    const IconComponent = icon;
    return (
        <div className="action-card" onClick={onClick}>
            <IconComponent className="action-icon" />
            <div className="action-label">{label}</div>
        </div>
    );
};

const TreasuryAccountCard = ({ account, t }) => (
    <div className="account-mini-card">
        <div className="account-info">
            <span className="name">{account.name}</span>
            <span className="balance">{account.balance}</span>
        </div>
        <div className="liquidity-bar-wrapper">
            <div className="bar-label">
                <span>{t('DashboardTreasury.liquidity')}</span>
                <span>{account.liquidity}%</span>
            </div>
            <div className="progress-bg">
                <div className="progress-fill" style={{ width: `${account.liquidity}%` }}></div>
            </div>
        </div>
        <div className="account-footer">
            <span><Clock size={12} style={{ marginLeft: '4px' }} /> {account.lastTx}</span>
            <span className="status-pill completed">{account.status}</span>
        </div>
    </div>
);

const TreasuryDashboard = () => {
    const { props } = usePage();
    const isArabic = props.localization?.current_locale === 'ar';
    const { t } = useTranslation();

    // --- Mock Data for the Dashboard (Moved inside for translation) ---
    const statsData = [
        { title: t('DashboardTreasury.total_balance'), value: `450,230.00 ${t('DashboardTreasury.sar')}`, trend: '+12.5%', isUp: true, icon: Wallet, color: 'stat-emerald' },
        { title: t('DashboardTreasury.receipts_today'), value: `12,450.00 ${t('DashboardTreasury.sar')}`, trend: '+5.2%', isUp: true, icon: ArrowUpRight, color: 'stat-blue' },
        { title: t('DashboardTreasury.payments_today'), value: `8,320.00 ${t('DashboardTreasury.sar')}`, trend: '-2.1%', isUp: false, icon: ArrowDownRight, color: 'stat-rose' },
        { title: t('DashboardTreasury.bank_balances'), value: `1,280,000.00 ${t('DashboardTreasury.sar')}`, trend: '+0.8%', isUp: true, icon: Landmark, color: 'stat-indigo' },
    ];

    const chartData = [
        { name: t('DashboardTreasury.sat'), incoming: 4000, outgoing: 2400 },
        { name: t('DashboardTreasury.sun'), incoming: 3000, outgoing: 1398 },
        { name: t('DashboardTreasury.mon'), incoming: 2000, outgoing: 9800 },
        { name: t('DashboardTreasury.tue'), incoming: 2780, outgoing: 3908 },
        { name: t('DashboardTreasury.wed'), incoming: 1890, outgoing: 4800 },
        { name: t('DashboardTreasury.thu'), incoming: 2390, outgoing: 3800 },
        { name: t('DashboardTreasury.fri'), incoming: 3490, outgoing: 4300 },
    ];

    const accountsData = [
        { name: t('DashboardTreasury.main_treasury'), balance: `150,000 ${t('DashboardTreasury.sar')}`, liquidity: 85, lastTx: t('DashboardTreasury.mins_ago').replace(':time', '10'), status: t('DashboardTreasury.completed') },
        { name: t('DashboardTreasury.jeddah_treasury'), balance: `45,200 ${t('DashboardTreasury.sar')}`, liquidity: 40, lastTx: t('DashboardTreasury.hours_ago').replace(':time', '2'), status: t('DashboardTreasury.completed') },
        { name: t('DashboardTreasury.petty_cash_treasury'), balance: `12,500 ${t('DashboardTreasury.sar')}`, liquidity: 15, lastTx: t('DashboardTreasury.yesterday'), status: t('DashboardTreasury.completed') },
    ];

    const transactionsData = [
        { id: 'V-2024-001', date: '2024-05-19', treasury: t('DashboardTreasury.main_treasury'), type: t('DashboardTreasury.receipt'), amount: '5,000.00', user: t('DashboardTreasury.user_ahmed'), status: 'completed' },
        { id: 'V-2024-002', date: '2024-05-19', treasury: t('DashboardTreasury.jeddah_treasury'), type: t('DashboardTreasury.payment'), amount: '1,200.00', user: t('DashboardTreasury.user_sara'), status: 'pending' },
        { id: 'V-2024-003', date: '2024-05-18', treasury: t('DashboardTreasury.main_treasury'), type: t('DashboardTreasury.transfer'), amount: '10,000.00', user: t('DashboardTreasury.user_ahmed'), status: 'completed' },
        { id: 'V-2024-004', date: '2024-05-18', treasury: t('DashboardTreasury.petty_cash_treasury'), type: t('DashboardTreasury.deposit'), amount: '2,500.00', user: t('DashboardTreasury.user_khaled'), status: 'completed' },
    ];

    return (
        <AdminLayout activeMenu="Treasury">
            <Head title={`${t('DashboardTreasury.title')} - ZodicERP`} />
            
            <div className="treasury-dashboard">
                {/* Internal Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{t('DashboardTreasury.title')}</h1>
                        <p className="text-slate-500 text-sm">{t('DashboardTreasury.subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
                            <Filter size={18} />
                            {t('DashboardTreasury.filter')}
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all">
                            <PlusCircle size={18} />
                            {t('DashboardTreasury.new_voucher')}
                        </button>
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="stats-grid">
                    {statsData.map((stat, i) => (
                        <StatCard key={i} {...stat} />
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-grid">
                    <QuickAction label={t('DashboardTreasury.receipt_voucher')} icon={PlusCircle} />
                    <QuickAction label={t('DashboardTreasury.payment_voucher')} icon={MinusCircle} />
                    <QuickAction label={t('DashboardTreasury.treasury_transfer')} icon={ArrowLeftRight} />
                    <QuickAction label={t('DashboardTreasury.bank_deposit')} icon={Landmark} />
                    <QuickAction label={t('DashboardTreasury.currency_exchange')} icon={RefreshCcw} />
                    <QuickAction label={t('DashboardTreasury.daily_closing')} icon={Calculator} />
                </div>

                {/* Main Content Area */}
                <div className="dashboard-main-grid">
                    {/* Left Column: Charts and Tables */}
                    <div className="flex flex-col gap-6">
                        {/* Area Chart Card */}
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <TrendingUp size={20} className="text-indigo-500" />
                                    {t('DashboardTreasury.cash_flow')}
                                </div>
                                <div className="card-actions">
                                    <select className="bg-slate-50 border-none text-xs font-semibold rounded p-1 text-slate-600">
                                        <option>{t('DashboardTreasury.weekly')}</option>
                                        <option>{t('DashboardTreasury.monthly')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="chart-container" style={{ minHeight: '350px' }}>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                                                formatter={(value, name) => [value, name === 'incoming' ? t('DashboardTreasury.incoming') : t('DashboardTreasury.outgoing')]}
                                            />
                                            <Area type="monotone" dataKey="incoming" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                                            <Area type="monotone" dataKey="outgoing" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions Table */}
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <FileText size={20} className="text-blue-500" />
                                    {t('DashboardTreasury.recent_transactions')}
                                </div>
                                <div className="card-actions">
                                    <div className="relative">
                                        <Search size={14} className={`absolute ${isArabic ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 text-slate-400`} />
                                        <input type="text" placeholder={t('DashboardTreasury.search')} className={`bg-slate-50 border border-slate-200 rounded-md py-1 ${isArabic ? 'pr-8 pl-3' : 'pl-8 pr-3'} text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500`} />
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="dashboard-table">
                                        <thead>
                                            <tr>
                                                <th>{t('DashboardTreasury.voucher_no')}</th>
                                                <th>{t('DashboardTreasury.date')}</th>
                                                <th>{t('DashboardTreasury.treasury')}</th>
                                                <th>{t('DashboardTreasury.type')}</th>
                                                <th>{t('DashboardTreasury.amount')}</th>
                                                <th>{t('DashboardTreasury.user')}</th>
                                                <th>{t('DashboardTreasury.status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData.map((tx, i) => (
                                                <tr key={i}>
                                                    <td className="font-mono text-xs">{tx.id}</td>
                                                    <td>{tx.date}</td>
                                                    <td>{tx.treasury}</td>
                                                    <td>
                                                        <div className={`type-indicator ${tx.type === t('DashboardTreasury.receipt') ? 'receipt' : 'payment'}`}>
                                                            {tx.type === t('DashboardTreasury.receipt') ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
                                                            {tx.type}
                                                        </div>
                                                    </td>
                                                    <td className="font-bold">{tx.amount}</td>
                                                    <td>{tx.user}</td>
                                                    <td>
                                                        <span className={`status-pill ${tx.status}`}>
                                                            {tx.status === 'completed' ? t('DashboardTreasury.completed') : t('DashboardTreasury.pending')}
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

                    {/* Right Column: Accounts and Alerts */}
                    <div className="flex flex-col gap-6">
                        {/* Treasury Accounts Summary */}
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <Building2 size={20} className="text-amber-500" />
                                    {t('DashboardTreasury.accounts_summary')}
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="flex flex-col gap-4">
                                    {accountsData.map((acc, i) => (
                                        <TreasuryAccountCard key={i} account={acc} t={t} />
                                    ))}
                                </div>
                                <button className="w-full mt-6 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-all">
                                    {t('DashboardTreasury.view_all_accounts')}
                                </button>
                            </div>
                        </div>

                        {/* Alerts and Notifications */}
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <AlertCircle size={20} className="text-rose-500" />
                                    {t('DashboardTreasury.important_alerts')}
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="alerts-panel">
                                    <div className="alert-item alert-danger">
                                        <AlertCircle size={20} className="alert-icon" />
                                        <div className="alert-content">
                                            <div className="alert-title">{t('DashboardTreasury.low_balance')}</div>
                                            <div className="alert-desc">{t('DashboardTreasury.low_balance_desc')}</div>
                                        </div>
                                    </div>
                                    <div className="alert-item alert-warning">
                                        <Clock size={20} className="alert-icon" />
                                        <div className="alert-content">
                                            <div className="alert-title">{t('DashboardTreasury.daily_closing_alert')}</div>
                                            <div className="alert-desc">{t('DashboardTreasury.daily_closing_desc')}</div>
                                        </div>
                                    </div>
                                    <div className="alert-item alert-info">
                                        <Landmark size={20} className="alert-icon" />
                                        <div className="alert-content">
                                            <div className="alert-title">{t('DashboardTreasury.bank_transfer')}</div>
                                            <div className="alert-desc">{t('DashboardTreasury.bank_transfer_desc')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Mini Analytics */}
                        <div className="dashboard-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <Calculator size={20} className="text-indigo-500" />
                                    {t('DashboardTreasury.performance_analytics')}
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">{t('DashboardTreasury.highest_balance_today')}</span>
                                        <span className="text-sm font-bold text-slate-800">150,000</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">{t('DashboardTreasury.largest_expense')}</span>
                                        <span className="text-sm font-bold text-rose-500">3,400</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">{t('DashboardTreasury.monthly_growth')}</span>
                                        <span className="text-sm font-bold text-emerald-500">+14%</span>
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


