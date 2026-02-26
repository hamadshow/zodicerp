import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import '../../../../css/backend/main.scss';


const Budget = ({ budgets, departments, branches, currencies, categories, accounts, projects, costCenters }) => {
    const [viewMode, setViewMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('info'); // info, items, summary

    const initialState = {
        id: null,
        budget_number: '',
        budget_name_ar: '',
        budget_name_en: '',
        description: '',
        budget_type: 'annual',
        fiscal_year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        scope_type: 'department',
        department_id: '',
        project_id: '',
        cost_center_id: '',
        branch_id: '',
        currency_id: '',
        exchange_rate: 1.0,
        status: 'draft',
        version: 1,
        is_current: false,
        is_template: false,
        variance_threshold: 10,
        allow_over_budget: false,
        require_approval_over_budget: true,
        items: []
    };

    const { data, setData, post, put, processing, errors } = useForm(initialState);

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const categoryOptions = useMemo(() => 
        categories.map(c => ({
            value: String(c.id),
            label: c.name_en || c.name_ar || c.name || `Category ${c.id}`
        })), 
    [categories]);

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

    const accountOptions = useMemo(() => 
        accounts
            .map(a => ({
                value: String(a.AccID),
                label: `${a.AccCode ? a.AccCode + ' - ' : ''}${a.AccName}`
            })), 
    [accounts]);

    // --- List View Components ---
    const BudgetList = () => (
        <div className="budget-list-card animate-fade-slide">
            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Number</th>
                            <th>Name (EN)</th>
                            <th>Fiscal Year</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Total Revenue</th>
                            <th>Total Expense</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.data.map(budget => (
                            <tr key={budget.id} onClick={() => handleEdit(budget)} style={{ cursor: 'pointer' }}>
                                <td>{budget.budget_number}</td>
                                <td>{budget.budget_name_en}</td>
                                <td>{budget.fiscal_year}</td>
                                <td>{budget.department?.name_en || '-'}</td>
                                <td>
                                    <span className={`badge ${budget.status === 'approved' ? 'active' : 'inactive'}`}>
                                        {budget.status}
                                    </span>
                                </td>
                                <td>{Number(budget.total_revenue).toLocaleString()}</td>
                                <td>{Number(budget.total_expense).toLocaleString()}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(budget); }}>
                                            <i className="material-icons">edit</i>
                                        </button>
                                        <button className="btn-icon text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(budget.id); }}>
                                            <i className="material-icons">delete</i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination controls would go here */}
        </div>
    );

    // --- Form Actions ---
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this budget?')) {
            router.delete(route('admin.budgets.destroy', id));
        }
    };

    const handleCreate = () => {
        setData({
            ...initialState,
            budget_number: `BUD-${new Date().getTime()}`
        });
        setViewMode('create');
        setActiveTab('info');
    };

    const handleEdit = (budget) => {
        // Parse items to extract basis_account_id from formula if needed
        const parsedItems = (budget.items || []).map(item => {
             let basisId = '';
             // If percentage method, try to extract basis ID from formula "BASIS_ACCOUNT:123"
             if (item.calculation_method === 'percentage' && item.calculation_formula && item.calculation_formula.startsWith('BASIS_ACCOUNT:')) {
                 const rawId = item.calculation_formula.split(':')[1];
                 basisId = accountIdToCode[rawId] || rawId;
             }
             
             return {
                 ...item,
                 account_id: accountIdToCode[item.account_id] || item.account_id,
                 basis_account_id: basisId
             };
        });

        setData({
            ...budget,
            start_date: budget.start_date ? budget.start_date.split('T')[0] : '',
            end_date: budget.end_date ? budget.end_date.split('T')[0] : '',
            items: parsedItems
        });
        setViewMode('edit');
        setActiveTab('info');
    };

    const handleSave = (e) => {
        e.preventDefault();
        // Recalculate totals before save
        const totals = calculateBudgetTotals(data.items);

        const itemsWithIds = data.items.map(item => {
            let formula = item.calculation_formula;
            if (item.calculation_method === 'percentage' && item.basis_account_id) {
                 const basisId = accountCodeToId[item.basis_account_id] || item.basis_account_id;
                 formula = `BASIS_ACCOUNT:${basisId}`;
            }

            return {
                ...item,
                account_id: accountCodeToId[item.account_id] || item.account_id,
                calculation_formula: formula
            };
        });

        const finalData = { ...data, items: itemsWithIds, ...totals };

        if (viewMode === 'create') {
            post(route('admin.budgets.store'), {
                data: finalData,
                onSuccess: () => setViewMode('list')
            });
        } else {
            put(route('admin.budgets.update', data.id), {
                data: finalData,
                onSuccess: () => setViewMode('list')
            });
        }
    };

    // --- Item Management ---
    const recalculateDependentItems = (items) => {
        // Map for fast lookup of source items by account_id
        const itemMap = new Map();
        items.forEach(item => {
            if (item.account_id) {
                itemMap.set(String(item.account_id), item);
            }
        });

        return items.map(item => {
            // Logic for Percentage Method
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
    };

    const addItem = () => {
        const newItem = {
            id: null, // New item
            category_id: '',
            account_id: '',
            calculation_method: 'fixed',
            basis_account_id: '',
            percentage_rate: '',
            annual_amount: 0,
            jan_amount: 0, feb_amount: 0, mar_amount: 0, apr_amount: 0, may_amount: 0, jun_amount: 0,
            jul_amount: 0, aug_amount: 0, sep_amount: 0, oct_amount: 0, nov_amount: 0, dec_amount: 0,
        };
        setData('items', [...data.items, newItem]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        // Sync basis_account_id to calculation_formula for storage
        if (field === 'basis_account_id') {
            newItems[index].calculation_formula = `BASIS_ACCOUNT:${value}`;
        }

        // 1. Calculate Annual for CURRENT item if monthly changes (and it's fixed or formula overridden)
        if (field.endsWith('_amount')) {
            let total = 0;
            months.forEach(m => {
                total += parseFloat(newItems[index][`${m}_amount`] || 0);
            });
            newItems[index].annual_amount = total;
        }

        // 2. Trigger global recalculation for dependencies
        // We pass the updated items to the recalculation logic
        const recalculatedItems = recalculateDependentItems(newItems);

        setData('items', recalculatedItems);
    };

    const calculateBudgetTotals = (items) => {
        // Simplified calculation logic
        // In real app, distinguish revenue/expense categories
        let totalRev = 0;
        let totalExp = 0;
        
        items.forEach(item => {
            // Check category type if available, otherwise assume expense for demo
            totalExp += parseFloat(item.annual_amount || 0);
        });

        return {
            total_revenue: totalRev,
            total_expense: totalExp,
            net_surplus_deficit: totalRev - totalExp
        };
    };

    // --- Form Components ---
    const renderInfoTab = () => (
        <div className="form-section animate-fade-in">
            <div className="form-group">
                <label>Budget Number <span style={{ color: 'red' }}>*</span></label>
                <input type="text" value={data.budget_number || ''} onChange={e => setData('budget_number', e.target.value)} />
                {errors.budget_number && <span className="error">{errors.budget_number}</span>}
            </div>
            <div className="form-group">
                <label>Budget Name (EN) <span style={{ color: 'red' }}>*</span></label>
                <input type="text" value={data.budget_name_en || ''} onChange={e => setData('budget_name_en', e.target.value)} />
                {errors.budget_name_en && <span className="error" style={{ color: 'red' }}>{errors.budget_name_en}</span>}
            </div>
            <div className="form-group">
                <label>Budget Name (AR) <span style={{ color: 'red' }}>*</span></label>
                <input type="text" value={data.budget_name_ar || ''} onChange={e => setData('budget_name_ar', e.target.value)} />
                {errors.budget_name_ar && <span className="error" style={{ color: 'red' }}>{errors.budget_name_ar}</span>}
            </div>
            <div className="form-group">
                <label>Budget Type <span style={{ color: 'red' }}>*</span></label>
                <select value={data.budget_type || ''} onChange={e => setData('budget_type', e.target.value)}>
                    <option value="annual">Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="project">Project</option>
                    <option value="rolling">Rolling</option>
                </select>
                {errors.budget_type && <span className="error" style={{ color: 'red' }}>{errors.budget_type}</span>}
            </div>
            <div className="form-group">
                <label>Scope Type <span style={{ color: 'red' }}>*</span></label>
                <select value={data.scope_type || ''} onChange={e => setData('scope_type', e.target.value)}>
                    <option value="company">Company</option>
                    <option value="department">Department</option>
                    <option value="project">Project</option>
                    <option value="cost_center">Cost Center</option>
                    <option value="branch">Branch</option>
                </select>
                {errors.scope_type && <span className="error" style={{ color: 'red' }}>{errors.scope_type}</span>}
            </div>
            <div className="form-group">
                <label>Fiscal Year <span style={{ color: 'red' }}>*</span></label>
                <input type="number" value={data.fiscal_year || ''} onChange={e => setData('fiscal_year', e.target.value)} />
                {errors.fiscal_year && <span className="error" style={{ color: 'red' }}>{errors.fiscal_year}</span>}
            </div>
            <div className="form-group">
                <label>Start Date <span style={{ color: 'red' }}>*</span></label>
                <input type="date" value={data.start_date || ''} onChange={e => setData('start_date', e.target.value)} />
                {errors.start_date && <span className="error" style={{ color: 'red' }}>{errors.start_date}</span>}
            </div>
            <div className="form-group">
                <label>End Date <span style={{ color: 'red' }}>*</span></label>
                <input type="date" value={data.end_date || ''} onChange={e => setData('end_date', e.target.value)} />
                {errors.end_date && <span className="error" style={{ color: 'red' }}>{errors.end_date}</span>}
            </div>
            <div className="form-group">
                <label>Department</label>
                <select value={data.department_id || ''} onChange={e => setData('department_id', e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name_en}</option>)}
                </select>
                {errors.department_id && <span className="error" style={{ color: 'red' }}>{errors.department_id}</span>}
            </div>
            <div className="form-group">
                <label>Currency <span style={{ color: 'red' }}>*</span></label>
                <select value={data.currency_id || ''} onChange={e => setData('currency_id', e.target.value)}>
                    <option value="">Select Currency</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
                {errors.currency_id && <span className="error" style={{ color: 'red' }}>{errors.currency_id}</span>}
            </div>
            <div className="form-group">
                <label>Branch</label>
                <select value={data.branch_id || ''} onChange={e => setData('branch_id', e.target.value)}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errors.branch_id && <span className="error" style={{ color: 'red' }}>{errors.branch_id}</span>}
            </div>
             <div className="form-group">
                <label>Project (Optional)</label>
                 <select value={data.project_id || ''} onChange={e => setData('project_id', e.target.value)}>
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {errors.project_id && <span className="error" style={{ color: 'red' }}>{errors.project_id}</span>}
            </div>
             <div className="form-group">
                <label>Cost Center (Optional)</label>
                 <select value={data.cost_center_id || ''} onChange={e => setData('cost_center_id', e.target.value)}>
                    <option value="">Select Cost Center</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
                {errors.cost_center_id && <span className="error" style={{ color: 'red' }}>{errors.cost_center_id}</span>}
            </div>
            
            <div className="form-group">
                <label className="toggle-switch">
                    <input type="checkbox" checked={data.allow_over_budget || false} onChange={e => setData('allow_over_budget', e.target.checked)} />
                    Allow Over Budget
                </label>
            </div>
             <div className="form-group">
                <label className="toggle-switch">
                    <input type="checkbox" checked={data.require_approval_over_budget || false} onChange={e => setData('require_approval_over_budget', e.target.checked)} />
                    Require Approval
                </label>
            </div>
        </div>
    );

    const renderItemsTab = () => (
        <div className="items-section animate-fade-in">
            <button type="button" className="btn btn-secondary mb-3" onClick={addItem} style={{ marginBottom: '1rem' }}>
                + Add Item
            </button>
            <div className="items-grid">
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Account</th>
                            <th>Method</th>
                            <th>Formula</th>
                            <th>Annual Amount</th>
                            {months.map(m => <th key={m}>{m.toUpperCase()}</th>)}
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    <div className="account-select-cell">
                                        <SearchableComboBox
                                            options={categoryOptions}
                                            value={item.category_id ? String(item.category_id) : ''}
                                            onChange={(val) => updateItem(index, 'category_id', val)}
                                            placeholder="Category"
                                        />
                                    </div>
                                </td>
                                <td>
                                    <div className="account-select-cell">
                                        <SearchableComboBox
                                            options={accountOptions}
                                            value={item.account_id ? String(item.account_id) : ''}
                                            onChange={(val) => updateItem(index, 'account_id', val)}
                                            placeholder={'Account'}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <select
                                        value={item.calculation_method || ''}
                                        onChange={e => updateItem(index, 'calculation_method', e.target.value)}
                                        style={{ width: '120px' }}
                                    >
                                        <option value="fixed">Manual</option>
                                        <option value="formula">Formula</option>
                                        <option value="percentage">Percentage</option>
                                    </select>
                                </td>
                                <td>
                                    {item.calculation_method === 'percentage' ? (
                                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <select
                                                className="grid-input"
                                                value={item.basis_account_id || ''}
                                                onChange={e => updateItem(index, 'basis_account_id', e.target.value)}
                                                style={{ width: '120px', fontSize: '12px', padding: '4px' }}
                                                title="Select Basis Account"
                                            >
                                                <option value="">Select Basis</option>
                                                {data.items.map((opt, i) => {
                                                     const acc = accountOptions.find(a => String(a.value) === String(opt.account_id));
                                                     const label = acc ? acc.label : (opt.account_id ? `Account ${opt.account_id}` : `Row ${i+1}`);
                                                     if (i === index) return null;
                                                     if (!opt.account_id) return null;
                                                     return <option key={i} value={opt.account_id}>{label}</option>
                                                })}
                                            </select>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    className="grid-input"
                                                    value={item.percentage_rate || ''}
                                                    onChange={e => updateItem(index, 'percentage_rate', e.target.value)}
                                                    placeholder="%"
                                                    style={{ width: '60px', textAlign: 'right' }}
                                                />
                                                <span style={{ fontSize: '12px', marginLeft: '2px' }}>%</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <input 
                                            type="text" 
                                            className="grid-input"
                                            value={item.calculation_formula || ''}
                                            onChange={e => updateItem(index, 'calculation_formula', e.target.value)}
                                            placeholder="e.g. (A+B)*10%"
                                            disabled={item.calculation_method !== 'formula'}
                                        />
                                    )}
                                </td>
                                <td>
                                    <input 
                                        type="number" 
                                        className="grid-input"
                                        value={item.annual_amount || 0} 
                                        readOnly 
                                        style={{ background: '#f8f9fa' }}
                                    />
                                </td>
                                {months.map(m => (
                                    <td key={m}>
                                        <input 
                                            type="number" 
                                            className="grid-input"
                                            value={item[`${m}_amount`] || 0}
                                            onChange={e => updateItem(index, `${m}_amount`, e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                    </td>
                                ))}
                                <td>
                                    <input 
                                        type="text" 
                                        className="grid-input"
                                        value={item.notes || ''}
                                        onChange={e => updateItem(index, 'notes', e.target.value)}
                                        style={{ width: '150px' }}
                                    />
                                </td>
                                <td>
                                    <button 
                                        type="button" 
                                        className="text-danger"
                                        onClick={() => {
                                            const newItems = data.items.filter((_, i) => i !== index);
                                            setData('items', newItems);
                                        }}
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSummaryTab = () => {
        const totals = calculateBudgetTotals(data.items);
        return (
            <div className="form-section animate-fade-in">
                <div className="stat-card">
                    <h3>Total Revenue</h3>
                    <p>{totals.total_revenue.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Expense</h3>
                    <p>{totals.total_expense.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>Net Surplus/Deficit</h3>
                    <p style={{ color: totals.net_surplus_deficit >= 0 ? 'green' : 'red' }}>
                        {totals.net_surplus_deficit.toLocaleString()}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout>
            <Head title="Budget Management" />
            <div className="budget-management">
                <div className="header-actions">
                    <h1>Budget Management</h1>
                    {viewMode === 'list' && (
                        <button className="btn-create" onClick={handleCreate}>
                            <i className="material-icons">add</i> New Budget
                        </button>
                    )}
                </div>

                {viewMode === 'list' ? (
                    <BudgetList />
                ) : (
                    <div className="budget-form-container">
                        <div className="form-header">
                            <h2>{viewMode === 'create' ? 'Create New Budget' : 'Edit Budget'}</h2>
                            <div className="tabs">
                                <button 
                                    className={activeTab === 'info' ? 'active' : ''} 
                                    onClick={() => setActiveTab('info')}
                                >
                                    General Info
                                </button>
                                <button 
                                    className={activeTab === 'items' ? 'active' : ''} 
                                    onClick={() => setActiveTab('items')}
                                >
                                    Budget Items
                                </button>
                                <button 
                                    className={activeTab === 'summary' ? 'active' : ''} 
                                    onClick={() => setActiveTab('summary')}
                                >
                                    Summary
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave}>
                            {activeTab === 'info' && renderInfoTab()}
                            {activeTab === 'items' && renderItemsTab()}
                            {activeTab === 'summary' && renderSummaryTab()}

                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setViewMode('list')}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-save" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save Budget'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default Budget;
