import React, { useState, useMemo, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import '../../../../css/backend/main.scss';

// --- Helper Functions ---
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// --- List View Component ---
const ListView = ({ items, t, localization, onCreate, onEdit, onView, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items.data || [];
        const lowerTerm = searchTerm.toLowerCase();
        return (items.data || []).filter(item => 
            (localization?.current_locale === 'ar' ? item.category?.name_ar : item.category?.name_en || '').toLowerCase().includes(lowerTerm) ||
            (localization?.current_locale === 'ar' ? item.account?.AccName_ar || item.account?.AccName : item.account?.AccName || '').toLowerCase().includes(lowerTerm) ||
            item.budget?.budget_number?.toLowerCase().includes(lowerTerm)
        );
    }, [searchTerm, items.data, localization?.current_locale]);

    const stats = useMemo(() => {
        const total = (items.data || []).length;
        const totalBudgeted = (items.data || []).reduce((acc, curr) => acc + parseInt(curr.annual_amount || 0), 0);
        const totalActual = (items.data || []).reduce((acc, curr) => acc + parseInt(curr.annual_actual || 0), 0);
        return { total, totalBudgeted, totalActual };
    }, [items.data]);

    return (
        <div className="animate-fade-slide">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">list_alt</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">{t('budget_items', 'Total Items')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">payments</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalBudgeted.toLocaleString()}</span>
                        <span className="stat-label">{t('total_budgeted', 'Total Budgeted')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">
                        <span className="material-icons-outlined">receipt_long</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalActual.toLocaleString()}</span>
                        <span className="stat-label">{t('total_actual', 'Total Actual')}</span>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder={t('search_items', 'Search items...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        {t('new_item', 'New Item')}
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>{t('budget', 'Budget')}</th>
                                <th>{t('category', 'Category')}</th>
                                <th>{t('account', 'Account')}</th>
                                <th>{t('annual_amount', 'Budgeted')}</th>
                                <th>{t('annual_actual', 'Actual')}</th>
                                <th>{t('annual_variance_percent', 'Var %')}</th>
                                <th>{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.budget?.budget_number}</td>
                                        <td>{localization?.current_locale === 'ar' ? item.category?.name_ar : item.category?.name_en}</td>
                                        <td>{localization?.current_locale === 'ar' ? item.account?.AccName_ar || item.account?.AccName : item.account?.AccName}</td>
                                        <td className="font-bold">{Number(item.annual_amount).toLocaleString()}</td>
                                        <td className="text-blue-600">{Number(item.annual_actual).toLocaleString()}</td>
                                        <td>
                                            <span className={`status-badge ${parseInt(item.annual_variance_percent) >= 0 ? 'active' : 'inactive'}`}>
                                                {item.annual_variance_percent}%
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onView(item)} title={t('view', 'View')}>
                                                    <span className="material-icons-outlined">visibility</span>
                                                </button>
                                                <button onClick={() => onEdit(item)} title={t('edit', 'Edit')}>
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(item.id)} title={t('delete', 'Delete')}>
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {t('no_items_found', 'No budget items found.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Form View Component ---
const FormView = ({ 
    mode, data, setData, errors, processing, t, localization, 
    budgets, categories, accounts, taxes,
    activeTab, setActiveTab, onSave, onBack 
}) => {
    const isEdit = mode === 'edit';

    const budgetOptions = useMemo(() => budgets.map(b => ({ value: String(b.id), label: b.budget_number })), [budgets]);
    const categoryOptions = useMemo(() => categories.map(c => ({ value: String(c.id), label: localization?.current_locale === 'ar' ? c.name_ar : c.name_en })), [categories, localization]);
    const accountOptions = useMemo(() => accounts.map(a => ({ value: String(a.AccID), label: `${a.AccCode ? a.AccCode + ' - ' : ''}${localization?.current_locale === 'ar' ? a.AccName_ar || a.AccName : a.AccName}` })), [accounts, localization]);
    const taxOptions = useMemo(() => taxes.map(tx => ({ value: String(tx.id), label: tx.name })), [taxes]);

    useEffect(() => {
        let total = 0;
        months.forEach(m => { total += parseInt(data[`${m}_amount`] || 0); });
        setData('annual_amount', total);
    }, [
        data.jan_amount, data.feb_amount, data.mar_amount, data.apr_amount, data.may_amount, data.jun_amount,
        data.jul_amount, data.aug_amount, data.sep_amount, data.oct_amount, data.nov_amount, data.dec_amount
    ]);

    useEffect(() => {
        let totalActual = 0;
        months.forEach(m => { totalActual += parseInt(data[`${m}_actual`] || 0); });
        setData('annual_actual', totalActual);
    }, [
        data.jan_actual, data.feb_actual, data.mar_actual, data.apr_actual, data.may_actual, data.jun_actual,
        data.jul_actual, data.aug_actual, data.sep_actual, data.oct_actual, data.nov_actual, data.dec_actual
    ]);

    const renderInfoFields = () => (
        <div className="modern-form-grid animate-fade-in">
            <div className="form-group">
                <label>{t('budget', 'Budget')} <span className="required">*</span></label>
                <SearchableComboBox options={budgetOptions} value={String(data.budget_id || '')} onChange={val => setData('budget_id', val)} />
                {errors.budget_id && <div className="error-message">{errors.budget_id}</div>}
            </div>
            <div className="form-group">
                <label>{t('category', 'Category')} <span className="required">*</span></label>
                <SearchableComboBox options={categoryOptions} value={String(data.category_id || '')} onChange={val => setData('category_id', val)} />
                {errors.category_id && <div className="error-message">{errors.category_id}</div>}
            </div>
            <div className="form-group">
                <label>{t('account', 'Account')} <span className="required">*</span></label>
                <SearchableComboBox options={accountOptions} value={String(data.account_id || '')} onChange={val => setData('account_id', val)} />
                {errors.account_id && <div className="error-message">{errors.account_id}</div>}
            </div>
            <div className="form-group">
                <label>{t('period_type', 'Period Type')}</label>
                <select value={data.period_type || 'monthly'} onChange={e => setData('period_type', e.target.value)}>
                    <option value="monthly">{t('monthly', 'Monthly')}</option>
                    <option value="quarterly">{t('quarterly', 'Quarterly')}</option>
                    <option value="yearly">{t('yearly', 'Yearly')}</option>
                    <option value="custom">{t('custom', 'Custom')}</option>
                </select>
            </div>
            <div className="form-group">
                <label>{t('calculation_method', 'Calculation Method')}</label>
                <select value={data.calculation_method || 'fixed'} onChange={e => setData('calculation_method', e.target.value)}>
                    <option value="fixed">{t('fixed', 'Fixed')}</option>
                    <option value="formula">{t('formula', 'Formula')}</option>
                    <option value="historical">{t('historical', 'Historical')}</option>
                    <option value="percentage">{t('percentage', 'Percentage')}</option>
                </select>
            </div>
            <div className="form-group">
                <label>{t('annual_amount', 'Annual Amount')}</label>
                <input type="number" value={data.annual_amount || 0} disabled style={{ fontWeight: 'bold', color: '#1e293b' }} />
            </div>
            <div className="form-group">
                <label>{t('tax', 'Tax')}</label>
                <SearchableComboBox options={taxOptions} value={String(data.tax_id || '')} onChange={val => setData('tax_id', val)} />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={data.tax_included || false} onChange={e => setData('tax_included', e.target.checked)} style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontWeight: '600', color: '#475569' }}>{t('tax_included', 'Tax Included')}</span>
                </label>
            </div>
        </div>
    );

    const renderMonthlyFields = () => (
        <div className="distribution-section animate-fade-in">
            <div className="section-header">
                <span className="material-icons-outlined">payments</span>
                <h3>{t('monthly_distribution', 'Monthly Allocation')}</h3>
            </div>
            <div className="month-grid">
                {months.map(m => (
                    <div key={m} className="month-input-group">
                        <label>{t(m, m.toUpperCase())}</label>
                        <input 
                            type="number" 
                            min="0"
                            step="1"
                            value={data[`${m}_amount`] || 0} 
                            onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setData(`${m}_amount`, val);
                            }} 
                        />
                    </div>
                ))}
            </div>

            <div className="section-header">
                <span className="material-icons-outlined">fact_check</span>
                <h3>{t('actuals_by_month', 'Actual Amounts')}</h3>
            </div>
            <div className="month-grid">
                {months.map(m => (
                    <div key={m} className="month-input-group">
                        <label>{t(m, m.toUpperCase())}</label>
                        <input 
                            type="number" 
                            min="0"
                            step="1"
                            value={data[`${m}_actual`] || 0} 
                            onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setData(`${m}_actual`, val);
                            }} 
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    const renderNotesFields = () => (
        <div className="modern-form-grid animate-fade-in" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
                <label>{t('notes', 'Notes')}</label>
                <textarea value={data.notes || ''} onChange={e => setData('notes', e.target.value)} rows="4" placeholder={t('enter_notes', 'General notes...')}></textarea>
            </div>
            <div className="form-group">
                <label>{t('assumptions', 'Assumptions')}</label>
                <textarea value={data.assumptions || ''} onChange={e => setData('assumptions', e.target.value)} rows="4" placeholder={t('enter_assumptions', 'Budget assumptions...')}></textarea>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="tabs-navigation">
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                        <span className="material-icons-outlined">info</span> {t('general_info', 'General Info')}
                    </button>
                    <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>
                        <span className="material-icons-outlined">calendar_month</span> {t('monthly_distribution', 'Monthly Data')}
                    </button>
                    <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                        <span className="material-icons-outlined">description</span> {t('notes', 'Notes')}
                    </button>
                </div>

                <form onSubmit={onSave}>
                    {activeTab === 'info' && renderInfoFields()}
                    {activeTab === 'monthly' && renderMonthlyFields()}
                    {activeTab === 'notes' && renderNotesFields()}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onBack}>
                            {t('cancel', 'Cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing} style={{ padding: '0.75rem 2.5rem', borderRadius: '10px', fontWeight: '700' }}>
                            <span className="material-icons-outlined" style={{ marginRight: '0.5rem' }}>save</span>
                            {processing ? t('saving', 'Saving...') : t('save_item', 'Save Item')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Details View Component ---
const DetailsView = ({ item, t, localization, onBack, onEdit }) => {
    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h2 className="text-2xl font-bold">{t('item_details', 'Item Details')}</h2>
                        <p className="text-gray-500">{item.budget?.budget_number} - {localization?.current_locale === 'ar' ? item.account?.AccName_ar : item.account?.AccName}</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => onEdit(item)}>
                        <span className="material-icons-outlined">edit</span> {t('edit', 'Edit')}
                    </button>
                </div>

                <div className="details-grid">
                    <div className="detail-item">
                        <span className="label">{t('budget', 'Budget')}</span>
                        <span className="value">{item.budget?.budget_number}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">{t('category', 'Category')}</span>
                        <span className="value">{localization?.current_locale === 'ar' ? item.category?.name_ar : item.category?.name_en}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">{t('annual_amount', 'Budgeted')}</span>
                        <span className="value text-blue-600">{Number(item.annual_amount).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">{t('annual_actual', 'Actual')}</span>
                        <span className="value text-green-600">{Number(item.annual_actual).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">{t('annual_variance', 'Variance')}</span>
                        <span className={`value ${parseInt(item.annual_variance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(item.annual_variance).toLocaleString()} ({item.annual_variance_percent}%)
                        </span>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">{t('amounts_by_month', 'Monthly Breakdown')}</h3>
                    <div className="table-responsive">
                        <table className="professional-table small">
                            <thead>
                                <tr>
                                    <th>{t('type', 'Type')}</th>
                                    {months.map(m => <th key={m}>{t(m, m.toUpperCase())}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-bold">{t('annual_amount', 'Budgeted')}</td>
                                    {months.map(m => <td key={m}>{Number(item[`${m}_amount`] || 0).toLocaleString()}</td>)}
                                </tr>
                                <tr>
                                    <td className="font-bold text-blue-600">{t('annual_actual', 'Actual')}</td>
                                    {months.map(m => <td key={m}>{Number(item[`${m}_actual`] || 0).toLocaleString()}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const BudgetItems = ({ items, budgets, categories, accounts, taxes }) => {
    const { props } = usePage();
    const { localization, flash } = props;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`BudgetItems.${key}`] || fallback;

    const [mode, setMode] = useState('list');
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('info');

    const initialState = {
        id: null, budget_id: '', category_id: '', account_id: '', period_type: 'monthly',
        annual_amount: 0, annual_actual: 0, annual_variance: 0, annual_variance_percent: 0,
        jan_amount: 0, feb_amount: 0, mar_amount: 0, apr_amount: 0, may_amount: 0, jun_amount: 0,
        jul_amount: 0, aug_amount: 0, sep_amount: 0, oct_amount: 0, nov_amount: 0, dec_amount: 0,
        jan_actual: 0, feb_actual: 0, mar_actual: 0, apr_actual: 0, may_actual: 0, jun_actual: 0,
        jul_actual: 0, aug_actual: 0, sep_actual: 0, oct_actual: 0, nov_actual: 0, dec_actual: 0,
        calculation_method: 'fixed', calculation_formula: '', basis_amount: 0, percentage_rate: 0,
        tax_id: '', tax_included: false, tax_amount: 0, notes: '', assumptions: ''
    };

    const { data, setData, post, put, processing, errors, reset, transform } = useForm(initialState);

    useEffect(() => {
        if (flash?.success) {
            setMode('list');
            setSelectedItem(null);
            reset();
        }
    }, [flash]);

    const handleCreate = () => {
        reset();
        setMode('create');
        setActiveTab('info');
    };

    const handleEdit = (item) => {
        setData(item);
        setSelectedItem(item);
        setMode('edit');
        setActiveTab('info');
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setMode('details');
    };

    const handleDelete = (id) => {
        if (confirm(t('delete_confirm', 'Are you sure you want to delete this item?'))) {
            router.delete(route('admin.budget.items.destroy', id));
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        transform((dataToTransform) => {
            // Logic to calculate variance and other fields before sending
            const budget = parseInt(dataToTransform.annual_amount || 0);
            const actual = parseInt(dataToTransform.annual_actual || 0);
            const variance = budget - actual;
            const variancePercent = budget !== 0 ? Math.round((variance / budget) * 100) : 0;
            
            return {
                ...dataToTransform,
                annual_variance: variance,
                annual_variance_percent: variancePercent
            };
        });

        if (mode === 'create') {
            post(route('admin.budget.items.store'), {
                onSuccess: () => { setMode('list'); reset(); }
            });
        } else {
            put(route('admin.budget.items.update', data.id), {
                onSuccess: () => { setMode('list'); reset(); }
            });
        }
    };

    return (
        <AdminLayout activeMenu="Budget">
            <Head title={t('budget_items', 'Budget Items Management')} />
            
            <div className="budget-items-container">
                <div className="page-header">
                    <h1>
                        {mode === 'list' && t('budget_items', 'Budget Items')}
                        {mode === 'create' && t('new_item', 'New Budget Item')}
                        {mode === 'edit' && t('edit_item', 'Edit Budget Item')}
                        {mode === 'details' && t('item_details', 'Budget Item Details')}
                    </h1>
                    {mode !== 'list' && (
                        <button className="btn btn-secondary" onClick={() => setMode('list')}>
                            <span className="material-icons-outlined">arrow_back</span>
                            {t('back_to_list', 'Back to List')}
                        </button>
                    )}
                </div>

                {mode === 'list' && (
                    <ListView 
                        items={items} t={t} localization={localization}
                        onCreate={handleCreate} onEdit={handleEdit} onView={handleView} onDelete={handleDelete}
                    />
                )}

                {(mode === 'create' || mode === 'edit') && (
                    <FormView 
                        mode={mode} data={data} setData={setData} errors={errors} processing={processing}
                        t={t} localization={localization} budgets={budgets} categories={categories}
                        accounts={accounts} taxes={taxes}
                        activeTab={activeTab} setActiveTab={setActiveTab}
                        onSave={handleSave} onBack={() => setMode('list')}
                    />
                )}

                {mode === 'details' && (
                    <DetailsView 
                        item={selectedItem} t={t} localization={localization}
                        onBack={() => setMode('list')} onEdit={handleEdit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default BudgetItems;
