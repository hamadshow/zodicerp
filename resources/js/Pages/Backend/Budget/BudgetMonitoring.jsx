import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/Budget/BudgetMonitoring.scss';
import axios from 'axios';
import { format } from 'date-fns';

export default function BudgetMonitoring({ monitorings, budgets, initialBudgetItems, filters, auth }) {
    const [budgetItems, setBudgetItems] = useState(initialBudgetItems || []);
    const [selectedMonitoring, setSelectedMonitoring] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'report'
    const [editingCell, setEditingCell] = useState({ id: null, field: null });
    const [editValue, setEditValue] = useState('');

    const startEdit = (row, field) => {
        if (row.acknowledged_by) return; // Read-only if acknowledged
        setEditingCell({ id: row.id, field });
        setEditValue(row[field] || '');
    };

    const saveEdit = (row, field) => {
        if (editValue !== row[field]) {
             router.put(route('admin.budget.monitoring.update', row.id), {
                 [field]: editValue
             }, {
                 preserveScroll: true,
                 onSuccess: () => setEditingCell({ id: null, field: null })
             });
        } else {
            setEditingCell({ id: null, field: null });
        }
    };

    
    // Filter Form
    const { data: filterData, setData: setFilterData, get } = useForm({
        budget_id: filters.budget_id || '',
        budget_item_id: filters.budget_item_id || '',
        period_year: filters.period_year || new Date().getFullYear(),
        period_type: filters.period_type || '',
        period_month: filters.period_month || '',
        variance_status: filters.variance_status || '',
        threshold_breached: filters.threshold_breached || '',
        alert_level: filters.alert_level || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        sort_by: filters.sort_by || 'monitoring_date',
        sort_dir: filters.sort_dir || 'desc',
    });

    const handleSort = (column) => {
        const newDir = filterData.sort_by === column && filterData.sort_dir === 'desc' ? 'asc' : 'desc';
        setFilterData(data => ({ ...data, sort_by: column, sort_dir: newDir }));
        
        router.get(route('admin.budget.monitoring.index'), {
            ...filterData,
            sort_by: column,
            sort_dir: newDir
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Action Form (for Acknowledge / Follow Up)
    const { data: actionData, setData: setActionData, post, processing, reset, errors } = useForm({
        comments: '',
        action_required: '',
        follow_up_date: '',
    });

    // Handle Budget Change to load items
    useEffect(() => {
        if (filterData.budget_id) {
            axios.get(route('admin.budget.monitoring.items', filterData.budget_id))
                .then(response => {
                    setBudgetItems(response.data);
                })
                .catch(error => console.error("Error loading budget items:", error));
        } else {
            setBudgetItems([]);
        }
    }, [filterData.budget_id]);

    const handleFilterChange = (key, value) => {
        setFilterData(key, value);
    };

    const applyFilters = (e) => {
        e.preventDefault();
        get(route('admin.budget.monitoring.index'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleExport = () => {
        const query = new URLSearchParams(filterData).toString();
        window.location.href = route('admin.budget.monitoring.export') + '?' + query;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleMarkDone = () => {
        if (!confirm('Mark this action as done?')) return;
        router.post(route('admin.budget.monitoring.mark-done', selectedMonitoring.id), {}, {
            onSuccess: () => closeDrawer(),
        });
    };

    const handleRowClick = (monitoring) => {
        setSelectedMonitoring(monitoring);
        setActionData({
            comments: monitoring.comments || '',
            action_required: monitoring.action_required || '',
            follow_up_date: monitoring.follow_up_date || '',
        });
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedMonitoring(null);
        reset();
    };

    const handleAcknowledge = () => {
        if (!confirm('Are you sure you want to acknowledge this alert?')) return;
        
        post(route('admin.budget.monitoring.acknowledge', selectedMonitoring.id), {
            onSuccess: () => closeDrawer(),
        });
    };

    const handleFollowUpSave = () => {
        post(route('admin.budget.monitoring.follow-up', selectedMonitoring.id), {
            onSuccess: () => closeDrawer(),
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD', // Or dynamic currency
        }).format(amount || 0);
    };

    return (
        <AdminLayout>
            <Head title="Budget Monitoring" />
            
            <div className="budget-monitoring-page">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Budget Monitoring</h1>
                        <nav className="text-sm text-gray-500 mt-1">
                            Finance &gt; Budget Control &gt; Monitoring
                        </nav>
                    </div>
                    <div className="header-actions flex gap-2">
                        <div className="view-switcher bg-gray-100 rounded p-1 flex mr-4">
                            <button 
                                className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <i className="material-icons-outlined text-sm align-middle mr-1">table_chart</i> Grid
                            </button>
                            <button 
                                className={`px-3 py-1 rounded text-sm ${viewMode === 'report' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => setViewMode('report')}
                            >
                                <i className="material-icons-outlined text-sm align-middle mr-1">analytics</i> Report
                            </button>
                        </div>
                        <button 
                            onClick={handleExport}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <i className="material-icons-outlined text-sm">download</i> Export
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <i className="material-icons-outlined text-sm">print</i> Print
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                <form onSubmit={applyFilters} className="filter-panel">
                    <div>
                        <label>Budget</label>
                        <select 
                            value={filterData.budget_id} 
                            onChange={e => handleFilterChange('budget_id', e.target.value)}
                        >
                            <option value="">All Budgets</option>
                            {budgets.map(b => (
                                <option key={b.id} value={b.id}>{b.budget_name_en}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Budget Item</label>
                        <select 
                            value={filterData.budget_item_id} 
                            onChange={e => handleFilterChange('budget_item_id', e.target.value)}
                            disabled={!filterData.budget_id}
                        >
                            <option value="">All Items</option>
                            {budgetItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Year</label>
                        <input 
                            type="number" 
                            value={filterData.period_year} 
                            onChange={e => handleFilterChange('period_year', e.target.value)}
                        />
                    </div>

                    <div>
                        <label>Status</label>
                        <select 
                            value={filterData.variance_status} 
                            onChange={e => handleFilterChange('variance_status', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="normal">Normal</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    <div>
                        <label>Alert Level</label>
                        <select 
                            value={filterData.alert_level} 
                            onChange={e => handleFilterChange('alert_level', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div>
                        <label>Breached?</label>
                        <select 
                            value={filterData.threshold_breached} 
                            onChange={e => handleFilterChange('threshold_breached', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition h-10"
                    >
                        Filter
                    </button>
                </form>

                {/* Content Area */}
                {viewMode === 'report' ? (
                    <div className="report-dashboard grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Total Actual (Page)</h3>
                            <div className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {formatCurrency(monitorings.data.reduce((sum, r) => sum + parseFloat(r.actual_amount), 0))}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                                vs Budget: {formatCurrency(monitorings.data.reduce((sum, r) => sum + (parseFloat(r.actual_amount) + parseFloat(r.available_amount) + parseFloat(r.committed_amount)), 0))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Active Alerts</h3>
                            <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                                {monitorings.data.filter(r => r.threshold_breached).length}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">Records with breached thresholds</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Avg Variance</h3>
                            <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {(monitorings.data.reduce((sum, r) => sum + parseFloat(r.variance_percent), 0) / (monitorings.data.length || 1)).toFixed(1)}%
                            </div>
                            <div className="mt-1 text-xs text-gray-400">Average percentage across page</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Pending Actions</h3>
                            <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {monitorings.data.filter(r => r.action_required && !r.acknowledged_by).length}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">Require attention</div>
                        </div>
                    </div>
                ) : (
                    <div className="monitoring-grid-container">
                        <div className="overflow-x-auto">
                            <table className="monitoring-table">
                                <thead>
                                    <tr>
                                        <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('monitoring_date')}>
                                            <div className="flex items-center gap-1">Date {filterData.sort_by === 'monitoring_date' && <span className="text-xs">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th>Budget Item</th>
                                        <th className="text-right">Budgeted</th>
                                        <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('actual_amount')}>
                                            <div className="flex items-center justify-end gap-1">Actual {filterData.sort_by === 'actual_amount' && <span className="text-xs">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th className="text-right">Committed</th>
                                        <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('available_amount')}>
                                            <div className="flex items-center justify-end gap-1">Available {filterData.sort_by === 'available_amount' && <span className="text-xs">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('variance_amount')}>
                                            <div className="flex items-center justify-end gap-1">Variance {filterData.sort_by === 'variance_amount' && <span className="text-xs">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('variance_percent')}>
                                            <div className="flex items-center justify-end gap-1">Var % {filterData.sort_by === 'variance_percent' && <span className="text-xs">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th>Status</th>
                                        <th>Alert</th>
                                        <th>Action Required</th>
                                        <th>Comments</th>
                                        <th>Follow Up</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monitorings.data.length > 0 ? (
                                        monitorings.data.map((row) => (
                                            <tr 
                                                key={row.id} 
                                                onClick={() => handleRowClick(row)}
                                                className={`row-status-${row.variance_status || 'normal'} cursor-pointer hover:bg-gray-50`}
                                            >
                                                <td>{format(new Date(row.monitoring_date), 'MMM dd, yyyy')}</td>
                                                <td>
                                                    <div className="font-medium text-gray-900">
                                                        {row.budget_item?.account?.AccName || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {row.budget_item?.category?.name_en || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="amount-col">
                                                    {formatCurrency((parseFloat(row.actual_amount) + parseFloat(row.available_amount) + parseFloat(row.committed_amount)))} 
                                                </td>
                                                <td className="amount-col text-gray-900 font-bold">{formatCurrency(row.actual_amount)}</td>
                                                <td className="amount-col text-gray-600">{formatCurrency(row.committed_amount)}</td>
                                                <td className="amount-col text-green-600 font-bold">{formatCurrency(row.available_amount)}</td>
                                                <td className={`amount-col ${row.variance_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(row.variance_amount)}
                                                </td>
                                                <td className="amount-col">{row.variance_percent}%</td>
                                                <td>
                                                    <span className={`status-badge ${row.variance_status || 'normal'}`}>
                                                        {row.variance_status || 'Normal'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {row.threshold_breached && (
                                                        <span className="text-red-500 flex items-center gap-1">
                                                            <i className="material-icons-outlined text-sm">warning</i>
                                                            {row.alert_level}
                                                        </span>
                                                    )}
                                                </td>
                                                <td onClick={(e) => { e.stopPropagation(); startEdit(row, 'action_required'); }}>
                                                    {editingCell.id === row.id && editingCell.field === 'action_required' ? (
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            className="w-full text-xs border-gray-300 rounded p-1"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => saveEdit(row, 'action_required')}
                                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(row, 'action_required')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-1 min-h-[20px]">
                                                            <span className="text-xs truncate max-w-[150px]">{row.action_required || '-'}</span>
                                                            {!row.acknowledged_by && <i className="material-icons-outlined text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">edit</i>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td onClick={(e) => { e.stopPropagation(); startEdit(row, 'comments'); }}>
                                                    {editingCell.id === row.id && editingCell.field === 'comments' ? (
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            className="w-full text-xs border-gray-300 rounded p-1"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => saveEdit(row, 'comments')}
                                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(row, 'comments')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-1 min-h-[20px]">
                                                            <span className="text-xs truncate max-w-[150px]">{row.comments || '-'}</span>
                                                            {!row.acknowledged_by && <i className="material-icons-outlined text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">edit</i>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {row.follow_up_date ? format(new Date(row.follow_up_date), 'MMM dd') : '-'}
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        {row.acknowledged_by ? (
                                                            <span className="text-green-600 text-xs flex items-center" title={`Acknowledged by ${row.acknowledger?.name}`}>
                                                                <i className="material-icons-outlined text-sm mr-1">check_circle</i>
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedMonitoring(row);
                                                                    handleMarkDone();
                                                                }}
                                                                className="text-gray-400 hover:text-green-600"
                                                                title="Mark Action Done"
                                                            >
                                                                <i className="material-icons-outlined text-sm">check</i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="14" className="text-center py-8 text-gray-500">
                                                No monitoring records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Detail Drawer */}
                {isDrawerOpen && selectedMonitoring && (
                    <div className="detail-drawer-overlay" onClick={closeDrawer}>
                        <div className="detail-drawer" onClick={e => e.stopPropagation()}>
                            <div className="drawer-header">
                                <h2>Monitoring Details</h2>
                                <button className="close-btn" onClick={closeDrawer}>&times;</button>
                            </div>
                            
                            <div className="drawer-content">
                                {/* Financial Summary */}
                                <div className="detail-section">
                                    <h3>Financial Summary</h3>
                                    <div className="detail-row">
                                        <span className="label">Actual Amount</span>
                                        <span className="value">{formatCurrency(selectedMonitoring.actual_amount)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Committed</span>
                                        <span className="value">{formatCurrency(selectedMonitoring.committed_amount)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Available</span>
                                        <span className="value text-green-600">{formatCurrency(selectedMonitoring.available_amount)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Variance</span>
                                        <span className="value text-red-600">
                                            {formatCurrency(selectedMonitoring.variance_amount)} ({selectedMonitoring.variance_percent}%)
                                        </span>
                                    </div>
                                </div>

                                {/* Status & Alerts */}
                                <div className="detail-section">
                                    <h3>Status & Alerts</h3>
                                    <div className="detail-row">
                                        <span className="label">Status</span>
                                        <span className={`status-badge ${selectedMonitoring.variance_status}`}>
                                            {selectedMonitoring.variance_status}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Threshold Breached</span>
                                        <span className="value">{selectedMonitoring.threshold_breached ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Alert Level</span>
                                        <span className="value uppercase">{selectedMonitoring.alert_level || 'None'}</span>
                                    </div>
                                </div>

                                {/* Actions & Workflow */}
                                <div className="detail-section">
                                    <h3>Actions & Workflow</h3>
                                    
                                    <div className="action-form">
                                        <div className="form-group">
                                            <label>Action Required</label>
                                            <textarea 
                                                rows="2"
                                                value={actionData.action_required}
                                                onChange={e => setActionData('action_required', e.target.value)}
                                                disabled={selectedMonitoring.acknowledged_by}
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Follow Up Date</label>
                                            <input 
                                                type="date"
                                                value={actionData.follow_up_date}
                                                onChange={e => setActionData('follow_up_date', e.target.value)}
                                                disabled={selectedMonitoring.acknowledged_by}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Comments</label>
                                            <textarea 
                                                rows="2"
                                                value={actionData.comments}
                                                onChange={e => setActionData('comments', e.target.value)}
                                                disabled={selectedMonitoring.acknowledged_by}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Audit Info */}
                                <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
                                    <p>Monitored by: {selectedMonitoring.monitor?.name || 'System'} on {format(new Date(selectedMonitoring.monitoring_date), 'PP')}</p>
                                    {selectedMonitoring.acknowledged_by && (
                                        <p className="text-green-600 mt-1">
                                            Acknowledged by: {selectedMonitoring.acknowledger?.name} on {format(new Date(selectedMonitoring.acknowledged_date), 'PP')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="drawer-footer">
                                {!selectedMonitoring.acknowledged_by && (
                                    <>
                                        <button 
                                            onClick={handleFollowUpSave}
                                            disabled={processing}
                                            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                        >
                                            Save Updates
                                        </button>
                                        <button 
                                            onClick={handleAcknowledge}
                                            disabled={processing}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                        >
                                            Acknowledge & Lock
                                        </button>
                                    </>
                                )}
                                {selectedMonitoring.acknowledged_by && (
                                    <span className="text-sm text-gray-500 italic self-center">
                                        This record is acknowledged and read-only.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
