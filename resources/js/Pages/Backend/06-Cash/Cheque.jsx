import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/main.scss';

const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(amount || 0));
};

const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (includeTime) {
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString();
};

const Cheque = ({ cheques = { data: [] }, filters = {}, stats = {}, accounts = [] }) => {
    
    // State management following Employees.jsx pattern
    const [showForm, setShowForm] = useState(false);
    const [viewingCheque, setViewingCheque] = useState(null);
    const [editingCheque, setEditingCheque] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [activeTab, setActiveTab] = useState(filters.status || 'all');
    const [toast, setToast] = useState(null);

    // Main Form Hook
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        cheque_no: '',
        bank_name: '',
        account_id: '',
        owner_name: '',
        cheque_type: 'received',
        amount: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'pending',
        reference_no: '',
        notes: '',
    });

    // Toast notification helper
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Sync form data when editingCheque changes
    useEffect(() => {
        if (editingCheque) {
            setData({
                cheque_no: editingCheque.cheque_no || '',
                bank_name: editingCheque.bank_name || '',
                account_id: editingCheque.account_id || '',
                owner_name: editingCheque.owner_name || '',
                cheque_type: editingCheque.cheque_type || 'received',
                amount: editingCheque.amount || '',
                issue_date: editingCheque.issue_date || new Date().toISOString().split('T')[0],
                due_date: editingCheque.due_date || '',
                status: editingCheque.status || 'pending',
                reference_no: editingCheque.reference_no || '',
                notes: editingCheque.notes || '',
            });
        } else {
            reset();
            clearErrors();
        }
    }, [editingCheque]);

    // Sync search term with filters
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                router.get(
                    route('admin.cheques.index'),
                    { ...filters, search: searchTerm, page: 1 },
                    { preserveState: true, preserveScroll: true, replace: true }
                );
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleTabChange = (status) => {
        setActiveTab(status);
        const newFilters = { ...filters, status: status === 'all' ? null : status, page: 1 };
        Object.keys(newFilters).forEach(key => newFilters[key] === null && delete newFilters[key]);
        
        router.get(route('admin.cheques.index'), newFilters, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this cheque?')) {
            router.delete(route('admin.cheques.destroy', id), {
                onSuccess: () => {
                    showToast('Cheque deleted successfully', 'success');
                    backToList();
                }
            });
        }
    };

    const backToList = () => {
        setShowForm(false);
        setEditingCheque(null);
        setViewingCheque(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        setEditingCheque(null);
        setViewingCheque(null);
        setShowForm(true);
    };

    const openEdit = (cheque) => {
        setEditingCheque(cheque);
        setViewingCheque(null);
        setShowForm(true);
    };

    const openDetails = (cheque) => {
        setViewingCheque(cheque);
        setEditingCheque(null);
        setShowForm(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingCheque) {
            put(route('admin.cheques.update', editingCheque.id), {
                onSuccess: () => {
                    showToast('Cheque updated successfully', 'success');
                    backToList();
                }
            });
        } else {
            post(route('admin.cheques.store'), {
                onSuccess: () => {
                    showToast('Cheque created successfully', 'success');
                    backToList();
                }
            });
        }
    };

    const renderBreadcrumbs = () => (
        <div className="breadcrumb">
            <Link href={route('admin.dashboard')}>Dashboard</Link>
            <span>/</span>
            <a href="#" onClick={(e) => { e.preventDefault(); backToList(); }}>Cash & Bank</a>
            <span>/</span>
            <span>Cheque Management</span>
            {(showForm || viewingCheque) && (
                <>
                    <span>/</span>
                    <span>
                        {editingCheque ? 'Edit Cheque' : 
                         showForm ? 'Add New Cheque' : 
                         'Cheque Details'}
                    </span>
                </>
            )}
        </div>
    );

    const renderListView = () => (
        <div className="fade-in">
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.collected || 0}</div>
                        <div className="stat-label">Collected</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">schedule</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.pending || 0}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">payments</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.total || 0}</div>
                        <div className="stat-label">Total Cheques</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                        <span className="material-icons-outlined">error</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.bounced || 0}</div>
                        <div className="stat-label">Bounced</div>
                    </div>
                </div>
            </div>

            <div className="filter-tabs">
                {['all', 'pending', 'collected', 'bounced', 'cancelled'].map(tab => (
                    <div
                        key={tab}
                        className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} Cheques
                    </div>
                ))}
            </div>

            <div className="cheques-card fade-in">
                <div className="card-header">
                    <div className="cheques-actions">
                        <select className="btn btn-outline" id="bulkActions">
                            <option value="">Bulk Actions</option>
                            <option value="collect">Mark Collected</option>
                            <option value="bounce">Mark Bounced</option>
                            <option value="delete">Delete Selected</option>
                        </select>
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search by cheque number, bank, or owner..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="button">
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <button type="button" onClick={openCreate} className="btn btn-primary">
                            <span className="material-icons-outlined">add</span>
                            <span>Add New Cheque</span>
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-outline"
                            onClick={() => {
                                router.reload();
                                showToast('List refreshed', 'success');
                            }}
                        >
                            <span className="material-icons-outlined">refresh</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox" id="selectAll" />
                                </th>
                                <th>Cheque No</th>
                                <th>Bank / Owner</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Issue Date</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cheques.data.length > 0 ? (
                                cheques.data.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <input type="checkbox" />
                                        </td>
                                        <td>
                                            <div className="font-medium text-slate-700">{item.cheque_no}</div>
                                            {item.reference_no && (
                                                <div className="text-xs text-slate-500">Ref: {item.reference_no}</div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="font-medium">{item.bank_name}</div>
                                            <div className="text-sm text-slate-500">{item.owner_name}</div>
                                        </td>
                                        <td>
                                            <span className={`type-badge ${item.cheque_type === 'received' ? 'received' : 'issued'}`}>
                                                {item.cheque_type === 'received' ? 'Receivable' : 'Payable'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="font-bold text-slate-700">
                                                {formatAmount(item.amount)}
                                            </div>
                                        </td>
                                        <td>{formatDate(item.issue_date)}</td>
                                        <td>
                                            <span className={item.due_date && new Date(item.due_date) < new Date() && item.status === 'pending' ? 'text-red-600 font-medium' : ''}>
                                                {formatDate(item.due_date)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${item.status}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-group">
                                                <button type="button" onClick={() => openDetails(item)} className="icon-btn" style={{ color: 'var(--info-color)' }} title="View Details">
                                                    <span className="material-icons-outlined">visibility</span>
                                                </button>
                                                <button type="button" onClick={() => openEdit(item)} className="icon-btn edit" title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button type="button" onClick={() => handleDelete(item.id)} className="icon-btn delete" title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-color)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: '#cbd5e1' }}>
                                            info
                                        </span>
                                        No cheques found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {cheques.links && cheques.links.length > 3 && (
                    <div className="pagination">
                        <div className="pagination-info">
                            <select className="select-dropdown">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>
                            <span>
                                Show from {cheques.from} to {cheques.to} in
                                <span style={{ backgroundColor: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', marginLeft: '8px', marginRight: '8px' }}>
                                    {cheques.total}
                                </span>
                                records
                            </span>
                        </div>
                        <div className="pagination-controls">
                            {cheques.links.map((link, key) => (
                                <Link
                                    key={key}
                                    href={link.url}
                                    className={`page-btn ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderFormView = () => {
        const isEditing = !!editingCheque;
        
        return (
            <div className="fade-in">
                <div className="cheques-card">
                    <div className="card-header">
                        <h3>{isEditing ? `Edit Cheque: ${editingCheque.cheque_no}` : 'Add New Cheque'}</h3>
                        <button className="btn btn-outline" onClick={backToList}>
                            <span className="material-icons-outlined">arrow_back</span>
                            <span>Back to List</span>
                        </button>
                    </div>
                    
                    <div className="card-body" style={{ padding: '20px' }}>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label">Cheque Type *</label>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="cheque_type" 
                                            checked={data.cheque_type === 'received'} 
                                            onChange={() => setData('cheque_type', 'received')}
                                        />
                                        <span>Receivable (Received)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="cheque_type" 
                                            checked={data.cheque_type === 'issued'}
                                            onChange={() => setData('cheque_type', 'issued')}
                                        />
                                        <span>Payable (Issued)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Cheque Number *</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Enter cheque number" 
                                        value={data.cheque_no}
                                        onChange={e => setData('cheque_no', e.target.value)}
                                        required 
                                    />
                                    {errors.cheque_no && <div className="text-danger text-xs mt-1">{errors.cheque_no}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="form-control" 
                                        placeholder="0.00" 
                                        value={data.amount}
                                        onChange={e => setData('amount', e.target.value)}
                                        required 
                                    />
                                    {errors.amount && <div className="text-danger text-xs mt-1">{errors.amount}</div>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Bank Name *</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Enter bank name" 
                                        value={data.bank_name}
                                        onChange={e => setData('bank_name', e.target.value)}
                                        required 
                                    />
                                    {errors.bank_name && <div className="text-danger text-xs mt-1">{errors.bank_name}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{data.cheque_type === 'received' ? 'Drawer Name' : 'Payee Name'} *</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Enter name" 
                                        value={data.owner_name}
                                        onChange={e => setData('owner_name', e.target.value)}
                                        required 
                                    />
                                    {errors.owner_name && <div className="text-danger text-xs mt-1">{errors.owner_name}</div>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Issue Date *</label>
                                    <input 
                                        type="date" 
                                        className="form-control" 
                                        value={data.issue_date}
                                        onChange={e => setData('issue_date', e.target.value)}
                                        required 
                                    />
                                    {errors.issue_date && <div className="text-danger text-xs mt-1">{errors.issue_date}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input 
                                        type="date" 
                                        className="form-control" 
                                        value={data.due_date}
                                        onChange={e => setData('due_date', e.target.value)}
                                    />
                                    {errors.due_date && <div className="text-danger text-xs mt-1">{errors.due_date}</div>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status *</label>
                                    <select 
                                        className="form-control" 
                                        value={data.status}
                                        onChange={e => setData('status', e.target.value)}
                                        required
                                    > 
                                        <option value="pending">Pending</option> 
                                        <option value="collected">Collected</option> 
                                        <option value="bounced">Bounced</option> 
                                        <option value="cancelled">Cancelled</option>
                                    </select> 
                                    {errors.status && <div className="text-danger text-xs mt-1">{errors.status}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Linked Account</label>
                                    <select 
                                        className="form-control"
                                        value={data.account_id}
                                        onChange={e => setData('account_id', e.target.value)}
                                    > 
                                        <option value="">-- Select Account (Optional) --</option> 
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.account_code})
                                            </option>
                                        ))}
                                    </select> 
                                    {errors.account_id && <div className="text-danger text-xs mt-1">{errors.account_id}</div>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Reference No</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Enter reference number"
                                    value={data.reference_no}
                                    onChange={e => setData('reference_no', e.target.value)}
                                /> 
                                {errors.reference_no && <div className="text-danger text-xs mt-1">{errors.reference_no}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea 
                                    className="form-control form-textarea" 
                                    placeholder="Add any additional notes here..."
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows="3"
                                ></textarea> 
                                {errors.notes && <div className="text-danger text-xs mt-1">{errors.notes}</div>}
                            </div>

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={backToList}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    <span className="material-icons-outlined">save</span>
                                    <span>{processing ? 'Saving...' : (isEditing ? 'Update Cheque' : 'Save Cheque')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const renderDetailsView = () => (
        <div className="fade-in">
            <div className="cheques-card">
                <div className="card-header">
                    <h3>Cheque Details: {viewingCheque?.cheque_no}</h3>
                    <div className="actions">
                        <button className="btn btn-outline" onClick={backToList}>
                            <span className="material-icons-outlined">arrow_back</span>
                            <span>Back to List</span>
                        </button>
                        <button className="btn btn-primary" onClick={() => openEdit(viewingCheque)}>
                            <span className="material-icons-outlined">edit</span>
                            <span>Edit Cheque</span>
                        </button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                    <div className="employee-details-grid">
                        <div className="detail-row">
                            <span className="detail-label">Cheque Number:</span>
                            <span className="detail-value">{viewingCheque?.cheque_no}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Bank Name:</span>
                            <span className="detail-value">{viewingCheque?.bank_name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Owner / Drawer:</span>
                            <span className="detail-value">{viewingCheque?.owner_name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Amount:</span>
                            <span className="detail-value" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{formatAmount(viewingCheque?.amount)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">
                                <span className={`type-badge ${viewingCheque?.cheque_type === 'received' ? 'received' : 'issued'}`}>
                                    {viewingCheque?.cheque_type === 'received' ? 'Receivable' : 'Payable'}
                                </span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">
                                <span className={`status-badge ${viewingCheque?.status}`}>
                                    {viewingCheque?.status}
                                </span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Issue Date:</span>
                            <span className="detail-value">{formatDate(viewingCheque?.issue_date)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Due Date:</span>
                            <span className="detail-value">{formatDate(viewingCheque?.due_date)}</span>
                        </div>
                        {viewingCheque?.reference_no && (
                            <div className="detail-row">
                                <span className="detail-label">Reference No:</span>
                                <span className="detail-value">{viewingCheque.reference_no}</span>
                            </div>
                        )}
                    </div>

                    {viewingCheque?.notes && (
                        <div style={{ marginTop: '20px' }}>
                            <span className="detail-label" style={{ display: 'block', marginBottom: '8px' }}>Notes:</span>
                            <div className="detail-value" style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {viewingCheque.notes}
                            </div>
                        </div>
                    )}

                    {viewingCheque?.transactions && viewingCheque.transactions.length > 0 && (
                        <div className="history-section" style={{ marginTop: '30px' }}>
                            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                                <span className="material-icons-outlined">history</span> Transaction History
                            </div>
                            <div className="timeline">
                                {viewingCheque.transactions.map((transaction, index) => (
                                    <div key={transaction.id || index} className="timeline-item">
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-content">
                                            <div className="timeline-header">
                                                <div className="timeline-action">
                                                    {transaction.action.replace('_', ' ')}
                                                </div>
                                                <div className="timeline-date">
                                                    {formatDate(transaction.created_at || transaction.action_date, true)}
                                                </div>
                                            </div>
                                            {transaction.notes && (
                                                <div className="timeline-notes">
                                                    {transaction.notes}
                                                </div>
                                            )}
                                            <div className="timeline-meta">
                                                <span>Amount: {formatAmount(transaction.amount)}</span>
                                                {transaction.creator && (
                                                    <span>• By: {transaction.creator.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu="Cheque">
            <Head title="Cheque Management" />
            
            {/* Toast Notification matching Employees.jsx style */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <div style={{ padding: '20px', width: '100%' }}>
                {renderBreadcrumbs()}
                
                {!showForm && !viewingCheque && renderListView()}
                {showForm && renderFormView()}
                {viewingCheque && !showForm && renderDetailsView()}
            </div>
        </AdminLayout>
    );
};

export default Cheque;
