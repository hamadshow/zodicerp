import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import axios from 'axios';
import { format } from 'date-fns';
import '../../../../css/backend/main.scss';


// ==========================================
// Custom Hooks
// ==========================================

/**
 * Hook for managing filter state, URL syncing, and budget item loading
 */
const useBudgetMonitoringFilters = (initialFilters, initialBudgetItems) => {
    // We use a local state for the filters to allow debouncing/management before applying
    // However, Inertia's useForm is great for keeping form state. 
    // We'll wrap it to add the budget item fetching logic.
    const { data, setData, get, processing } = useForm({
        budget_id: initialFilters.budget_id || '',
        budget_item_id: initialFilters.budget_item_id || '',
        period_year: initialFilters.period_year || new Date().getFullYear(),
        period_type: initialFilters.period_type || 'monthly',
        period_month: initialFilters.period_month || (new Date().getMonth() + 1),
        period_quarter: initialFilters.period_quarter || 1,
        variance_status: initialFilters.variance_status || '',
        threshold_breached: initialFilters.threshold_breached || '',
        alert_level: initialFilters.alert_level || '',
        date_from: initialFilters.date_from || '',
        date_to: initialFilters.date_to || '',
        sort_by: initialFilters.sort_by || 'monitoring_date',
        sort_dir: initialFilters.sort_dir || 'desc',
    });

    const [budgetItems, setBudgetItems] = useState(initialBudgetItems || []);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // Debounced filter application to prevent duplicate requests if we were auto-filtering
    // But since we have a "Filter" button, we keep manual trigger for main filters, 
    // and maybe auto-trigger for sorting only.
    
    // Sync form data with initialFilters when they change (e.g. navigation)
    useEffect(() => {
        setData(prev => ({
            ...prev,
            budget_id: initialFilters.budget_id || '',
            budget_item_id: initialFilters.budget_item_id || '',
            period_year: initialFilters.period_year || new Date().getFullYear(),
            period_type: initialFilters.period_type || 'monthly',
            period_month: initialFilters.period_month || (new Date().getMonth() + 1),
            period_quarter: initialFilters.period_quarter || 1,
            variance_status: initialFilters.variance_status || '',
            threshold_breached: initialFilters.threshold_breached || '',
            alert_level: initialFilters.alert_level || '',
            date_from: initialFilters.date_from || '',
            date_to: initialFilters.date_to || '',
            sort_by: initialFilters.sort_by || 'monitoring_date',
            sort_dir: initialFilters.sort_dir || 'desc',
        }));
    }, [initialFilters]);

    // Auto-load budget items when budget changes
    useEffect(() => {
        if (data.budget_id) {
            setIsLoadingItems(true);
            const fetchItems = async () => {
                try {
                    const response = await axios.get(route('admin.budget.monitoring.items', data.budget_id));
                    setBudgetItems(response.data);
                } catch (error) {
                    console.error("Error loading budget items:", error);
                } finally {
                    setIsLoadingItems(false);
                }
            };
            fetchItems();
        } else {
            setBudgetItems([]);
        }
    }, [data.budget_id]);

    const handleFilterChange = useCallback((key, value) => {
        setData(key, value);
    }, [setData]);

    const applyFilters = useCallback((e) => {
        if (e) e.preventDefault();
        get(route('admin.budget.monitoring.index'), {
            preserveState: true,
            preserveScroll: true,
        });
    }, [get]);

    const handleSort = useCallback((column) => {
        const newDir = data.sort_by === column && data.sort_dir === 'desc' ? 'asc' : 'desc';
        // Optimistically update state
        setData(prev => ({ ...prev, sort_by: column, sort_dir: newDir }));
        
        // Trigger fetch
        router.get(route('admin.budget.monitoring.index'), {
            ...data,
            sort_by: column,
            sort_dir: newDir
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [data]);

    const handleExport = useCallback(() => {
        const query = new URLSearchParams(data).toString();
        window.location.href = route('admin.budget.monitoring.export') + '?' + query;
    }, [data]);

    return {
        filterData: data,
        setFilterData: setData,
        handleFilterChange,
        applyFilters,
        handleSort,
        handleExport,
        budgetItems,
        isLoadingItems,
        processing
    };
};

/**
 * Hook for inline editing with optimistic updates and error rollback
 */
const useInlineEdit = (initialData, updateRouteName) => {
    // Local copy of data for optimistic updates
    const [localData, setLocalData] = useState(initialData);
    const [editingCell, setEditingCell] = useState({ id: null, field: null });
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sync local data when props change (e.g. after filter reload)
    useEffect(() => {
        setLocalData(initialData);
    }, [initialData]);

    const startEdit = useCallback((row, field) => {
        if (row.acknowledged_by) return; // Read-only check
        if (isSaving) return; // Prevent multiple edits while saving
        
        setEditingCell({ id: row.id, field });
        setEditValue(row[field] || '');
    }, [isSaving]);

    const cancelEdit = useCallback(() => {
        setEditingCell({ id: null, field: null });
        setEditValue('');
    }, []);

    const saveEdit = useCallback((row, field) => {
        // Validation: Prevent saving if value hasn't changed or is empty (optional)
        if (editValue === row[field]) {
            cancelEdit();
            return;
        }

        const originalValue = row[field];
        
        // Optimistic Update
        setLocalData(prev => prev.map(item => 
            item.id === row.id ? { ...item, [field]: editValue } : item
        ));
        setEditingCell({ id: null, field: null }); // Exit edit mode immediately
        setIsSaving(true);

        router.put(route(updateRouteName, row.id), {
            [field]: editValue
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsSaving(false);
            },
            onError: (errors) => {
                console.error("Save failed:", errors);
                // Rollback
                setLocalData(prev => prev.map(item => 
                    item.id === row.id ? { ...item, [field]: originalValue } : item
                ));
                setIsSaving(false);
                alert("Failed to save changes. Please try again.");
            }
        });
    }, [editValue, updateRouteName, cancelEdit]);

    return {
        localData,
        editingCell,
        editValue,
        setEditValue,
        startEdit,
        saveEdit,
        cancelEdit,
        isSaving
    };
};

/**
 * Hook for managing the detail drawer
 */
const useMonitoringDrawer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMonitoring, setSelectedMonitoring] = useState(null);

    // Form for drawer actions
    const { data: actionData, setData: setActionData, post, processing, reset } = useForm({
        comments: '',
        action_required: '',
        follow_up_date: '',
    });

    const openDrawer = useCallback((monitoring) => {
        setSelectedMonitoring(monitoring);
        setActionData({
            comments: monitoring.comments || '',
            action_required: monitoring.action_required || '',
            follow_up_date: monitoring.follow_up_date || '',
        });
        setIsOpen(true);
    }, [setActionData]);

    const closeDrawer = useCallback(() => {
        setIsOpen(false);
        setSelectedMonitoring(null);
        reset();
    }, [reset]);

    const handleAcknowledge = useCallback(() => {
        if (!selectedMonitoring) return;
        if (!confirm('Are you sure you want to acknowledge this alert?')) return;
        
        post(route('admin.budget.monitoring.acknowledge', selectedMonitoring.id), {
            preserveScroll: true,
            onSuccess: () => closeDrawer(),
        });
    }, [selectedMonitoring, post, closeDrawer]);

    const handleFollowUpSave = useCallback(() => {
        if (!selectedMonitoring) return;

        post(route('admin.budget.monitoring.follow-up', selectedMonitoring.id), {
            preserveScroll: true,
            onSuccess: () => closeDrawer(),
        });
    }, [selectedMonitoring, post, closeDrawer]);

    const handleMarkDone = useCallback((monitoring) => {
        if (!confirm('Mark this action as done?')) return;
        
        router.post(route('admin.budget.monitoring.mark-done', monitoring.id), {}, {
            preserveScroll: true,
        });
    }, []);

    return {
        isOpen,
        selectedMonitoring,
        actionData,
        setActionData,
        processing,
        openDrawer,
        closeDrawer,
        handleAcknowledge,
        handleFollowUpSave,
        handleMarkDone
    };
};

