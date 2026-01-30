import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Budget/BudgetTransfer.scss';
import axios from 'axios';

const BudgetTransfer = ({ transfers, budgets, filters }) => {
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
    const [fromItems, setFromItems] = useState([]);
    const [toItems, setToItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState({ from: false, to: false });

    // Form handling
    const { data, setData, post, processing, errors, reset } = useForm({
        transfer_date: new Date().toISOString().split('T')[0],
        transfer_type: 'internal',
        reason: '',
        justification: '',
        from_budget_id: '',
        from_budget_item_id: '',
        from_amount: '',
        to_budget_id: '',
        to_budget_item_id: '',
        to_amount: '',
        notes: '',
        reference_document: null
    });

    // Helper to fetch items
    const fetchBudgetItems = async (budgetId, type) => {
        if (!budgetId) {
            type === 'from' ? setFromItems([]) : setToItems([]);
            return;
        }
        
        setLoadingItems(prev => ({ ...prev, [type]: true }));
        try {
            const response = await axios.get(route('admin.budget.transfers.items', budgetId));
            type === 'from' ? setFromItems(response.data) : setToItems(response.data);
        } catch (error) {
            console.error("Failed to load budget items", error);
        } finally {
            setLoadingItems(prev => ({ ...prev, [type]: false }));
        }
    };

    // Effects for fetching items when budget changes
    useEffect(() => {
        if (data.from_budget_id) fetchBudgetItems(data.from_budget_id, 'from');
    }, [data.from_budget_id]);

    useEffect(() => {
        if (data.to_budget_id) fetchBudgetItems(data.to_budget_id, 'to');
    }, [data.to_budget_id]);

    // Auto-fill to_amount
    useEffect(() => {
        if (data.transfer_type !== 'supplemental') {
            setData('to_amount', data.from_amount);
        }
    }, [data.from_amount, data.transfer_type]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (viewMode === 'create') {
            post(route('admin.budget.transfers.store'), {
                onSuccess: () => {
                    setViewMode('list');
                    reset();
                }
            });
        } else if (viewMode === 'edit') {
            // Implement update logic if needed
        }
    };

    const handleAction = (action, transferId) => {
        if (!confirm(`Are you sure you want to ${action} this transfer?`)) return;
        
        post(route(`admin.budget.transfers.${action}`, transferId), {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh logic is handled by Inertia
            }
        });
    };

    const getAvailableBalance = () => {
        if (!data.from_budget_item_id || fromItems.length === 0) return 0;
        const item = fromItems.find(i => i.id == data.from_budget_item_id);
        return item ? parseFloat(item.available_balance) : 0;
    };

    const renderList = () => (
        <div className="transfers-list animate-fade-in">
            <div className="page-header">
                <h1>
                    <span className="material-icons-outlined">swap_horiz</span>
                    Budget Transfers
                </h1>
                <div className="actions">
                    <button className="btn btn-primary" onClick={() => setViewMode('create')}>
                        <span className="material-icons-outlined">add</span>
                        New Transfer
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-input">
                    <i className="material-icons-outlined">search</i>
                    <input 
                        type="text" 
                        placeholder="Search by transfer number..." 
                        defaultValue={filters.transfer_number}
                        onChange={(e) => router.get(route('admin.budget.transfers.index'), { transfer_number: e.target.value }, { preserveState: true, replace: true })}
                    />
                </div>
                <select 
                    defaultValue={filters.status}
                    onChange={(e) => router.get(route('admin.budget.transfers.index'), { status: e.target.value }, { preserveState: true, replace: true })}
                >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <div className="transfers-table">
                <table>
                    <thead>
                        <tr>
                            <th>Transfer #</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>From Budget</th>
                            <th>To Budget</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.data.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-4 text-gray-500">No transfers found</td>
                            </tr>
                        ) : (
                            transfers.data.map(transfer => (
                                <tr key={transfer.id}>
                                    <td>{transfer.transfer_number}</td>
                                    <td>{transfer.transfer_date}</td>
                                    <td>{transfer.transfer_type}</td>
                                    <td>{transfer.from_budget?.budget_name_en}</td>
                                    <td>{transfer.to_budget?.budget_name_en}</td>
                                    <td className="font-mono font-semibold">{Number(transfer.from_amount).toLocaleString()}</td>
                                    <td>
                                        <span className={`status-badge ${transfer.status}`}>
                                            {transfer.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            {transfer.status === 'draft' && (
                                                <button 
                                                    className="btn-icon text-blue-600"
                                                    title="Submit for Approval"
                                                    onClick={() => handleAction('submit', transfer.id)}
                                                >
                                                    <span className="material-icons-outlined">send</span>
                                                </button>
                                            )}
                                            {transfer.status === 'pending_approval' && (
                                                <>
                                                    <button 
                                                        className="btn-icon text-green-600"
                                                        title="Approve"
                                                        onClick={() => handleAction('approve', transfer.id)}
                                                    >
                                                        <span className="material-icons-outlined">check_circle</span>
                                                    </button>
                                                    <button 
                                                        className="btn-icon text-red-600"
                                                        title="Reject"
                                                        onClick={() => handleAction('reject', transfer.id)}
                                                    >
                                                        <span className="material-icons-outlined">cancel</span>
                                                    </button>
                                                </>
                                            )}
                                            {transfer.status === 'approved' && (
                                                <button 
                                                    className="btn-icon text-purple-600"
                                                    title="Complete Transfer"
                                                    onClick={() => handleAction('complete', transfer.id)}
                                                >
                                                    <span className="material-icons-outlined">done_all</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="transfer-form-container animate-fade-in">
            <div className="form-header">
                <h2>{viewMode === 'create' ? 'New Budget Transfer' : 'Edit Transfer'}</h2>
                <div className="actions">
                    <button className="btn btn-secondary mr-2" onClick={() => setViewMode('list')}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={processing}>
                        {processing ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="form-group">
                        <label>Transfer Date</label>
                        <input type="date" value={data.transfer_date} onChange={e => setData('transfer_date', e.target.value)} required />
                        {errors.transfer_date && <span className="text-red-500 text-xs">{errors.transfer_date}</span>}
                    </div>
                    <div className="form-group">
                        <label>Transfer Type</label>
                        <select value={data.transfer_type} onChange={e => setData('transfer_type', e.target.value)} required>
                            <option value="internal">Internal</option>
                            <option value="interdepartmental">Interdepartmental</option>
                            <option value="supplemental">Supplemental</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <input type="text" value="Draft" disabled className="bg-gray-100" />
                    </div>
                </div>

                <div className="form-group mb-6">
                    <label>Reason</label>
                    <textarea 
                        value={data.reason} 
                        onChange={e => setData('reason', e.target.value)} 
                        rows="2"
                        required 
                        placeholder="Why is this transfer needed?"
                    />
                    {errors.reason && <span className="text-red-500 text-xs">{errors.reason}</span>}
                </div>

                {(data.transfer_type === 'interdepartmental' || data.transfer_type === 'supplemental') && (
                    <div className="form-group mb-6 animate-fade-in">
                        <label>Justification</label>
                        <textarea 
                            value={data.justification} 
                            onChange={e => setData('justification', e.target.value)} 
                            rows="2"
                            required 
                            placeholder="Detailed justification for approval..."
                        />
                    </div>
                )}

                {/* From/To Panels */}
                <div className="panels-grid">
                    {/* From Panel */}
                    <div className="panel from-panel">
                        <h3><i className="material-icons-outlined">outbound</i> Transfer From</h3>
                        
                        <div className="form-group">
                            <label>Source Budget</label>
                            <select 
                                value={data.from_budget_id} 
                                onChange={e => setData('from_budget_id', e.target.value)}
                                required
                            >
                                <option value="">Select Budget</option>
                                {budgets.map(b => <option key={b.id} value={b.id}>{b.budget_name_en} ({b.budget_number})</option>)}
                            </select>
                            {errors.from_budget_id && <span className="text-red-500 text-xs">{errors.from_budget_id}</span>}
                        </div>

                        <div className="form-group">
                            <label>Source Budget Item</label>
                            <select 
                                value={data.from_budget_item_id} 
                                onChange={e => setData('from_budget_item_id', e.target.value)}
                                required
                                disabled={!data.from_budget_id || loadingItems.from}
                            >
                                <option value="">Select Item</option>
                                {fromItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} (Bal: {Number(item.available_balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                            {data.from_budget_item_id && (
                                <div className={`balance-info ${getAvailableBalance() < Number(data.from_amount) ? 'warning' : ''}`}>
                                    <span>Available Balance:</span>
                                    <strong>{Number(getAvailableBalance()).toLocaleString()}</strong>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Transfer Amount</label>
                            <input 
                                type="number" 
                                value={data.from_amount} 
                                onChange={e => setData('from_amount', e.target.value)}
                                required
                                min="0.01"
                                step="0.01"
                            />
                            {errors.from_amount && <span className="text-red-500 text-xs">{errors.from_amount}</span>}
                        </div>
                    </div>

                    {/* To Panel */}
                    <div className="panel to-panel">
                        <h3><i className="material-icons-outlined">move_to_inbox</i> Transfer To</h3>
                        
                        <div className="form-group">
                            <label>Destination Budget</label>
                            <select 
                                value={data.to_budget_id} 
                                onChange={e => setData('to_budget_id', e.target.value)}
                                required
                            >
                                <option value="">Select Budget</option>
                                {budgets.map(b => <option key={b.id} value={b.id}>{b.budget_name_en} ({b.budget_number})</option>)}
                            </select>
                            {errors.to_budget_id && <span className="text-red-500 text-xs">{errors.to_budget_id}</span>}
                        </div>

                        <div className="form-group">
                            <label>Destination Budget Item</label>
                            <select 
                                value={data.to_budget_item_id} 
                                onChange={e => setData('to_budget_item_id', e.target.value)}
                                required
                                disabled={!data.to_budget_id || loadingItems.to}
                            >
                                <option value="">Select Item</option>
                                {toItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} (Curr: {Number(item.annual_amount).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                            {errors.to_budget_item_id && <span className="text-red-500 text-xs">{errors.to_budget_item_id}</span>}
                        </div>

                        <div className="form-group">
                            <label>Receive Amount</label>
                            <input 
                                type="number" 
                                value={data.to_amount} 
                                onChange={e => setData('to_amount', e.target.value)}
                                required
                                min="0.01"
                                step="0.01"
                                readOnly={data.transfer_type !== 'supplemental'}
                                className={data.transfer_type !== 'supplemental' ? 'bg-gray-100' : ''}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group mt-6">
                    <label>Reference Document</label>
                    <input 
                        type="file" 
                        onChange={e => setData('reference_document', e.target.files[0])} 
                        className="form-control"
                        accept=".pdf,.jpg,.png,.doc,.docx"
                    />
                    {errors.reference_document && <span className="text-red-500 text-xs">{errors.reference_document}</span>}
                </div>

                <div className="form-group mt-6">
                    <label>Additional Notes</label>
                    <textarea 
                        value={data.notes} 
                        onChange={e => setData('notes', e.target.value)} 
                        rows="2"
                    />
                </div>
            </form>
        </div>
    );

    return (
        <AdminLayout activeMenu="Budget">
            <Head title="Budget Transfers" />
            <div className="budget-transfers-page">
                {viewMode === 'list' ? renderList() : renderForm()}
            </div>
        </AdminLayout>
    );
};

export default BudgetTransfer;
