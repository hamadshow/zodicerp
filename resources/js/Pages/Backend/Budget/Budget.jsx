import React, { useState, useMemo, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import Table from '../components/Table';
import '../../../../css/backend/main.scss';

// --- Helper Functions ---
const calculateBudgetTotals = (items) => {
    let totalRev = 0;
    let totalExp = 0;
    
    items.forEach(item => {
        // In a real app, we'd check category type. 
        // For this implementation, we'll assume all are expenses unless specified.
        totalExp += parseFloat(item.annual_amount || 0);
    });

    return {
        total_revenue: totalRev,
        total_expense: totalExp,
        net_surplus_deficit: totalRev - totalExp
    };
};

// --- List View Component ---
const ListView = ({ budgets, t, localization, onCreate, onEdit, onView, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const filteredBudgets = useMemo(() => {
        if (!searchTerm) return budgets.data;
        const lowerTerm = searchTerm.toLowerCase();
        return budgets.data.filter(b => 
            b.budget_number.toLowerCase().includes(lowerTerm) ||
            (localization?.current_locale === 'ar' ? b.budget_name_ar : b.budget_name_en).toLowerCase().includes(lowerTerm) ||
            b.fiscal_year.toString().includes(lowerTerm)
        );
    }, [searchTerm, budgets.data, localization?.current_locale]);

    const handleRowSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredBudgets.map(b => b.id));
        }
        setSelectAll(!selectAll);
    };

    const columns = useMemo(() => [
        { 
            header: t('number', 'الرقم'), 
            key: 'budget_number', 
            sortable: true,
            render: (budget) => <span style={{ fontWeight: 600, color: '#475569' }}>{budget.budget_number}</span>
        },
        { 
            header: t('name', 'NAME'), 
            key: 'name', 
            sortable: true,
            render: (budget) => localization?.current_locale === 'ar' ? budget.budget_name_ar : budget.budget_name_en
        },
        { header: t('fiscal_year', 'السنة المالية'), key: 'fiscal_year', sortable: true },
        { 
            header: t('department', 'القسم'), 
            key: 'department', 
            render: (budget) => (localization?.current_locale === 'ar' ? budget.department?.name_ar : budget.department?.name_en) || '-'
        },
        { 
            header: t('status', 'الحالة'), 
            key: 'status', 
            sortable: true,
            render: (budget) => (
                <span className={`badge ${budget.status === 'approved' ? 'badge-approved' : 'badge-draft'}`}>
                    {t(budget.status, budget.status)}
                </span>
            )
        },
        { 
            header: t('total_expense', 'إجمالي المصروفات'), 
            key: 'total_expense', 
            sortable: true,
            render: (budget) => <span style={{ fontWeight: 600 }}>{Number(budget.total_expense).toLocaleString()}</span>
        }
    ], [localization?.current_locale]);

    const tableData = useMemo(() => {
        return filteredBudgets.map(b => ({
            ...b,
            selected: selectedIds.includes(b.id)
        }));
    }, [filteredBudgets, selectedIds]);

    const stats = useMemo(() => {
        const total = budgets.data.length;
        const approved = budgets.data.filter(b => b.status === 'approved').length;
        const draft = total - approved;
        return { total, approved, draft };
    }, [budgets.data]);

    return (
        <div className="animate-fade-slide">
            {/* Quick Stats */}
            <section className="stats-grid">
                <div className="stat-card card-total">
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">{t('total_budgets', 'Total Budgets')}</span>
                    </div>
                    <div className="stat-icon">
                        <i className="fa-solid fa-wallet"></i>
                    </div>
                </div>
                <div className="stat-card card-approved">
                    <div className="stat-info">
                        <span className="stat-value">{stats.approved}</span>
                        <span className="stat-label">{t('approved', 'Approved')}</span>
                    </div>
                    <div className="stat-icon">
                        <i className="fa-solid fa-circle-check"></i>
                    </div>
                </div>
                <div className="stat-card card-draft">
                    <div className="stat-info">
                        <span className="stat-value">{stats.draft}</span>
                        <span className="stat-label">{t('draft', 'Draft')}</span>
                    </div>
                    <div className="stat-icon">
                        <i className="fa-solid fa-file-pen"></i>
                    </div>
                </div>
            </section>

            <section className="actions-bar">
                <div className="search-wrapper">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('search_budgets', 'بحث في الميزانيات...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-add" onClick={onCreate}>
                    <i className="fa-solid fa-plus"></i>
                    <span>{t('new_budget', 'ميزانية جديدة')}</span>
                </button>
            </section>

            <section className="table-container">
                <Table 
                    tableData={tableData}
                    columns={columns}
                    handleRowSelect={handleRowSelect}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    onView={(budget) => onView(budget)}
                    onEdit={(budget) => onEdit(budget)}
                    onDelete={(budget) => onDelete(budget.id)}
                    viewTitle={t('view', 'عرض')}
                    editTitle={t('edit', 'تعديل')}
                    deleteTitle={t('delete', 'حذف')}
                />
            </section>
        </div>
    );
};

