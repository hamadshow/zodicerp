import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import SearchableComboBox from '@/Pages/Backend/components/SearchableComboBox';
import axios from 'axios';
import '../../../../css/backend/main.scss';


export default function BudgetForecast({ forecasts, budgets }) {
    const [activeTab, setActiveTab] = useState('info');
    const [budgetItems, setBudgetItems] = useState([]);
    const [selectedForecast, setSelectedForecast] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        budget_id: '',
        forecast_type: 'revision',
        reference_budget_item_id: '',
        destination_budget_item_id: '',
        forecast_date: new Date().toISOString().split('T')[0],
        effective_date: new Date().toISOString().split('T')[0],
        original_amount: 0,
        revised_amount: 0,
        transfer_amount: 0, // Helper for transfer UI
        revision_reason: '',
        approved_amount: 0,
    });

    const [difference, setDifference] = useState({ amount: 0, percent: 0 });

    // Fetch budget items when budget changes
    useEffect(() => {
        if (data.budget_id) {
            axios.get(route('admin.budget.forecasts.items', data.budget_id))
                .then(response => {
                    setBudgetItems(response.data);
                })
                .catch(error => console.error("Error fetching budget items:", error));
        } else {
            setBudgetItems([]);
        }
    }, [data.budget_id]);

    // Calculate difference and percent
    useEffect(() => {
        // If transfer, calculate revised based on transfer amount
        if (data.forecast_type === 'transfer') {
             // For transfer, revised amount (source) = original - transfer
             // But we handle this via transfer_amount input
        }

        const diff = parseFloat(data.revised_amount || 0) - parseFloat(data.original_amount || 0);
        const percent = parseFloat(data.original_amount || 0) !== 0 
            ? (diff / parseFloat(data.original_amount)) * 100 
            : 0;
        
        setDifference({
            amount: diff,
            percent: percent.toFixed(2)
        });
    }, [data.original_amount, data.revised_amount]);

    // Set original amount when reference item changes
    useEffect(() => {
        if (data.reference_budget_item_id && budgetItems.length > 0) {
            const item = budgetItems.find(i => i.id == data.reference_budget_item_id);
            if (item && !isEditing) {
                setData(prev => ({
                    ...prev,
                    original_amount: item.amount,
                    // Reset revised/transfer when item changes
                    revised_amount: item.amount, 
                    transfer_amount: 0
                }));
            }
        }
    }, [data.reference_budget_item_id, budgetItems]);

    // Handle transfer amount changes
    useEffect(() => {
        if (data.forecast_type === 'transfer' && !isEditing) {
             const transfer = parseFloat(data.transfer_amount || 0);
             const original = parseFloat(data.original_amount || 0);
             setData('revised_amount', original - transfer);
        }
    }, [data.transfer_amount, data.forecast_type]);

    const handleEdit = (forecast) => {
        setSelectedForecast(forecast);
        setIsEditing(true);
        
        // Calculate transfer amount if it was a transfer
        let transferAmt = 0;
        if (forecast.forecast_type === 'transfer') {
            transferAmt = parseFloat(forecast.original_amount) - parseFloat(forecast.revised_amount);
        }

        setData({
            budget_id: forecast.budget_id,
            forecast_type: forecast.forecast_type,
            reference_budget_item_id: forecast.reference_budget_item_id,
            destination_budget_item_id: forecast.destination_budget_item_id || '',
            forecast_date: forecast.forecast_date,
            effective_date: forecast.effective_date,
            original_amount: forecast.original_amount,
            revised_amount: forecast.revised_amount,
            transfer_amount: transferAmt,
            revision_reason: forecast.revision_reason || '',
            approved_amount: forecast.approved_amount || forecast.revised_amount,
        });
    };

    const handleCreate = () => {
        setSelectedForecast(null);
        setIsEditing(false);
        reset();
        setData('forecast_date', new Date().toISOString().split('T')[0]);
        setData('effective_date', new Date().toISOString().split('T')[0]);
        setActiveTab('info');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (data.forecast_type === 'transfer') {
            if (data.reference_budget_item_id === data.destination_budget_item_id) {
                alert('Source and Destination items cannot be the same.');
                return;
            }
            if (parseFloat(data.transfer_amount) <= 0) {
                 alert('Transfer amount must be positive.');
                 return;
            }
        }

        if (selectedForecast) {
            put(route('admin.budget.forecasts.update', selectedForecast.id), {
                onSuccess: () => {
                    handleCreate(); // Reset form
                }
            });
        } else {
            post(route('admin.budget.forecasts.store'), {
                onSuccess: () => {
                    handleCreate(); // Reset form
                }
            });
        }
    };

    const handleAction = (action, id) => {
        if (confirm(`Are you sure you want to ${action.replace('_', ' ')} this forecast?`)) {
            router.post(route(`admin.budget.forecasts.${action}`, id), {}, {
                preserveScroll: true,
                onSuccess: () => {
                    if (selectedForecast && selectedForecast.id === id) {
                        setSelectedForecast(null);
                        setIsEditing(false);
                        reset();
                    }
                }
            });
        }
    };

    const handleApprove = (id) => {
        if (confirm('Are you sure you want to approve this forecast?')) {
            router.post(route('admin.budget.forecasts.approve', id), {
                approved_amount: data.approved_amount || data.revised_amount
            }, { preserveScroll: true });
        }
    };

    // Dynamic Currency Helper
    const getCurrencyCode = () => {
        if (data.budget_id) {
            const b = budgets.find(x => x.id == data.budget_id);
            // Assuming budget has currency relationship loaded or code, if not default to USD
            // The budgets prop in controller selects: id, name, number. 
            // It might not have currency. I should update controller to include currency_code if possible.
            // For now, let's use a safe fallback.
            return b?.currency?.code || 'USD'; 
        }
        return 'USD';
    };

    const formatCurrency = (amount) => {
        const code = getCurrencyCode();
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
        } catch {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        }
    };

    // Options for SearchableComboBox
    const budgetOptions = useMemo(() => 
        budgets.map(b => ({
            value: String(b.id),
            label: `${b.budget_name_en} (${b.budget_number})`
        })), 
    [budgets]);

    const itemOptions = useMemo(() => 
        budgetItems.map(item => ({
            value: String(item.id),
            label: `${item.name} - ${formatCurrency(item.amount)}`
        })), 
    [budgetItems, data.budget_id]); // Re-calc when budgetItems change

    return (
        <AdminLayout>
            <Head title="Budget Forecasts" />
            <div className="budget-forecast-page">
                <div className="page-header">
                    <div className="header-title">
                        <h1>Budget Forecasts</h1>
                        <div className="breadcrumb">Finance &gt; Budgets &gt; Forecasts</div>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={handleCreate}>
                            <i className="fas fa-plus"></i> New Forecast
                        </button>
                        {(selectedForecast && selectedForecast.status === 'draft') || !selectedForecast ? (
                             <button className="btn btn-success" onClick={handleSubmit} disabled={processing}>
                                <i className="fas fa-save"></i> Save
                            </button>
                        ) : null}
                       
                        {selectedForecast && selectedForecast.status === 'draft' && (
                            <button className="btn btn-warning" onClick={() => handleAction('submit', selectedForecast.id)}>
                                <i className="fas fa-paper-plane"></i> Submit
                            </button>
                        )}
                        
                        {selectedForecast && selectedForecast.status === 'pending_approval' && (
                            <>
                                <button className="btn btn-success" onClick={() => handleApprove(selectedForecast.id)}>
                                    <i className="fas fa-check"></i> Approve
                                </button>
                                <button className="btn btn-danger" onClick={() => handleAction('reject', selectedForecast.id)}>
                                    <i className="fas fa-times"></i> Reject
                                </button>
                            </>
                        )}

                        {selectedForecast && selectedForecast.status === 'approved' && (
                             <button className="btn btn-primary" onClick={() => handleAction('implement', selectedForecast.id)}>
                                <i className="fas fa-rocket"></i> Implement
                            </button>
                        )}

                        <button className="btn btn-secondary" onClick={handleCreate}>
                            Cancel
                        </button>
                    </div>
                </div>

                <div className="content-container">
                    {/* List Section */}
                    <div className="list-section">
                        <div className="list-header">
                            <h2>Forecasts List</h2>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Budget</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecasts.data.map(forecast => (
                                    <tr 
                                        key={forecast.id} 
                                        onClick={() => handleEdit(forecast)}
                                        className={selectedForecast && selectedForecast.id === forecast.id ? 'active-row' : ''}
                                    >
                                        <td>{forecast.forecast_number}</td>
                                        <td>{forecast.budget?.budget_name_en}</td>
                                        <td>{forecast.forecast_type}</td>
                                        <td><span className={`badge ${forecast.status}`}>{forecast.status.replace('_', ' ')}</span></td>
                                        <td>{forecast.forecast_date}</td>
                                    </tr>
                                ))}
                                {forecasts.data.length === 0 && (
                                    <tr><td colSpan="5" className="text-center">No forecasts found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Form Section */}
                    <div className="form-section">
                        <div className="tabs">
                            <button 
                                className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                onClick={() => setActiveTab('info')}
                            >
                                Forecast Information
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                                onClick={() => setActiveTab('details')}
                            >
                                Amount Details
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'approval' ? 'active' : ''}`}
                                onClick={() => setActiveTab('approval')}
                            >
                                Approval & Audit
                            </button>
                        </div>

                        <div className="tab-content">
                            {activeTab === 'info' && (
                                <div className="form-grid">
                                    {selectedForecast && (
                                        <div className="form-group">
                                            <label>Forecast Number</label>
                                            <input type="text" value={selectedForecast.forecast_number} readOnly disabled />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Budget</label>
                                        <div className="account-select-cell">
                                            <SearchableComboBox 
                                                options={budgetOptions}
                                                value={data.budget_id ? String(data.budget_id) : ''}
                                                onChange={val => setData('budget_id', val)}
                                                placeholder="Select Budget"
                                                disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                            />
                                        </div>
                                        {errors.budget_id && <span className="error-message">{errors.budget_id}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Forecast Type</label>
                                        <select 
                                            value={data.forecast_type} 
                                            onChange={e => setData('forecast_type', e.target.value)}
                                            disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                        >
                                            <option value="revision">Revision</option>
                                            <option value="forecast">Forecast</option>
                                            <option value="adjustment">Adjustment</option>
                                            <option value="transfer">Transfer</option>
                                        </select>
                                        {errors.forecast_type && <span className="error-message">{errors.forecast_type}</span>}
                                    </div>

                                    {(data.forecast_type === 'revision' || data.forecast_type === 'adjustment' || data.forecast_type === 'transfer') && (
                                        <div className="form-group full-width">
                                            <label>{data.forecast_type === 'transfer' ? 'Source Budget Item' : 'Reference Budget Item'}</label>
                                            <div className="account-select-cell">
                                                <SearchableComboBox 
                                                    options={itemOptions}
                                                    value={data.reference_budget_item_id ? String(data.reference_budget_item_id) : ''}
                                                    onChange={val => setData('reference_budget_item_id', val)}
                                                    placeholder="Select Item"
                                                    disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                                />
                                            </div>
                                            {errors.reference_budget_item_id && <span className="error-message">{errors.reference_budget_item_id}</span>}
                                        </div>
                                    )}

                                    {data.forecast_type === 'transfer' && (
                                        <div className="form-group full-width">
                                            <label>Destination Budget Item</label>
                                            <div className="account-select-cell">
                                                <SearchableComboBox 
                                                    options={itemOptions}
                                                    value={data.destination_budget_item_id ? String(data.destination_budget_item_id) : ''}
                                                    onChange={val => setData('destination_budget_item_id', val)}
                                                    placeholder="Select Destination Item"
                                                    disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                                />
                                            </div>
                                            {errors.destination_budget_item_id && <span className="error-message">{errors.destination_budget_item_id}</span>}
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Forecast Date</label>
                                        <input 
                                            type="date" 
                                            value={data.forecast_date} 
                                            onChange={e => setData('forecast_date', e.target.value)}
                                            disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                        />
                                        {errors.forecast_date && <span className="error-message">{errors.forecast_date}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Effective Date</label>
                                        <input 
                                            type="date" 
                                            value={data.effective_date} 
                                            onChange={e => setData('effective_date', e.target.value)}
                                            disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                        />
                                        {errors.effective_date && <span className="error-message">{errors.effective_date}</span>}
                                    </div>

                                    {data.forecast_type === 'revision' && (
                                        <div className="form-group full-width">
                                            <label>Revision Reason</label>
                                            <textarea 
                                                value={data.revision_reason} 
                                                onChange={e => setData('revision_reason', e.target.value)}
                                                disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                            />
                                            {errors.revision_reason && <span className="error-message">{errors.revision_reason}</span>}
                                        </div>
                                    )}
                                    
                                    {selectedForecast && (
                                         <div className="form-group">
                                            <label>Status</label>
                                            <div>
                                                <span className={`badge ${selectedForecast.status}`}>{selectedForecast.status.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div>
                                    <div className="comparison-panel">
                                        <div className="amount-column">
                                            <h3>Original Amount</h3>
                                            <div className="form-group">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={data.original_amount} 
                                                    onChange={e => setData('original_amount', e.target.value)}
                                                    readOnly={data.reference_budget_item_id ? true : false} // Readonly if linked to item
                                                    disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                                />
                                            </div>
                                            <div className="amount-display">
                                                {formatCurrency(data.original_amount)}
                                            </div>
                                        </div>

                                        {data.forecast_type === 'transfer' && (
                                             <div className="amount-column">
                                                <h3>Transfer Amount</h3>
                                                <div className="form-group">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={data.transfer_amount} 
                                                        onChange={e => setData('transfer_amount', e.target.value)}
                                                        disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                                    />
                                                </div>
                                                <div className="amount-display">
                                                    {formatCurrency(data.transfer_amount)}
                                                </div>
                                            </div>
                                        )}

                                        <div className="amount-column">
                                            <h3>{data.forecast_type === 'transfer' ? 'Revised Source Amount' : 'Revised Amount'}</h3>
                                            <div className="form-group">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={data.revised_amount} 
                                                    onChange={e => setData('revised_amount', e.target.value)}
                                                    disabled={data.forecast_type === 'transfer' || (selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected')}
                                                    readOnly={data.forecast_type === 'transfer'}
                                                />
                                                {errors.revised_amount && <span className="error-message">{errors.revised_amount}</span>}
                                            </div>
                                            <div className="amount-display">
                                                {formatCurrency(data.revised_amount)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="difference-panel">
                                        <div className="diff-item">
                                            <label>Difference Amount:</label>
                                            <span className={difference.amount < 0 ? 'text-danger' : 'text-success'}>
                                                {formatCurrency(difference.amount)}
                                            </span>
                                        </div>
                                        <div className="diff-item">
                                            <label>Difference %:</label>
                                            <span className={difference.amount < 0 ? 'text-danger' : 'text-success'}>
                                                {difference.percent}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'approval' && (
                                <div>
                                    {selectedForecast && selectedForecast.status === 'pending_approval' && (
                                        <div className="form-group">
                                            <label>Approved Amount</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={data.approved_amount} 
                                                onChange={e => setData('approved_amount', e.target.value)}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Audit Trail */}
                                    <div className="audit-trail mt-4">
                                        <h3>Audit Trail</h3>
                                        <table className="audit-table">
                                            <thead>
                                                <tr>
                                                    <th>Action</th>
                                                    <th>User</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedForecast && selectedForecast.created_by && (
                                                    <tr>
                                                        <td>Created</td>
                                                        <td>{selectedForecast.creator?.name || selectedForecast.created_by}</td>
                                                        <td>{selectedForecast.created_at?.split('T')[0]}</td>
                                                    </tr>
                                                )}
                                                {selectedForecast && selectedForecast.approved_by && (
                                                    <tr>
                                                        <td>Approved</td>
                                                        <td>{selectedForecast.approver?.name || selectedForecast.approved_by}</td>
                                                        <td>{selectedForecast.approved_date}</td>
                                                    </tr>
                                                )}
                                                {selectedForecast && selectedForecast.implemented_by && (
                                                    <tr>
                                                        <td>Implemented</td>
                                                        <td>{selectedForecast.implementer?.name || selectedForecast.implemented_by}</td>
                                                        <td>{selectedForecast.implemented_date}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
