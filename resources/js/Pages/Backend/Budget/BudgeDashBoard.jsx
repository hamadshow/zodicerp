import React, { useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/main.scss';


const BudgeDashBoard = ({
    budgets,
    categories,
    filters,
    kpis,
    monthlyTrend,
    categorySummaries,
    budgetItemsTable,
}) => {
    const { data, setData, get, processing } = useForm({
        budget_id: filters.budget_id || '',
        category_id: filters.category_id || '',
        period_type: filters.period_type || 'monthly',
        period_year: filters.period_year || new Date().getFullYear(),
        period_month: filters.period_month || new Date().getMonth() + 1,
        period_quarter: filters.period_quarter || 1,
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
    });

    const applyFilters = (e) => {
        e.preventDefault();
        get(route('admin.budget.dashboard'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

    const utilization = kpis.total_budgeted
        ? (kpis.total_actual / kpis.total_budgeted) * 100
        : 0;

    const maxTrendValue = useMemo(() => {
        const values = monthlyTrend.flatMap((row) => [row.budgeted, row.actual]);
        return Math.max(...values, 1);
    }, [monthlyTrend]);

    const topCategories = useMemo(() => categorySummaries.slice(0, 6), [categorySummaries]);

    const isBudgetSelected = !!data.budget_id;

    return (
        <AdminLayout activeMenu="Budget Dashboard">
            <Head>
                <title>Budget Monitoring Dashboard</title>
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
                    rel="stylesheet"
                />
            </Head>

            <div className="budget-dashboard-page">
                <div className="page-header">
                    <div>
                        <h1>Budget Monitoring Dashboard</h1>
                        <p className="subtitle">
                            Executive view of budget performance, variance, and alerts
                        </p>
                    </div>
                    <div className="header-actions">
                        <button type="button" className="btn btn-outline" onClick={applyFilters} disabled={!isBudgetSelected}>
                            <span className="material-icons-outlined">refresh</span>
                            Refresh
                        </button>
                        <button type="button" className="btn btn-primary" disabled={!isBudgetSelected}>
                            <span className="material-icons-outlined">download</span>
                            Export
                        </button>
                    </div>
                </div>

                <form className="filter-panel" onSubmit={applyFilters}>
                    <div className="filter-group">
                        <label>Budget <span className="text-red-500">*</span></label>
                        <select
                            value={data.budget_id}
                            onChange={(e) => {
                                setData('budget_id', e.target.value);
                                // Optional: Auto-submit on budget change if you want immediate load, 
                                // but standard ERPs usually wait for "Apply" or auto-load.
                                // Let's wait for user to click Apply or just let React state handle it.
                            }}
                            className="form-control"
                        >
                            <option value="">Select Budget</option>
                            {budgets.map((budget) => (
                                <option key={budget.id} value={budget.id}>
                                    {budget.budget_name_en} ({budget.fiscal_year})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Category</label>
                        <select
                            value={data.category_id}
                            onChange={(e) => setData('category_id', e.target.value)}
                            disabled={!isBudgetSelected}
                            className="form-control"
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name_en}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Period Type</label>
                        <select
                            value={data.period_type}
                            onChange={(e) => setData('period_type', e.target.value)}
                            disabled={!isBudgetSelected}
                            className="form-control"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="year_to_date">Year To Date</option>
                            <option value="full_year">Full Year</option>
                        </select>
                    </div>
                    {(data.period_type === 'monthly' || data.period_type === 'year_to_date' || data.period_type === 'full_year') && (
                        <div className="filter-group">
                            <label>Year</label>
                            <input
                                type="number"
                                value={data.period_year}
                                onChange={(e) => setData('period_year', e.target.value)}
                                disabled={!isBudgetSelected}
                                className="form-control"
                            />
                        </div>
                    )}
                    {data.period_type === 'monthly' && (
                        <div className="filter-group">
                            <label>Month</label>
                            <select
                                value={data.period_month}
                                onChange={(e) => setData('period_month', e.target.value)}
                                disabled={!isBudgetSelected}
                                className="form-control"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                    <option key={month} value={month}>
                                        {new Date(0, month - 1).toLocaleString('default', {
                                            month: 'long',
                                        })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary apply-btn" disabled={processing || !isBudgetSelected}>
                        {processing ? 'Loading...' : 'Apply Filters'}
                    </button>
                </form>

                {!isBudgetSelected ? (
                    <div className="empty-state-container" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>
                            analytics
                        </span>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Please select a budget to load data
                        </h2>
                        <p>Select a budget from the filter bar above to view performance metrics.</p>
                    </div>
                ) : (
                    <div className={`transition-opacity duration-200 ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="kpi-grid">
                            <div className="kpi-card">
                                <div className="kpi-icon primary">
                                    <span className="material-icons-outlined">account_balance</span>
                                </div>
                                <div>
                                    <div className="kpi-label">Total Budget</div>
                                    <div className="kpi-value">{formatCurrency(kpis.total_budgeted)}</div>
                                    <div className="kpi-subtext">{kpis.budget_items} items</div>
                                </div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-icon warning">
                                    <span className="material-icons-outlined">paid</span>
                                </div>
                                <div>
                                    <div className="kpi-label">Actual Spent</div>
                                    <div className="kpi-value">{formatCurrency(kpis.total_actual)}</div>
                                    <div className="kpi-subtext">Utilization {utilization.toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-icon success">
                                    <span className="material-icons-outlined">savings</span>
                                </div>
                                <div>
                                    <div className="kpi-label">Remaining</div>
                                    <div className="kpi-value">{formatCurrency(kpis.total_available)}</div>
                                    <div className="kpi-subtext">{kpis.categories} categories</div>
                                </div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-icon info">
                                    <span className="material-icons-outlined">pie_chart</span>
                                </div>
                                <div>
                                    <div className="kpi-label">Utilization %</div>
                                    <div className="kpi-value">{utilization.toFixed(1)}%</div>
                                    <div className="kpi-subtext">of total budget</div>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-grid">
                            <div className="card chart-card">
                                <div className="card-header">
                                    <h2>Budget vs Actual Trend</h2>
                                    <div className="legend">
                                        <span className="legend-item budget">Budget</span>
                                        <span className="legend-item actual">Actual</span>
                                    </div>
                                </div>
                                <div className="chart-container">
                                    {monthlyTrend.map((row) => {
                                        const budgetHeight = (row.budgeted / maxTrendValue) * 100;
                                        const actualHeight = (row.actual / maxTrendValue) * 100;
                                        return (
                                            <div key={row.month} className="chart-column">
                                                <div className="bars">
                                                    <div
                                                        className="bar budget"
                                                        style={{ height: `${budgetHeight}%` }}
                                                        title={`Budget: ${formatCurrency(row.budgeted)}`}
                                                    />
                                                    <div
                                                        className="bar actual"
                                                        style={{ height: `${actualHeight}%` }}
                                                        title={`Actual: ${formatCurrency(row.actual)}`}
                                                    />
                                                </div>
                                                <div className="label">{row.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="card category-card">
                                <div className="card-header">
                                    <h2>Actual by Category</h2>
                                    <span className="subtitle">Top spending categories</span>
                                </div>
                                <div className="category-list">
                                    {topCategories.map((row) => {
                                        const utilizationRate = row.budgeted
                                            ? Math.min((row.actual / row.budgeted) * 100, 100)
                                            : 0;
                                        return (
                                            <div key={row.category_id} className="category-row">
                                                <div className="category-name">{row.category_name}</div>
                                                <div className="category-values">
                                                    <span className="actual-value">
                                                        {formatCurrency(row.actual)}
                                                    </span>
                                                    <span className="utilization-text">
                                                        {utilizationRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="progress">
                                                    <div
                                                        className="fill actual"
                                                        style={{ width: `${utilizationRate}%`, backgroundColor: '#3b82f6' }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {topCategories.length === 0 && (
                                        <div className="empty-state">No data available</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card items-table-card">
                            <div className="card-header">
                                <h2>Budget Items Detail</h2>
                                <span className="subtitle">Detailed breakdown by Category and Account</span>
                            </div>
                            <div className="table-wrapper">
                                <table className="items-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Account</th>
                                            <th className="text-right">Budget Amount</th>
                                            <th className="text-right">Actual Amount</th>
                                            <th className="text-right">Variance</th>
                                            <th className="text-right">Utilization %</th>
                                            <th className="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {budgetItemsTable.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.category_name}</td>
                                                <td>{row.account_name}</td>
                                                <td className="text-right">
                                                    {row.account_dm_type === 1
                                                        ? formatCurrency(-Math.abs(row.budgeted))
                                                        : formatCurrency(row.budgeted)
                                                    }
                                                </td>
                                                <td className="text-right">
                                                    {row.account_dm_type === 1 
                                                        ? formatCurrency(-Math.abs(row.actual)) 
                                                        : formatCurrency(row.actual)
                                                    }
                                                </td>
                                                <td className={`text-right ${row.variance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(row.variance_amount)}
                                                </td>
                                                <td className="text-right">
                                                    {row.utilization_percent.toFixed(1)}%
                                                </td>
                                                <td className="text-center">
                                                    <span className={`status-pill ${row.variance_status}`}>
                                                        {row.variance_status === 'unfavorable' ? 'Over Budget' : 'Within Budget'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {budgetItemsTable.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="text-center py-4">
                                                    No budget items found for the selected criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default BudgeDashBoard;