/**
 * Hook for calculating statistics
 */
const useMonitoringStats = (data) => {
    return useMemo(() => {
        const totalActual = data.reduce((sum, r) => sum + parseFloat(r.actual_amount || 0), 0);
        const totalBudget = data.reduce((sum, r) => sum + (parseFloat(r.actual_amount || 0) + parseFloat(r.available_amount || 0) + parseFloat(r.committed_amount || 0)), 0);
        const activeAlerts = data.filter(r => r.threshold_breached).length;
        const avgVariance = data.length > 0 
            ? (data.reduce((sum, r) => sum + parseFloat(r.variance_percent || 0), 0) / data.length)
            : 0;
        const pendingActions = data.filter(r => r.action_required && !r.acknowledged_by).length;

        return {
            totalActual,
            totalBudget,
            activeAlerts,
            avgVariance,
            pendingActions
        };
    }, [data]);
};

// ==========================================
// Helper Components
// ==========================================

const ReportDashboard = React.memo(({ stats, formatCurrency }) => (
    <div className="report-dashboard grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Total Actual (Page)</h3>
            <div className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(stats.totalActual)}
            </div>
            <div className="mt-1 text-xs text-gray-400">
                vs Budget: {formatCurrency(stats.totalBudget)}
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Active Alerts</h3>
            <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.activeAlerts}
            </div>
            <div className="mt-1 text-xs text-gray-400">Records with breached thresholds</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Avg Variance</h3>
            <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {stats.avgVariance.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-gray-400">Average percentage across page</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">Pending Actions</h3>
            <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.pendingActions}
            </div>
            <div className="mt-1 text-xs text-gray-400">Require attention</div>
        </div>
    </div>
));

