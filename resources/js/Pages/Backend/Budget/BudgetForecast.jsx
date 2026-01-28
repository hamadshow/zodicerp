import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/Budget/BudgetForecast.scss';
import axios from 'axios';

export default function BudgetForecast({ forecasts, budgets, auth }) {
    const [activeTab, setActiveTab] = useState('info');
    const [budgetItems, setBudgetItems] = useState([]);
    const [selectedForecast, setSelectedForecast] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        budget_id: '',
        forecast_type: 'revision',
        reference_budget_item_id: '',
        forecast_date: new Date().toISOString().split('T')[0],
        effective_date: new Date().toISOString().split('T')[0],
        original_amount: 0,
        revised_amount: 0,
        revision_reason: '',
        approved_amount: 0,
    });

    const [difference, setDifference] = useState({ amount: 0, percent: 0 });

    useEffect(() => {
        if (data.budget_id) {
            axios.get(`/admin/budget/forecasts/items/${data.budget_id}`)
                .then(response => {
                    setBudgetItems(response.data);
                })
                .catch(error => console.error("Error fetching budget items:", error));
        } else {
            setBudgetItems([]);
        }
    }, [data.budget_id]);

    useEffect(() => {
        const diff = parseFloat(data.revised_amount || 0) - parseFloat(data.original_amount || 0);
        const percent = parseFloat(data.original_amount || 0) !== 0 
            ? (diff / parseFloat(data.original_amount)) * 100 
            : 0;
        
        setDifference({
            amount: diff,
            percent: percent.toFixed(2)
        });
    }, [data.original_amount, data.revised_amount]);

    useEffect(() => {
        if (data.reference_budget_item_id && budgetItems.length > 0) {
            const item = budgetItems.find(i => i.id == data.reference_budget_item_id);
            if (item && !isEditing) {
                setData('original_amount', item.amount);
            }
        }
    }, [data.reference_budget_item_id, budgetItems]);

    const handleEdit = (forecast) => {
        setSelectedForecast(forecast);
        setIsEditing(true);
        setData({
            budget_id: forecast.budget_id,
            forecast_type: forecast.forecast_type,
            reference_budget_item_id: forecast.reference_budget_item_id,
            forecast_date: forecast.forecast_date,
            effective_date: forecast.effective_date,
            original_amount: forecast.original_amount,
            revised_amount: forecast.revised_amount,
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
    };

    const handleSubmit = (e) => {
        e.preventDefault();
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
                        // Refresh selected forecast data if needed, or just close details
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

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
                                        <select 
                                            value={data.budget_id} 
                                            onChange={e => setData('budget_id', e.target.value)}
                                            disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                        >
                                            <option value="">Select Budget</option>
                                            {budgets.map(b => (
                                                <option key={b.id} value={b.id}>{b.budget_name_en} ({b.budget_number})</option>
                                            ))}
                                        </select>
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
                                            <label>Reference Budget Item</label>
                                            <select 
                                                value={data.reference_budget_item_id} 
                                                onChange={e => setData('reference_budget_item_id', e.target.value)}
                                                disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                            >
                                                <option value="">Select Item</option>
                                                {budgetItems.map(item => (
                                                    <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.amount)}</option>
                                                ))}
                                            </select>
                                            {errors.reference_budget_item_id && <span className="error-message">{errors.reference_budget_item_id}</span>}
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

                                        <div className="amount-column">
                                            <h3>Revised Amount</h3>
                                            <div className="form-group">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={data.revised_amount} 
                                                    onChange={e => setData('revised_amount', e.target.value)}
                                                    disabled={selectedForecast && selectedForecast.status !== 'draft' && selectedForecast.status !== 'rejected'}
                                                />
                                                {errors.revised_amount && <span className="error-message">{errors.revised_amount}</span>}
                                            </div>
                                            <div className="amount-display">
                                                {formatCurrency(data.revised_amount)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`diff-indicator ${difference.amount >= 0 ? 'positive' : 'negative'} ${Math.abs(difference.percent) > 10 ? 'warning' : ''}`}>
                                        <span>Difference: {formatCurrency(difference.amount)}</span>
                                        <span>{difference.percent}% {difference.amount > 0 ? 'Increase' : 'Decrease'}</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'approval' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Approved Amount</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={data.approved_amount} 
                                            onChange={e => setData('approved_amount', e.target.value)}
                                            disabled={!selectedForecast || selectedForecast.status !== 'pending_approval'}
                                        />
                                        {errors.approved_amount && <span className="error-message">{errors.approved_amount}</span>}
                                    </div>

                                    {selectedForecast && (
                                        <>
                                            <div className="form-group">
                                                <label>Created By</label>
                                                <input type="text" value={selectedForecast.creator?.name || '-'} readOnly disabled />
                                            </div>
                                            <div className="form-group">
                                                <label>Approved By</label>
                                                <input type="text" value={selectedForecast.approver?.name || '-'} readOnly disabled />
                                            </div>
                                            <div className="form-group">
                                                <label>Approved Date</label>
                                                <input type="text" value={selectedForecast.approved_date || '-'} readOnly disabled />
                                            </div>
                                            <div className="form-group">
                                                <label>Implemented By</label>
                                                <input type="text" value={selectedForecast.implementer?.name || '-'} readOnly disabled />
                                            </div>
                                            <div className="form-group">
                                                <label>Implemented Date</label>
                                                <input type="text" value={selectedForecast.implemented_date || '-'} readOnly disabled />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