// --- Form View Component ---
const FormView = ({ 
    data, setData, errors, processing, t, localization, 
    departments, currencies, categories, accounts,
    activeTab, setActiveTab, onSave, onBack 
}) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const categoryOptions = useMemo(() => 
        categories.map(c => ({
            value: String(c.id),
            label: (localization?.current_locale === 'ar' ? c.name_ar : c.name_en) || c.name || `Category ${c.id}`
        })), 
    [categories, localization?.current_locale]);

    const accountOptions = useMemo(() => 
        accounts.map(a => ({
            value: String(a.AccID),
            label: `${a.AccCode ? a.AccCode + ' - ' : ''}${localization?.current_locale === 'ar' ? a.AccName_ar || a.AccName : a.AccName}`
        })), 
    [accounts, localization?.current_locale]);

    const updateItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        if (field === 'basis_account_id') {
            newItems[index].calculation_formula = `BASIS_ACCOUNT:${value}`;
        }

        // Handle Monthly amount changes (Manual mode)
        if (field.endsWith('_amount') && field !== 'annual_amount') {
            let total = 0;
            months.forEach(m => {
                total += parseFloat(newItems[index][`${m}_amount`] || 0);
            });
            newItems[index].annual_amount = total;
        }

        // Handle Annual amount change (Equal distribution mode)
        if (field === 'annual_amount' && newItems[index].calculation_method === 'equal') {
            const annual = parseFloat(value || 0);
            const monthly = annual / 12;
            months.forEach(m => {
                newItems[index][`${m}_amount`] = monthly.toFixed(2);
            });
        }

        // If switching method to equal, distribute current annual amount
        if (field === 'calculation_method' && value === 'equal') {
            const annual = parseFloat(newItems[index].annual_amount || 0);
            const monthly = annual / 12;
            months.forEach(m => {
                newItems[index][`${m}_amount`] = monthly.toFixed(2);
            });
        }

        // Recalculate dependent items (percentage based)
        const itemMap = new Map();
        newItems.forEach(item => { if (item.account_id) itemMap.set(String(item.account_id), item); });

        const recalculatedItems = newItems.map(item => {
            if (item.calculation_method === 'percentage' && item.basis_account_id && item.percentage_rate) {
                const basisItem = itemMap.get(String(item.basis_account_id));
                if (basisItem) {
                    const rate = parseFloat(item.percentage_rate) / 100;
                    let annualTotal = 0;
                    months.forEach(m => {
                        const basisAmount = parseFloat(basisItem[`${m}_amount`] || 0);
                        const calculatedAmount = basisAmount * rate;
                        item[`${m}_amount`] = calculatedAmount;
                        annualTotal += calculatedAmount;
                    });
                    item.annual_amount = annualTotal;
                }
            }
            return item;
        });

        setData('items', recalculatedItems);
    };

    const addItem = () => {
        setData('items', [...data.items, {
            id: null, category_id: '', account_id: '', calculation_method: 'fixed',
            basis_account_id: '', percentage_rate: '', annual_amount: 0,
            jan_amount: 0, feb_amount: 0, mar_amount: 0, apr_amount: 0, may_amount: 0, jun_amount: 0,
            jul_amount: 0, aug_amount: 0, sep_amount: 0, oct_amount: 0, nov_amount: 0, dec_amount: 0,
        }]);
    };

    const renderInfoTab = () => (
        <div className="budget-form-grid animate-fade-in">
            <div className="form-group">
                <label>{t('budget_number', 'Budget Number')} <span className="required">*</span></label>
                <input type="text" value={data.budget_number || ''} readOnly />
                {errors.budget_number && <div className="error-message">{errors.budget_number}</div>}
            </div>
            <div className="form-group">
                <label>{t('fiscal_year', 'Fiscal Year')} <span className="required">*</span></label>
                <input type="number" value={data.fiscal_year || ''} onChange={e => setData('fiscal_year', e.target.value)} />
                {errors.fiscal_year && <div className="error-message">{errors.fiscal_year}</div>}
            </div>
            <div className="form-group">
                <label>{t('name_ar', 'Budget Name (AR)')} <span className="required">*</span></label>
                <input type="text" placeholder={t('enter_name_ar', 'أدخل اسم الميزانية بالعربية')} value={data.budget_name_ar || ''} onChange={e => setData('budget_name_ar', e.target.value)} />
                {errors.budget_name_ar && <div className="error-message">{errors.budget_name_ar}</div>}
            </div>
            <div className="form-group">
                <label>{t('name_en', 'Budget Name (EN)')} <span className="required">*</span></label>
                <input type="text" placeholder={t('enter_name_en', 'Enter name in English')} style={{ direction: localization?.current_locale === 'ar' ? 'ltr' : 'inherit', textAlign: localization?.current_locale === 'ar' ? 'right' : 'inherit' }} value={data.budget_name_en || ''} onChange={e => setData('budget_name_en', e.target.value)} />
                {errors.budget_name_en && <div className="error-message">{errors.budget_name_en}</div>}
            </div>
            <div className="form-group">
                <label>{t('budget_type', 'Budget Type')}</label>
                <select value={data.budget_type || ''} onChange={e => setData('budget_type', e.target.value)}>
                    <option value="annual">{t('annual', 'Annual')}</option>
                    <option value="quarterly">{t('quarterly', 'Quarterly')}</option>
                    <option value="monthly">{t('monthly', 'Monthly')}</option>
                </select>
            </div>
            <div className="form-group">
                <label>{t('scope_type', 'Scope Type')}</label>
                <select value={data.scope_type || ''} onChange={e => setData('scope_type', e.target.value)}>
                    <option value="department">{t('department', 'Department')}</option>
                    <option value="project">{t('project', 'Project')}</option>
                    <option value="cost_center">{t('cost_center', 'Cost Center')}</option>
                </select>
            </div>
            <div className="form-group">
                <label>{t('department', 'Department')}</label>
                <select value={data.department_id || ''} onChange={e => setData('department_id', e.target.value)}>
                    <option value="">{t('select_department', 'Select')}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{localization?.current_locale === 'ar' ? d.name_ar : d.name_en}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>{t('currency', 'Currency')}</label>
                <select value={data.currency_id || ''} onChange={e => setData('currency_id', e.target.value)}>
                    <option value="">{t('select_currency', 'Select')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
            </div>
        </div>
    );

    const renderItemsTab = () => (
        <div className="items-section animate-fade-in">
            <div className="section-bar">
                <h2 className="section-title">{t('budget_items_detailed', 'بنود الميزانية تفصيلياً')}</h2>
                <button type="button" className="btn-add-row" onClick={addItem}>
                    <i className="fa-solid fa-plus"></i> {t('add_item', 'إضافة بند')}
                </button>
            </div>
            <div className="table-responsive-wrapper">
                <table className="items-table">
                    <thead>
                        <tr>
                            <th className="col-category">{t('category', 'الفئة')}</th>
                            <th className="col-account">{t('account', 'الحساب')}</th>
                            <th className="col-method">{t('method', 'الطريقة')}</th>
                            <th className="col-annual">{t('annual_amount', 'السنوي')}</th>
                            {months.map(m => <th key={m} className="col-month">{t(m, m.toUpperCase())}</th>)}
                            <th className="col-action">{t('action', 'إجراء')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, index) => (
                            <tr key={index}>
                                <td className="col-category">
                                    <SearchableComboBox
                                        options={categoryOptions}
                                        value={item.category_id ? String(item.category_id) : ''}
                                        onChange={(val) => updateItem(index, 'category_id', val)}
                                        placeholder={t('select_category', 'اختر الفئة الرئيسية...')}
                                    />
                                </td>
                                <td className="col-account">
                                    <SearchableComboBox
                                        options={accountOptions}
                                        value={item.account_id ? String(item.account_id) : ''}
                                        onChange={(val) => updateItem(index, 'account_id', val)}
                                        placeholder={t('select_account', 'اختر الحساب الفرعي...')}
                                    />
                                </td>
                                <td className="col-method">
                                    <select 
                                        className="table-control" 
                                        value={item.calculation_method || 'fixed'} 
                                        onChange={e => updateItem(index, 'calculation_method', e.target.value)}
                                    >
                                        <option value="fixed">{t('manual', 'يدوي')}</option>
                                        <option value="equal">{t('equal', 'بالتساوي')}</option>
                                        <option value="percentage">{t('percentage', '%')}</option>
                                    </select>
                                </td>
                                <td className="col-annual">
                                    <input 
                                        type="number" 
                                        className={`table-control input-number-center ${item.calculation_method !== 'equal' ? 'input-readonly' : ''}`} 
                                        value={item.annual_amount || 0} 
                                        onChange={e => updateItem(index, 'annual_amount', e.target.value)}
                                        readOnly={item.calculation_method !== 'equal' && item.calculation_method !== 'percentage'}
                                    />
                                </td>
                                {months.map(m => (
                                    <td key={m} className="col-month">
                                        <input 
                                            type="number" 
                                            className={`table-control input-number-center ${item.calculation_method === 'equal' ? 'input-readonly' : ''}`} 
                                            value={item[`${m}_amount`] || 0} 
                                            onChange={e => updateItem(index, `${m}_amount`, e.target.value)}
                                            readOnly={item.calculation_method === 'equal'}
                                        />
                                    </td>
                                ))}
                                <td className="col-action">
                                    <button type="button" className="btn-row-delete" onClick={() => setData('items', data.items.filter((_, i) => i !== index))}>
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bottom-settings">
                <label className="checkbox-item">
                    <input 
                        type="checkbox" 
                        checked={data.allow_over_budget || false} 
                        onChange={e => setData('allow_over_budget', e.target.checked)}
                    /> 
                    {t('allow_over_budget', 'السماح بتجاوز الميزانية')}
                </label>
                <label className="checkbox-item">
                    <input 
                        type="checkbox" 
                        checked={data.require_approval !== false} 
                        onChange={e => setData('require_approval', e.target.checked)}
                    /> 
                    {t('require_approval', 'يتطلب موافقة الاعتماد')}
                </label>
            </div>
        </div>
    );

    const renderSummaryTab = () => {
        const totals = calculateBudgetTotals(data.items);
        return (
            <div className="comparison-panel animate-fade-in">
                <div className="amount-column">
                    <h3>{t('total_revenue', 'Total Revenue')}</h3>
                    <div className="amount-display text-green-600">{totals.total_revenue.toLocaleString()}</div>
                </div>
                <div className="amount-column">
                    <h3>{t('total_expense', 'Total Expense')}</h3>
                    <div className="amount-display text-red-600">{totals.total_expense.toLocaleString()}</div>
                </div>
                <div className={`amount-column ${totals.net_surplus_deficit >= 0 ? 'favorable' : 'unfavorable'}`}>
                    <h3>{t('net_surplus_deficit', 'Net Surplus/Deficit')}</h3>
                    <div className="amount-display">
                        {totals.net_surplus_deficit.toLocaleString()}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-slide">
            <div className="budget-card">
                <div className="forecast-tabs">
                    <button type="button" className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                        <i className="fa-solid fa-circle-info"></i> {t('general_info', 'معلومات عامة')}
                    </button>
                    <button type="button" className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
                        <i className="fa-solid fa-list-check"></i> {t('budget_items', 'بنود الميزانية')}
                    </button>
                    <button type="button" className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
                        <i className="fa-solid fa-file-invoice"></i> {t('summary', 'ملخص')}
                    </button>
                </div>

                <div className="budget-card__content">
                    <form onSubmit={onSave}>
                        {activeTab === 'info' && renderInfoTab()}
                        {activeTab === 'items' && renderItemsTab()}
                        {activeTab === 'summary' && renderSummaryTab()}

                        <div className="budget-module__actions">
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                <i className="fa-solid fa-floppy-disk"></i>
                                {processing ? t('saving', 'Saving...') : t('save_budget', 'حفظ الميزانية')}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                {t('cancel', 'إلغاء')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Details View Component ---
const DetailsView = ({ budget, t, localization, onEdit }) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    return (
        <div className="animate-fade-slide">
            <div className="budget-card">
                <div className="budget-card__header">
                    <div>
                        <h2>{budget.budget_number}</h2>
                        <p className="subtitle">{localization?.current_locale === 'ar' ? budget.budget_name_ar : budget.budget_name_en}</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => onEdit(budget)}>
                        <span className="material-icons-outlined">edit</span> {t('edit', 'Edit')}
                    </button>
                </div>

                <div className="budget-dashboard">
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-icon primary">
                                <span className="material-icons-outlined">calendar_today</span>
                            </div>
                            <div className="kpi-content">
                                <div className="kpi-label">{t('fiscal_year', 'Fiscal Year')}</div>
                                <div className="kpi-value">{budget.fiscal_year}</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon warning">
                                <span className="material-icons-outlined">info</span>
                            </div>
                            <div className="kpi-content">
                                <div className="kpi-label">{t('status', 'Status')}</div>
                                <div className="kpi-value">
                                    <span className={`status-pill ${budget.status === 'approved' ? 'success' : 'warning'}`}>
                                        {t(budget.status, budget.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon success">
                                <span className="material-icons-outlined">business</span>
                            </div>
                            <div className="kpi-content">
                                <div className="kpi-label">{t('department', 'Department')}</div>
                                <div className="kpi-value">{(localization?.current_locale === 'ar' ? budget.department?.name_ar : budget.department?.name_en) || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <div className="budget-card__header">
                        <h2>{t('budget_items', 'Budget Items')}</h2>
                    </div>
                    <div className="budget-table-container">
                        <table className="small">
                            <thead>
                                <tr>
                                    <th>{t('category', 'Category')}</th>
                                    <th>{t('account', 'Account')}</th>
                                    <th>{t('annual', 'Annual')}</th>
                                    {months.map(m => <th key={m}>{t(m, m.toUpperCase())}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {budget.items?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{localization?.current_locale === 'ar' ? item.category?.name_ar : item.category?.name_en}</td>
                                        <td>{localization?.current_locale === 'ar' ? item.account?.AccName_ar || item.account?.AccName : item.account?.AccName}</td>
                                        <td className="font-bold">{Number(item.annual_amount).toLocaleString()}</td>
                                        {months.map(m => <td key={m}>{Number(item[`${m}_amount`] || 0).toLocaleString()}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Budget Component ---
const Budget = ({ budgets, departments, branches, currencies, categories, accounts, projects, costCenters }) => {
    const { props } = usePage();
    const { localization, flash } = props;
    const translations = localization?.translations || {};

    const t = (key, fallback) => translations[`Budget.${key}`] || fallback;

    const [mode, setMode] = useState('list'); // list, create, edit, details
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [activeTab, setActiveTab] = useState('info');

    const initialState = {
        id: null, budget_number: '', budget_name_ar: '', budget_name_en: '', description: '',
        budget_type: 'annual', fiscal_year: new Date().getFullYear(), start_date: '', end_date: '',
        scope_type: 'department', department_id: '', project_id: '', cost_center_id: '', branch_id: '',
        currency_id: '', exchange_rate: 1.0, status: 'draft', 
        allow_over_budget: false, require_approval: true,
        items: []
    };

    const { data, setData, post, put, processing, errors, reset, transform } = useForm(initialState);

    const { accountIdToCode, accountCodeToId } = useMemo(() => {
        const idToCode = {};
        const codeToId = {};
        accounts.forEach(a => {
            const code = String(a.AccCode || a.AccID);
            idToCode[a.AccID] = code;
            codeToId[code] = a.AccID;
        });
        return { accountIdToCode: idToCode, accountCodeToId: codeToId };
    }, [accounts]);

    useEffect(() => {
        if (flash?.success) {
            setMode('list');
            setSelectedBudget(null);
            reset();
        }
    }, [flash]);

    const handleCreate = () => {
        reset();
        setData({ ...initialState, budget_number: `BUD-${new Date().getTime()}` });
        setMode('create');
        setActiveTab('info');
    };

    const handleEdit = (budget) => {
        const parsedItems = (budget.items || []).map(item => ({
            ...item,
            account_id: accountIdToCode[item.account_id] || item.account_id,
            basis_account_id: item.calculation_formula?.startsWith('BASIS_ACCOUNT:') ? item.calculation_formula.split(':')[1] : ''
        }));

        setData({
            ...budget,
            start_date: budget.start_date ? budget.start_date.split('T')[0] : '',
            end_date: budget.end_date ? budget.end_date.split('T')[0] : '',
            items: parsedItems
        });
        setSelectedBudget(budget);
        setMode('edit');
        setActiveTab('info');
    };

    const handleView = (budget) => {
        setSelectedBudget(budget);
        setMode('details');
    };

    const handleDelete = (id) => {
        if (confirm(t('delete_confirm', 'Are you sure you want to delete this budget?'))) {
            router.delete(route('admin.budget.destroy', id));
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        transform((dataToTransform) => {
            const totals = calculateBudgetTotals(dataToTransform.items);
            const itemsWithIds = dataToTransform.items.map(item => ({
                ...item,
                account_id: accountCodeToId[item.account_id] || item.account_id,
                calculation_formula: item.calculation_method === 'percentage' && item.basis_account_id 
                    ? `BASIS_ACCOUNT:${accountCodeToId[item.basis_account_id] || item.basis_account_id}` 
                    : item.calculation_formula
            }));
            return { ...dataToTransform, items: itemsWithIds, ...totals };
        });

        if (mode === 'create') {
            post(route('admin.budget.store'), {
                onSuccess: () => {
                    setMode('list');
                    setSelectedBudget(null);
                    reset();
                }
            });
        } else {
            put(route('admin.budget.update', data.id), {
                onSuccess: () => {
                    setMode('list');
                    setSelectedBudget(null);
                    reset();
                }
            });
        }
    };

    return (
        <AdminLayout activeMenu="Budget">
            <Head title={t('budget_management', 'Budget Management')} />
            
            <div className="budget-module">
                <div className="budget-module__header">
                    <h1 className="page-title">
                        {mode === 'list' && t('budget_management', 'إدارة الميزانية')}
                        {mode === 'create' && t('create_new_budget', 'إنشاء ميزانية جديدة')}
                        {mode === 'edit' && t('edit_budget', 'تعديل الميزانية')}
                        {mode === 'details' && t('budget_details', 'تفاصيل الميزانية')}
                    </h1>
                    <div className="budget-module__actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                        {mode !== 'list' && (
                            <button className="btn-back" onClick={() => setMode('list')}>
                                <span>Back to List</span>
                                <i className="fa-solid fa-arrow-left"></i>
                            </button>
                        )}
                    </div>
                </div>

                {mode === 'list' && (
                    <ListView 
                        budgets={budgets} t={t} localization={localization}
                        onCreate={handleCreate} onEdit={handleEdit} onView={handleView} onDelete={handleDelete}
                    />
                )}

                {(mode === 'create' || mode === 'edit') && (
                    <FormView 
                        mode={mode} data={data} setData={setData} errors={errors} processing={processing}
                        t={t} localization={localization} departments={departments} branches={branches}
                        currencies={currencies} categories={categories} accounts={accounts}
                        projects={projects} costCenters={costCenters}
                        activeTab={activeTab} setActiveTab={setActiveTab}
                        onSave={handleSave} onBack={() => setMode('list')}
                    />
                )}

                {mode === 'details' && (
                    <DetailsView 
                        budget={selectedBudget} t={t} localization={localization}
                        onBack={() => setMode('list')} onEdit={handleEdit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default Budget;