const MonitoringRow = React.memo(({ 
    row, 
    formatCurrency, 
    onRowClick, 
    onStartEdit, 
    onSaveEdit, 
    onMarkDone,
    editingCell, 
    editValue, 
    setEditValue 
}) => {
    const isEditingAction = editingCell.id === row.id && editingCell.field === 'action_required';
    const isEditingComments = editingCell.id === row.id && editingCell.field === 'comments';

    return (
        <tr 
            onClick={() => onRowClick(row)}
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
            <td onClick={(e) => { e.stopPropagation(); onStartEdit(row, 'action_required'); }}>
                {isEditingAction ? (
                    <input 
                        autoFocus
                        type="text" 
                        className="w-full text-xs border-gray-300 rounded p-1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => onSaveEdit(row, 'action_required')}
                        onKeyDown={(e) => e.key === 'Enter' && onSaveEdit(row, 'action_required')}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="flex items-center gap-1 min-h-[20px]">
                        <span className="text-xs truncate max-w-[150px]">{row.action_required || '-'}</span>
                        {!row.acknowledged_by && <i className="material-icons-outlined text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">edit</i>}
                    </div>
                )}
            </td>
            <td onClick={(e) => { e.stopPropagation(); onStartEdit(row, 'comments'); }}>
                {isEditingComments ? (
                    <input 
                        autoFocus
                        type="text" 
                        className="w-full text-xs border-gray-300 rounded p-1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => onSaveEdit(row, 'comments')}
                        onKeyDown={(e) => e.key === 'Enter' && onSaveEdit(row, 'comments')}
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
                            onClick={(e) => { e.stopPropagation(); onMarkDone(row); }}
                            className="text-gray-400 hover:text-green-600"
                            title="Mark Action Done"
                        >
                            <i className="material-icons-outlined text-sm">check</i>
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

// ==========================================
// Main Component
// ==========================================

export default function BudgetMonitoring({ monitorings, budgets, initialBudgetItems, filters }) {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'report'

    // 1. Filter Logic
    const { 
        filterData, 
        handleFilterChange, 
        applyFilters, 
        handleSort, 
        handleExport, 
        budgetItems,
        processing: filterProcessing
    } = useBudgetMonitoringFilters(filters, initialBudgetItems);

    // 2. Inline Edit Logic
    const {
        localData,
        editingCell,
        editValue,
        setEditValue,
        startEdit,
        saveEdit
    } = useInlineEdit(monitorings.data, 'admin.budget.monitoring.update');

    // 3. Drawer Logic
    const {
        isOpen: isDrawerOpen,
        selectedMonitoring,
        actionData,
        setActionData,
        processing,
        openDrawer,
        closeDrawer,
        handleAcknowledge,
        handleFollowUpSave,
        handleMarkDone
    } = useMonitoringDrawer();

    // 4. Stats Logic
    const stats = useMonitoringStats(localData);

    const formatCurrency = useCallback((amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    }, []);

    const handlePrint = () => {
        window.print();
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
                        <label>Period Type</label>
                        <select 
                            value={filterData.period_type} 
                            onChange={e => handleFilterChange('period_type', e.target.value)}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="year_to_date">Custom Period</option>
                            <option value="full_year">Full Year</option>
                        </select>
                    </div>

                    {filterData.period_type === 'full_year' && (
                        <div>
                            <label>Year</label>
                            <input 
                                type="number" 
                                value={filterData.period_year} 
                                onChange={e => handleFilterChange('period_year', e.target.value)}
                            />
                        </div>
                    )}

                    {filterData.period_type === 'monthly' && (
                        <>
                            <div>
                                <label>Year</label>
                                <input 
                                    type="number" 
                                    value={filterData.period_year} 
                                    onChange={e => handleFilterChange('period_year', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>Month</label>
                                <select 
                                    value={filterData.period_month} 
                                    onChange={e => handleFilterChange('period_month', e.target.value)}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {filterData.period_type === 'quarterly' && (
                        <>
                            <div>
                                <label>Year</label>
                                <input 
                                    type="number" 
                                    value={filterData.period_year} 
                                    onChange={e => handleFilterChange('period_year', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>Quarter</label>
                                <select 
                                    value={filterData.period_quarter} 
                                    onChange={e => handleFilterChange('period_quarter', e.target.value)}
                                >
                                    <option value="1">Q1</option>
                                    <option value="2">Q2</option>
                                    <option value="3">Q3</option>
                                    <option value="4">Q4</option>
                                </select>
                            </div>
                        </>
                    )}

                    {filterData.period_type === 'year_to_date' && (
                        <>
                            <div>
                                <label>From Date</label>
                                <input 
                                    type="date" 
                                    value={filterData.date_from} 
                                    onChange={e => handleFilterChange('date_from', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>To Date</label>
                                <input 
                                    type="date" 
                                    value={filterData.date_to} 
                                    onChange={e => handleFilterChange('date_to', e.target.value)}
                                />
                            </div>
                        </>
                    )}

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
                        disabled={filterProcessing}
                        className={`bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition h-10 ${filterProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {filterProcessing ? 'Filtering...' : 'Filter'}
                    </button>
                </form>

                {/* Content Area */}
                {viewMode === 'report' ? (
                    <ReportDashboard stats={stats} formatCurrency={formatCurrency} />
                ) : (
                    <div className="monitoring-grid-container">
                        <div className="overflow-x-auto">
                            <table className="monitoring-table">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('monitoring_date')}>
                                            <div className="flex items-center gap-1">Date {filterData.sort_by === 'monitoring_date' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Budget Item</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Budgeted</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('actual_amount')}>
                                            <div className="flex items-center justify-end gap-1">Actual {filterData.sort_by === 'actual_amount' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Committed</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('available_amount')}>
                                            <div className="flex items-center justify-end gap-1">Available {filterData.sort_by === 'available_amount' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('variance_amount')}>
                                            <div className="flex items-center justify-end gap-1">Variance {filterData.sort_by === 'variance_amount' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('variance_percent')}>
                                            <div className="flex items-center justify-end gap-1">Var % {filterData.sort_by === 'variance_percent' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Alert</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action Required</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Comments</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Follow Up</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localData.length > 0 ? (
                                        localData.map((row) => (
                                            <MonitoringRow 
                                                key={row.id}
                                                row={row}
                                                formatCurrency={formatCurrency}
                                                onRowClick={openDrawer}
                                                onStartEdit={startEdit}
                                                onSaveEdit={saveEdit}
                                                onMarkDone={handleMarkDone}
                                                editingCell={editingCell}
                                                editValue={editValue}
                                                setEditValue={setEditValue}
                                            />
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
