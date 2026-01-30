import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Budget/BudgetCommitment.scss';
import axios from 'axios';

export default function BudgetCommitment({ commitments, budgets, filters }) {
    const [viewMode, setViewMode] = useState('list'); // list, create, edit, details
    const [budgetItems, setBudgetItems] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [selectedCommitment, setSelectedCommitment] = useState(null);
    const [searchQuery, setSearchQuery] = useState(filters.reference_number || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

    // Form handling
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        budget_id: '',
        budget_item_id: '',
        reference_type: 'purchase_order',
        reference_id: '',
        reference_number: '',
        commitment_date: new Date().toISOString().split('T')[0],
        expected_expense_date: '',
        expiry_date: '',
        vendor_id: '',
        description: '',
        committed_amount: '',
        _method: 'POST'
    });

    // Fetch budget items when budget changes
    useEffect(() => {
        if (data.budget_id) {
            setLoadingItems(true);
            axios.get(route('admin.budget.commitments.items', data.budget_id))
                .then(res => {
                    setBudgetItems(res.data);
                    setLoadingItems(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoadingItems(false);
                });
        } else {
            setBudgetItems([]);
        }
    }, [data.budget_id]);

    // Fetch vendors on load (or search if implemented)
    useEffect(() => {
        if (viewMode === 'create' || viewMode === 'edit') {
            axios.get(route('admin.budget.commitments.vendors'))
                .then(res => setVendors(res.data))
                .catch(err => console.error(err));
        }
    }, [viewMode]);

    const handleCreate = () => {
        reset();
        clearErrors();
        setViewMode('create');
        setData('_method', 'POST');
    };

    const handleEdit = (commitment) => {
        setSelectedCommitment(commitment);
        reset();
        clearErrors();
        
        // Load items for the budget of this commitment
        setLoadingItems(true);
        axios.get(route('admin.budget.commitments.items', commitment.budget_id))
            .then(res => {
                setBudgetItems(res.data);
                setLoadingItems(false);
                
                // Set data after items loaded to ensure dropdown matches
                setData({
                    budget_id: commitment.budget_id,
                    budget_item_id: commitment.budget_item_id,
                    reference_type: commitment.reference_type,
                    reference_id: commitment.reference_id,
                    reference_number: commitment.reference_number,
                    commitment_date: commitment.commitment_date,
                    expected_expense_date: commitment.expected_expense_date || '',
                    expiry_date: commitment.expiry_date || '',
                    vendor_id: commitment.vendor_id || '',
                    description: commitment.description || '',
                    committed_amount: commitment.committed_amount,
                    _method: 'PUT'
                });
                setViewMode('edit');
            });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (viewMode === 'create') {
            post(route('admin.budget.commitments.store'), {
                onSuccess: () => {
                    setViewMode('list');
                    reset();
                }
            });
        } else {
            post(route('admin.budget.commitments.update', selectedCommitment.id), {
                onSuccess: () => {
                    setViewMode('list');
                    reset();
                }
            });
        }
    };

    const handleCancel = () => {
        setViewMode('list');
        reset();
        setSelectedCommitment(null);
    };

    const handleSearch = () => {
        router.get(route('admin.budget.commitments.index'), {
            reference_number: searchQuery,
            status: selectedStatus
        }, { preserveState: true });
    };

    // Actions
    const handleAction = (action, commitment) => {
        if (!confirm(`Are you sure you want to ${action} this commitment?`)) return;

        let url = '';
        let method = 'post';

        switch (action) {
            case 'cancel':
                url = route('admin.budget.commitments.destroy', commitment.id);
                method = 'delete';
                break;
            case 'close':
                url = route('admin.budget.commitments.close', commitment.id);
                break;
            case 'utilize': {
                const amount = prompt("Enter amount to utilize:");
                if (!amount) return;
                router.post(route('admin.budget.commitments.utilize', commitment.id), { amount });
                return;
            }
        }

        router[method](url, {}, { preserveScroll: true });
    };

    // Calculate remaining (simple frontend estimation, backend validates)
    const selectedItem = budgetItems.find(i => i.id == data.budget_item_id);
    const availableBalance = selectedItem ? parseFloat(selectedItem.available_balance) : 0;
    const isOverBudget = data.committed_amount > availableBalance && viewMode === 'create';

    return (
        <AdminLayout>
            <Head title="Budget Commitments" />
            <div className="budget-commitments-page">
                
                {/* Header */}
                <div className="page-header">
                    <h1>
                        <i className="fas fa-file-invoice-dollar"></i>
                        Budget Commitments
                    </h1>
                    <div className="actions">
                        {viewMode === 'list' && (
                            <>
                                <button className="btn btn-secondary" onClick={() => window.print()}>
                                    <i className="fas fa-print"></i> Print
                                </button>
                                <button className="btn btn-primary" onClick={handleCreate}>
                                    <i className="fas fa-plus"></i> New Commitment
                                </button>
                            </>
                        )}
                        {viewMode !== 'list' && (
                            <button className="btn btn-secondary" onClick={handleCancel}>
                                <i className="fas fa-arrow-left"></i> Back to List
                            </button>
                        )}
                    </div>
                </div>

                {/* List View */}
                {viewMode === 'list' && (
                    <>
                        <div className="filters-bar">
                            <div className="search-input">
                                <i className="fas fa-search"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search by Reference Number..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="partially_utilized">Partially Utilized</option>
                                <option value="fully_utilized">Fully Utilized</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <button className="btn btn-primary" onClick={handleSearch}>Filter</button>
                        </div>

                        <div className="commitments-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ref #</th>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Budget Item</th>
                                        <th>Vendor</th>
                                        <th>Committed</th>
                                        <th>Utilized</th>
                                        <th>Remaining</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commitments.data.length > 0 ? (
                                        commitments.data.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.reference_number}</td>
                                                <td>{item.commitment_date}</td>
                                                <td className="capitalize">{item.reference_type.replace('_', ' ')}</td>
                                                <td>
                                                    <small>{item.budget?.budget_name_en}</small><br/>
                                                    {item.budget_item?.account?.AccName}
                                                </td>
                                                <td>{item.vendor?.name_en || '-'}</td>
                                                <td>{parseFloat(item.committed_amount).toLocaleString()}</td>
                                                <td>{parseFloat(item.utilized_amount).toLocaleString()}</td>
                                                <td>{parseFloat(item.remaining_amount).toLocaleString()}</td>
                                                <td>
                                                    <span className={`status-badge ${item.status}`}>
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    {item.status === 'active' && (
                                                        <>
                                                            <button className="btn-icon" title="Edit" onClick={() => handleEdit(item)}>
                                                                <i className="fas fa-edit text-blue-500"></i>
                                                            </button>
                                                            <button className="btn-icon" title="Utilize" onClick={() => handleAction('utilize', item)}>
                                                                <i className="fas fa-check-circle text-green-500"></i>
                                                            </button>
                                                            <button className="btn-icon" title="Close/Cancel" onClick={() => handleAction('cancel', item)}>
                                                                <i className="fas fa-times-circle text-red-500"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'partially_utilized' && (
                                                         <button className="btn-icon" title="Close Manually" onClick={() => handleAction('close', item)}>
                                                            <i className="fas fa-lock text-orange-500"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="10" className="text-center p-4 text-gray-500">No commitments found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination would go here */}
                    </>
                )}

                {/* Create/Edit Form */}
                {(viewMode === 'create' || viewMode === 'edit') && (
                    <div className="commitment-form-container">
                        <div className="form-header">
                            <h2>{viewMode === 'create' ? 'New Commitment' : 'Edit Commitment'}</h2>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="panels-grid">
                                {/* Left Panel: Reference Info */}
                                <div className="panel">
                                    <div className="section-title">General Information</div>
                                    
                                    <div className="form-group">
                                        <label>Budget <span className="text-red-500">*</span></label>
                                        <select 
                                            value={data.budget_id} 
                                            onChange={e => setData('budget_id', e.target.value)}
                                            disabled={viewMode === 'edit'}
                                            required
                                        >
                                            <option value="">Select Budget</option>
                                            {budgets.map(b => (
                                                <option key={b.id} value={b.id}>{b.budget_name_en} ({b.budget_number})</option>
                                            ))}
                                        </select>
                                        {errors.budget_id && <div className="text-red-500 text-sm">{errors.budget_id}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>Budget Item <span className="text-red-500">*</span></label>
                                        <select 
                                            value={data.budget_item_id} 
                                            onChange={e => setData('budget_item_id', e.target.value)}
                                            disabled={!data.budget_id || loadingItems || viewMode === 'edit'}
                                            required
                                        >
                                            <option value="">{loadingItems ? 'Loading...' : 'Select Item'}</option>
                                            {budgetItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} (Avail: {parseFloat(item.available_balance).toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.budget_item_id && <div className="text-red-500 text-sm">{errors.budget_item_id}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>Vendor</label>
                                        <select 
                                            value={data.vendor_id} 
                                            onChange={e => setData('vendor_id', e.target.value)}
                                        >
                                            <option value="">Select Vendor</option>
                                            {vendors.map(v => (
                                                <option key={v.id} value={v.id}>{v.name_en || v.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea 
                                            value={data.description} 
                                            onChange={e => setData('description', e.target.value)}
                                            rows="3"
                                        ></textarea>
                                    </div>
                                </div>

                                {/* Right Panel: Details & Amount */}
                                <div className="panel">
                                    <div className="section-title">Reference & Amount</div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label>Ref Type <span className="text-red-500">*</span></label>
                                            <select 
                                                value={data.reference_type} 
                                                onChange={e => setData('reference_type', e.target.value)}
                                                required
                                            >
                                                <option value="purchase_order">Purchase Order</option>
                                                <option value="contract">Contract</option>
                                                <option value="invoice">Invoice</option>
                                                <option value="requisition">Requisition</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Ref Number <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={data.reference_number} 
                                                onChange={e => setData('reference_number', e.target.value)}
                                                required
                                            />
                                            {errors.reference_number && <div className="text-red-500 text-sm">{errors.reference_number}</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Ref ID (Lookup)</label>
                                        <input 
                                            type="text" 
                                            value={data.reference_id} 
                                            onChange={e => setData('reference_id', e.target.value)}
                                            placeholder="External System ID"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label>Commitment Date <span className="text-red-500">*</span></label>
                                            <input 
                                                type="date" 
                                                value={data.commitment_date} 
                                                onChange={e => setData('commitment_date', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Expiry Date</label>
                                            <input 
                                                type="date" 
                                                value={data.expiry_date} 
                                                onChange={e => setData('expiry_date', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Committed Amount <span className="text-red-500">*</span></label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={data.committed_amount} 
                                            onChange={e => setData('committed_amount', e.target.value)}
                                            className={isOverBudget ? 'border-red-500' : ''}
                                            required
                                        />
                                        {errors.committed_amount && <div className="text-red-500 text-sm">{errors.committed_amount}</div>}
                                        
                                        {selectedItem && (
                                            <div className={`amount-display ${isOverBudget ? 'border-red-500' : ''}`}>
                                                <div>
                                                    <span>Available Balance:</span>
                                                    <span>{parseFloat(availableBalance).toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span>Commitment:</span>
                                                    <span className={isOverBudget ? 'text-red-600' : ''}>
                                                        {data.committed_amount ? parseFloat(data.committed_amount).toLocaleString() : '0'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span>Remaining After:</span>
                                                    <span className={(availableBalance - data.committed_amount) < 0 ? 'text-red-600' : 'text-green-600'}>
                                                        {(availableBalance - (data.committed_amount || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {isOverBudget && <div className="text-red-500 text-xs mt-1">Exceeds available budget!</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-4">
                                <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={processing}>
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    disabled={processing || (isOverBudget && viewMode === 'create')}
                                >
                                    {processing ? 'Saving...' : 'Save Commitment'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
