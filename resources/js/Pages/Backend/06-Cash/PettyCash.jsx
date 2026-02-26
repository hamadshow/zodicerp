import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


const StatsCard = ({ icon, bgColor, value, label }) => (
    <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: bgColor }}>
            <span className="material-icons-outlined">{icon}</span>
        </div>
        <div className="stat-content">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    </div>
);

const FilterTab = ({ id, label, isActive, onClick }) => (
    <div
        className={`filter-tab ${isActive ? 'active' : ''}`}
        onClick={() => onClick(id)}
    >
        {label}
    </div>
);

const AddEditCashModal = ({ isOpen, onClose, cashAccount, isEditing, banks, currencies }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        account_code: '',
        name: '',
        type: 'Petty Cash',
        bank_id: '',
        currency: '',
        opening_balance: 0,
        current_balance: 0,
        status: 'active',
        is_default: false,
    });

    useEffect(() => {
        if (cashAccount) {
            setData({
                account_code: cashAccount.account_code || '',
                name: cashAccount.name || '',
                type: cashAccount.type || 'Petty Cash',
                bank_id: cashAccount.bank_id || '',
                currency: cashAccount.currency || '',
                opening_balance: cashAccount.opening_balance || 0,
                current_balance: cashAccount.current_balance || 0,
                status: cashAccount.status || 'active',
                is_default: cashAccount.is_default || false,
            });
        } else {
            reset();
            setData('type', 'Petty Cash');
            setData('currency', '');
            setData('status', 'active');
            setData('opening_balance', 0);
            setData('current_balance', 0);
        }
    }, [cashAccount, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(route('admin.petty-cash.update', cashAccount.id), {
                onSuccess: onClose,
            });
        } else {
            post(route('admin.petty-cash.store'), {
                onSuccess: onClose,
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Cash Account' : 'Add Cash Account'}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Account Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.account_code}
                                    onChange={(e) => setData('account_code', e.target.value)}
                                    placeholder="e.g. CASH001"
                                />
                                {errors.account_code && <div className="text-red-500 text-xs mt-1">{errors.account_code}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select
                                    className="form-select"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                >
                                    <option value="Petty Cash">Petty Cash</option>
                                    <option value="Cash in Hand">Cash in Hand</option>
                                    <option value="Cash Register">Cash Register</option>
                                </select>
                                {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Account Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Cash Account Name"
                            />
                            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Bank</label>
                                <select
                                    className="form-select"
                                    value={data.bank_id}
                                    onChange={(e) => setData('bank_id', e.target.value)}
                                >
                                    <option value="">No Bank</option>
                                    {banks.map((bank) => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.bank_id && <div className="text-red-500 text-xs mt-1">{errors.bank_id}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Currency</label>
                                <select
                                    className="form-select"
                                    value={data.currency}
                                    onChange={(e) => setData('currency', e.target.value)}
                                >
                                    <option value="">Select Currency</option>
                                    {currencies && currencies.map((curr) => (
                                        <option key={curr.id} value={curr.id}>
                                            {curr.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.currency && <div className="text-red-500 text-xs mt-1">{errors.currency}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Opening Balance</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.opening_balance}
                                    onChange={(e) => setData('opening_balance', e.target.value)}
                                />
                                {errors.opening_balance && <div className="text-red-500 text-xs mt-1">{errors.opening_balance}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Current Balance</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.current_balance}
                                    onChange={(e) => setData('current_balance', e.target.value)}
                                />
                                {errors.current_balance && <div className="text-red-500 text-xs mt-1">{errors.current_balance}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {errors.status && <div className="text-red-500 text-xs mt-1">{errors.status}</div>}
                            </div>
                            <div className="form-group flex items-end mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_default}
                                        onChange={(e) => setData('is_default', e.target.checked)}
                                    />
                                    <span>Default Account</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : (isEditing ? 'Update Account' : 'Save Account')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ViewCashModal = ({ isOpen, onClose, cashAccount }) => {
    if (!isOpen || !cashAccount) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="modal-content large">
                <div className="modal-header">
                    <h2>{cashAccount.name} - Details</h2>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    <div className="bank-details-grid">
                        <div className="bank-info-sidebar">
                            <div className="bank-logo-preview">
                                <span className="material-icons-outlined text-4xl text-gray-300">account_balance_wallet</span>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Account Code</div>
                                <div className="info-value">{cashAccount.account_code}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Type</div>
                                <div className="info-value">{cashAccount.type || '-'}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Status</div>
                                <span className={`status-badge status-${cashAccount.status}`}>
                                    {cashAccount.status}
                                </span>
                            </div>
                        </div>
                        <div className="accounts-section">
                            <div className="section-header">
                                <div className="section-title">Account Info</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Bank</div>
                                <div className="info-value">{cashAccount.bank?.name || '-'}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Currency</div>
                                <div className="info-value">{cashAccount.currency}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Opening Balance</div>
                                <div className="info-value">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cashAccount.opening_balance || 0)}
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Current Balance</div>
                                <div className="info-value">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cashAccount.current_balance || 0)}
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Default</div>
                                <div className="info-value">{cashAccount.is_default ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PettyCash = ({ cashAccounts, filters, banks, currencies }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [addEditModalOpen, setAddEditModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editingCash, setEditingCash] = useState(null);
    const [viewingCash, setViewingCash] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                router.get(route('admin.petty-cash.index'), {
                    search: searchTerm,
                    status: statusFilter === 'all' ? null : statusFilter,
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleFilterChange = (status) => {
        setStatusFilter(status);
        router.get(route('admin.petty-cash.index'), {
            search: searchTerm,
            status: status === 'all' ? null : status,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openAddModal = () => {
        setEditingCash(null);
        setAddEditModalOpen(true);
    };

    const openEditModal = (cash) => {
        setEditingCash(cash);
        setAddEditModalOpen(true);
    };

    const openViewModal = (cash) => {
        setViewingCash(cash);
        setViewModalOpen(true);
    };

    const handleDelete = (cash) => {
        if (confirm('Are you sure you want to delete this cash account?')) {
            router.delete(route('admin.petty-cash.destroy', cash.id));
        }
    };

    const totalAccounts = cashAccounts.total;
    const activeAccounts = cashAccounts.data.filter((c) => c.status === 'active').length;
    const totalBalance = cashAccounts.data.reduce((sum, c) => sum + Number(c.current_balance || 0), 0);

    return (
        <AdminLayout activeMenu="Cash">
            <Head title="Petty Cash Accounts" />
            <div className="bank-page">
                <div className="breadcrumb mb-6 text-sm text-gray-500">
                    <span className="cursor-pointer hover:text-blue-600" onClick={() => router.visit(route('admin.dashboard'))}>Dashboard</span>
                    <span className="mx-2">/</span>
                    <span>Cash & Banks</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 font-medium">Cash</span>
                </div>

                <div className="stats-cards">
                    <StatsCard
                        icon="account_balance_wallet"
                        bgColor="#3b82f6"
                        value={totalAccounts}
                        label="Total Accounts"
                    />
                    <StatsCard
                        icon="check_circle"
                        bgColor="#10b981"
                        value={activeAccounts + (cashAccounts.total > cashAccounts.per_page ? '+' : '')}
                        label="Active (Page)"
                    />
                    <StatsCard
                        icon="payments"
                        bgColor="#f59e0b"
                        value={new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totalBalance)}
                        label="Total Balance (Page)"
                    />
                </div>

                <div className="filter-tabs">
                    <FilterTab
                        id="all"
                        label="All Accounts"
                        isActive={statusFilter === 'all'}
                        onClick={handleFilterChange}
                    />
                    <FilterTab
                        id="active"
                        label="Active"
                        isActive={statusFilter === 'active'}
                        onClick={handleFilterChange}
                    />
                    <FilterTab
                        id="inactive"
                        label="Inactive"
                        isActive={statusFilter === 'inactive'}
                        onClick={handleFilterChange}
                    />
                </div>

                <div className="bank-card">
                    <div className="card-header">
                        <div className="search-bar">
                            <span className="material-icons-outlined">search</span>
                            <input
                                type="text"
                                placeholder="Search cash accounts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="actions">
                            <button className="btn btn-primary" onClick={openAddModal}>
                                <span className="material-icons-outlined">add</span>
                                Add Cash Account
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Account</th>
                                    <th>Code</th>
                                    <th>Type</th>
                                    <th>Bank</th>
                                    <th>Currency</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cashAccounts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-gray-500">
                                            No cash accounts found.
                                        </td>
                                    </tr>
                                ) : (
                                    cashAccounts.data.map((cash) => (
                                        <tr key={cash.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                        <span className="material-icons-outlined text-gray-400 text-sm">account_balance_wallet</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{cash.name}</div>
                                                        {cash.is_default && (
                                                            <div className="text-xs text-blue-600">Default</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{cash.account_code}</td>
                                            <td>{cash.type || '-'}</td>
                                            <td>{cash.bank?.name || '-'}</td>
                                            <td><span className="currency-badge">{cash.currency}</span></td>
                                            <td>
                                                <div className="balance-value">
                                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cash.current_balance || 0)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${cash.status}`}>
                                                    {cash.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="icon-btn view" title="View" onClick={() => openViewModal(cash)}>
                                                        <span className="material-icons-outlined">visibility</span>
                                                    </button>
                                                    <button className="icon-btn edit" title="Edit" onClick={() => openEditModal(cash)}>
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button className="icon-btn delete" title="Delete" onClick={() => handleDelete(cash)}>
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {cashAccounts.links && cashAccounts.links.length > 3 && (
                        <div className="pagination">
                            <div className="text-sm text-gray-500">
                                Showing {cashAccounts.from} to {cashAccounts.to} of {cashAccounts.total} entries
                            </div>
                            <div className="flex gap-1">
                                {cashAccounts.links.map((link, i) => (
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`page-btn ${link.active ? 'active' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="page-btn disabled"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            style={{ opacity: 0.5, cursor: 'default' }}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AddEditCashModal
                isOpen={addEditModalOpen}
                onClose={() => setAddEditModalOpen(false)}
                cashAccount={editingCash}
                isEditing={!!editingCash}
                banks={banks}
                currencies={currencies}
            />

            <ViewCashModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                cashAccount={viewingCash}
            />
        </AdminLayout>
    );
};

export default PettyCash;
