import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
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
const useInlineEdit = (initialData, updateRouteName, t) => {
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
                alert(t('save_failed', 'Failed to save changes. Please try again.'));
            }
        });
    }, [editValue, updateRouteName, cancelEdit, t]);

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
const useMonitoringDrawer = (t) => {
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
        if (!confirm(t('confirm_acknowledge', 'Are you sure you want to acknowledge this alert?'))) return;
        
        post(route('admin.budget.monitoring.acknowledge', selectedMonitoring.id), {
            preserveScroll: true,
            onSuccess: () => closeDrawer(),
        });
    }, [selectedMonitoring, post, closeDrawer, t]);

    const handleFollowUpSave = useCallback(() => {
        if (!selectedMonitoring) return;

        post(route('admin.budget.monitoring.follow-up', selectedMonitoring.id), {
            preserveScroll: true,
            onSuccess: () => closeDrawer(),
        });
    }, [selectedMonitoring, post, closeDrawer]);

    const handleMarkDone = useCallback((monitoring) => {
        if (!confirm(t('confirm_mark_done', 'Mark this action as done?'))) return;
        
        router.post(route('admin.budget.monitoring.mark-done', monitoring.id), {}, {
            preserveScroll: true,
        });
    }, [t]);

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

const ReportDashboard = React.memo(({ stats, formatCurrency, t }) => (
    <div className="report-dashboard grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">{t('total_actual_page', 'Total Actual (Page)')}</h3>
            <div className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(stats.totalActual)}
            </div>
            <div className="mt-1 text-xs text-gray-400">
                {t('vs_budget', 'vs Budget')}: {formatCurrency(stats.totalBudget)}
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">{t('active_alerts', 'Active Alerts')}</h3>
            <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.activeAlerts}
            </div>
            <div className="mt-1 text-xs text-gray-400">{t('breached_thresholds_desc', 'Records with breached thresholds')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">{t('avg_variance', 'Avg Variance')}</h3>
            <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {stats.avgVariance.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-gray-400">{t('avg_variance_desc', 'Average percentage across page')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wider">{t('pending_actions', 'Pending Actions')}</h3>
            <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.pendingActions}
            </div>
            <div className="mt-1 text-xs text-gray-400">{t('require_attention', 'Require attention')}</div>
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
    setEditValue,
    t
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
                    {row.budget_item?.account?.AccName || t('na', 'N/A')}
                </div>
                <div className="text-xs text-gray-500">
                    {row.budget_item?.category?.name_en || t('na', 'N/A')}
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
                    {t(row.variance_status || 'normal', row.variance_status || 'Normal')}
                </span>
            </td>
            <td>
                {row.threshold_breached && (
                    <span className="text-red-500 flex items-center gap-1">
                        <i className="material-icons-outlined text-sm">warning</i>
                        {t(row.alert_level?.toLowerCase() || '', row.alert_level)}
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
                        <span className="text-green-600 text-xs flex items-center" title={`${t('acknowledged_by', 'Acknowledged by')} ${row.acknowledger?.name}`}>
                            <i className="material-icons-outlined text-sm mr-1">check_circle</i>
                        </span>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onMarkDone(row); }}
                            className="text-gray-400 hover:text-green-600"
                            title={t('mark_done', 'Mark Action Done')}
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
    const { props } = usePage();
    const localization = props.localization || {};
    const translations = localization.translations || {};

    const t = (key, fallback) => {
        return translations[`BudgetMonitoring.${key}`] || fallback;
    };

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
    } = useInlineEdit(monitorings.data, 'admin.budget.monitoring.update', t);

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
    } = useMonitoringDrawer(t);

    // 4. Stats Logic
    const stats = useMonitoringStats(localData);

    const formatCurrency = useCallback((amount) => {
        return new Intl.NumberFormat(localization.current_locale === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: localization.currency_code || 'USD',
        }).format(amount || 0);
    }, [localization]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <AdminLayout>
            <Head title={t('budget_monitoring', 'Budget Monitoring')} />
            
            <div className="budget-monitoring-page">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{t('budget_monitoring', 'Budget Monitoring')}</h1>
                        <nav className="text-sm text-gray-500 mt-1">
                            {t('finance_budget_control', 'Finance > Budget Control > Monitoring')}
                        </nav>
                    </div>
                    <div className="header-actions">
                        <button 
                            className={viewMode === 'grid' ? 'active' : ''}
                            onClick={() => setViewMode('grid')}
                        >
                            <i className="material-icons-outlined">table_chart</i> {t('grid', 'Grid')}
                        </button>
                        <button 
                            className={viewMode === 'report' ? 'active' : ''}
                            onClick={() => setViewMode('report')}
                        >
                            <i className="material-icons-outlined">analytics</i> {t('report', 'Report')}
                        </button>
                        <button onClick={handleExport}>
                            <i className="material-icons-outlined">download</i> {t('export', 'Export')}
                        </button>
                        <button onClick={handlePrint}>
                            <i className="material-icons-outlined">print</i> {t('print', 'Print')}
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                <form onSubmit={applyFilters} className="filter-panel">
                    <div>
                        <label>{t('budget', 'Budget')}</label>
                        <select 
                            value={filterData.budget_id} 
                            onChange={e => handleFilterChange('budget_id', e.target.value)}
                        >
                            <option value="">{t('all_budgets', 'All Budgets')}</option>
                            {budgets.map(b => (
                                <option key={b.id} value={b.id}>{localization.current_locale === 'ar' ? b.budget_name_ar : b.budget_name_en}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>{t('budget_item', 'Budget Item')}</label>
                        <select 
                            value={filterData.budget_item_id} 
                            onChange={e => handleFilterChange('budget_item_id', e.target.value)}
                            disabled={!filterData.budget_id}
                        >
                            <option value="">{t('all_items', 'All Items')}</option>
                            {budgetItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>{t('period_type', 'Period Type')}</label>
                        <select 
                            value={filterData.period_type} 
                            onChange={e => handleFilterChange('period_type', e.target.value)}
                        >
                            <option value="monthly">{t('monthly', 'Monthly')}</option>
                            <option value="quarterly">{t('quarterly', 'Quarterly')}</option>
                            <option value="year_to_date">{t('custom_period', 'Custom Period')}</option>
                            <option value="full_year">{t('full_year', 'Full Year')}</option>
                        </select>
                    </div>

                    {filterData.period_type === 'full_year' && (
                        <div>
                            <label>{t('year', 'Year')}</label>
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
                                <label>{t('year', 'Year')}</label>
                                <input 
                                    type="number" 
                                    value={filterData.period_year} 
                                    onChange={e => handleFilterChange('period_year', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>{t('month', 'Month')}</label>
                                <select 
                                    value={filterData.period_month} 
                                    onChange={e => handleFilterChange('period_month', e.target.value)}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString(localization.current_locale === 'ar' ? 'ar-SA' : 'default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {filterData.period_type === 'quarterly' && (
                        <>
                            <div>
                                <label>{t('year', 'Year')}</label>
                                <input 
                                    type="number" 
                                    value={filterData.period_year} 
                                    onChange={e => handleFilterChange('period_year', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>{t('quarter', 'Quarter')}</label>
                                <select 
                                    value={filterData.period_quarter} 
                                    onChange={e => handleFilterChange('period_quarter', e.target.value)}
                                >
                                    <option value="1">{t('q1', 'Q1')}</option>
                                    <option value="2">{t('q2', 'Q2')}</option>
                                    <option value="3">{t('q3', 'Q3')}</option>
                                    <option value="4">{t('q4', 'Q4')}</option>
                                </select>
                            </div>
                        </>
                    )}

                    {filterData.period_type === 'year_to_date' && (
                        <>
                            <div>
                                <label>{t('from_date', 'From Date')}</label>
                                <input 
                                    type="date" 
                                    value={filterData.date_from} 
                                    onChange={e => handleFilterChange('date_from', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>{t('to_date', 'To Date')}</label>
                                <input 
                                    type="date" 
                                    value={filterData.date_to} 
                                    onChange={e => handleFilterChange('date_to', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label>{t('status', 'Status')}</label>
                        <select 
                            value={filterData.variance_status} 
                            onChange={e => handleFilterChange('variance_status', e.target.value)}
                        >
                            <option value="">{t('all', 'All')}</option>
                            <option value="normal">{t('normal', 'Normal')}</option>
                            <option value="warning">{t('warning', 'Warning')}</option>
                            <option value="critical">{t('critical', 'Critical')}</option>
                        </select>
                    </div>

                    <div>
                        <label>{t('alert_level', 'Alert Level')}</label>
                        <select 
                            value={filterData.alert_level} 
                            onChange={e => handleFilterChange('alert_level', e.target.value)}
                        >
                            <option value="">{t('all', 'All')}</option>
                            <option value="low">{t('low', 'Low')}</option>
                            <option value="medium">{t('medium', 'Medium')}</option>
                            <option value="high">{t('high', 'High')}</option>
                        </select>
                    </div>

                    <div>
                        <label>{t('breached', 'Breached?')}</label>
                        <select 
                            value={filterData.threshold_breached} 
                            onChange={e => handleFilterChange('threshold_breached', e.target.value)}
                        >
                            <option value="">{t('all', 'All')}</option>
                            <option value="1">{t('yes', 'Yes')}</option>
                            <option value="0">{t('no', 'No')}</option>
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={filterProcessing}
                        className={`filter-btn ${filterProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {filterProcessing ? t('filtering', 'Filtering...') : t('filter', 'Filter')}
                    </button>
                </form>

                {/* Content Area */}
                {viewMode === 'report' ? (
                    <ReportDashboard stats={stats} formatCurrency={formatCurrency} t={t} />
                ) : (
                    <div className="monitoring-grid-container">
                        <div className="overflow-x-auto">
                            <table className="monitoring-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('monitoring_date')}>
                                            <div className="flex items-center gap-1">{t('date', 'Date')} {filterData.sort_by === 'monitoring_date' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('budget_item', 'Budget Item')}</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('budgeted', 'Budgeted')}</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('actual_amount')}>
                                            <div className="flex items-center justify-end gap-1">{t('actual', 'Actual')} {filterData.sort_by === 'actual_amount' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('committed', 'Committed')}</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('available_amount')}>
                                            <div className="flex items-center justify-end gap-1">{t('available', 'Available')} {filterData.sort_by === 'available_amount' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('variance_amount')}>
                                            <div className="flex items-center justify-end gap-1">{t('variance', 'Variance')} {filterData.sort_by === 'variance_amount' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('variance_percent')}>
                                            <div className="flex items-center justify-end gap-1">{t('var_percent', 'Var %')} {filterData.sort_by === 'variance_percent' && <span className="text-gray-900">{filterData.sort_dir === 'asc' ? '↑' : '↓'}</span>}</div>
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('status', 'Status')}</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('alert', 'Alert')}</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('action_required', 'Action Required')}</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('comments', 'Comments')}</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('follow_up', 'Follow Up')}</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('actions', 'Actions')}</th>
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
                                                t={t}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="14" className="text-center py-8 text-gray-500">
                                                {t('no_records_found', 'No monitoring records found.')}
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
                                <h2>{t('monitoring_details', 'Monitoring Details')}</h2>
                                <button className="close-btn" onClick={closeDrawer}>&times;</button>
                            </div>
                            
                            <div className="drawer-content">
                                {/* Financial Summary */}
                                <div className="detail-section">
                                    <h3>{t('financial_summary', 'Financial Summary')}</h3>
                                    <div className="detail-row">
                                        <span className="label">{t('actual_amount', 'Actual Amount')}</span>
                                        <span className="value">{formatCurrency(selectedMonitoring.actual_amount)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">{t('committed', 'Committed')}</span>
                                        <span className="value">{formatCurrency(selectedMonitoring.committed_amount)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">{t('available', 'Available')}</span>
                                        <span className="value text-green-600">{formatCurrency(selectedMonitoring.available_amount)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">{t('variance', 'Variance')}</span>
                                        <span className="value text-red-600">
                                            {formatCurrency(selectedMonitoring.variance_amount)} ({selectedMonitoring.variance_percent}%)
                                        </span>
                                    </div>
                                </div>

                                {/* Status & Alerts */}
                                <div className="detail-section">
                                    <h3>{t('status_alerts', 'Status & Alerts')}</h3>
                                    <div className="detail-row">
                                        <span className="label">{t('status', 'Status')}</span>
                                        <span className={`status-badge ${selectedMonitoring.variance_status}`}>
                                            {t(selectedMonitoring.variance_status, selectedMonitoring.variance_status)}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">{t('threshold_breached', 'Threshold Breached')}</span>
                                        <span className="value">{selectedMonitoring.threshold_breached ? t('yes', 'Yes') : t('no', 'No')}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">{t('alert_level', 'Alert Level')}</span>
                                        <span className="value uppercase">{t(selectedMonitoring.alert_level?.toLowerCase() || '', selectedMonitoring.alert_level || 'None')}</span>
                                    </div>
                                </div>

                                {/* Actions & Workflow */}
                                <div className="detail-section">
                                    <h3>{t('actions_workflow', 'Actions & Workflow')}</h3>
                                    
                                    <div className="action-form">
                                        <div className="form-group">
                                            <label>{t('action_required', 'Action Required')}</label>
                                            <textarea 
                                                rows="2"
                                                value={actionData.action_required}
                                                onChange={e => setActionData('action_required', e.target.value)}
                                                disabled={selectedMonitoring.acknowledged_by}
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>{t('follow_up_date', 'Follow Up Date')}</label>
                                            <input 
                                                type="date"
                                                value={actionData.follow_up_date}
                                                onChange={e => setActionData('follow_up_date', e.target.value)}
                                                disabled={selectedMonitoring.acknowledged_by}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>{t('comments', 'Comments')}</label>
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
                                    <p>{t('monitored_by', 'Monitored by')}: {selectedMonitoring.monitor?.name || t('system', 'System')} {t('on', 'on')} {format(new Date(selectedMonitoring.monitoring_date), 'PP')}</p>
                                    {selectedMonitoring.acknowledged_by && (
                                        <p className="text-green-600 mt-1">
                                            {t('acknowledged_by', 'Acknowledged by')}: {selectedMonitoring.acknowledger?.name} {t('on', 'on')} {format(new Date(selectedMonitoring.acknowledged_date), 'PP')}
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
                                            {t('save_updates', 'Save Updates')}
                                        </button>
                                        <button 
                                            onClick={handleAcknowledge}
                                            disabled={processing}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                        >
                                            {t('acknowledge_lock', 'Acknowledge & Lock')}
                                        </button>
                                    </>
                                )}
                                {selectedMonitoring.acknowledged_by && (
                                    <span className="text-sm text-gray-500 italic self-center">
                                        {t('read_only_msg', 'This record is acknowledged and read-only.')}
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
