import React, { useState, useEffect, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


const resolveMediaUrl = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
    }

    const withoutProtocol =
        typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

    const relativePath = withoutProtocol.replace(
        /^\/?(files|storage|media-files)\//,
        ''
    );

    return `/media-files/${relativePath}`;
};

// --- Components ---

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

// --- Modals ---

const AddEditBankModal = ({ isOpen, onClose, bank, isEditing, currencies }) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        bank_code: '',
        name: '',
        short_name: '',
        swift_code: '',
        iban_prefix: '',
        country: '',
        currency: '',
        status: 'active',
        logo: null,
    });

    useEffect(() => {
        if (bank) {
            setData({
                bank_code: bank.bank_code || '',
                name: bank.name || '',
                short_name: bank.short_name || '',
                swift_code: bank.swift_code || '',
                iban_prefix: bank.iban_prefix || '',
                country: bank.country || '',
                currency: bank.currency || '',
                status: bank.status || 'active',
                logo: null, // Don't set file input value
            });
        } else {
            reset();
        }
    }, [bank, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            // Use router.post with _method: put for file upload support in Inertia
            router.post(route('admin.banks.update', bank.id), {
                _method: 'put',
                ...data,
            }, {
                onSuccess: onClose,
            });
        } else {
            post(route('admin.banks.store'), {
                onSuccess: onClose,
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Bank' : 'Add New Bank'}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Bank Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.bank_code}
                                    onChange={e => setData('bank_code', e.target.value)}
                                    placeholder="e.g. BNK001"
                                />
                                {errors.bank_code && <div className="text-red-500 text-xs mt-1">{errors.bank_code}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Short Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.short_name}
                                    onChange={e => setData('short_name', e.target.value)}
                                    placeholder="e.g. Chase"
                                />
                                {errors.short_name && <div className="text-red-500 text-xs mt-1">{errors.short_name}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Bank Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Full Bank Name"
                            />
                            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">SWIFT Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.swift_code}
                                    onChange={e => setData('swift_code', e.target.value)}
                                />
                                {errors.swift_code && <div className="text-red-500 text-xs mt-1">{errors.swift_code}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">IBAN Prefix</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.iban_prefix}
                                    onChange={e => setData('iban_prefix', e.target.value)}
                                />
                                {errors.iban_prefix && <div className="text-red-500 text-xs mt-1">{errors.iban_prefix}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Country</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.country}
                                    onChange={e => setData('country', e.target.value)}
                                />
                                {errors.country && <div className="text-red-500 text-xs mt-1">{errors.country}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Currency</label>
                                <select
                                    className="form-select"
                                    value={data.currency}
                                    onChange={e => setData('currency', e.target.value)}
                                >
                                    <option value="">Select Currency</option>
                                    {currencies && currencies.map(curr => (
                                        <option key={curr.id} value={curr.code}>
                                            {curr.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.currency && <div className="text-red-500 text-xs mt-1">{errors.currency}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {errors.status && <div className="text-red-500 text-xs mt-1">{errors.status}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Logo</label>
                                <input
                                    type="file"
                                    className="form-input"
                                    onChange={e => setData('logo', e.target.files[0])}
                                    accept="image/*"
                                />
                                {errors.logo && <div className="text-red-500 text-xs mt-1">{errors.logo}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : (isEditing ? 'Update Bank' : 'Save Bank')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditAccountModal = ({ isOpen, onClose, bankId, account, isEditing, glAccounts, onSuccess, currencies }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        bank_id: bankId,
        account_name: '',
        account_number: '',
        iban: '',
        currency: '',
        opening_balance: 0,
        current_balance: 0,
        gl_account_id: '',
        is_default: false,
        status: 'active',
    });

    useEffect(() => {
        if (account) {
            setData({
                bank_id: account.bank_id,
                account_name: account.account_name || '',
                account_number: account.account_number || '',
                iban: account.iban || '',
                currency: account.currency || '',
                opening_balance: account.opening_balance || 0,
                current_balance: account.current_balance || 0,
                gl_account_id: account.gl_account_id || '',
                is_default: account.is_default || false,
                status: account.status || 'active',
            });
        } else {
            reset();
            setData('bank_id', bankId);
            setData('currency', '');
        }
    }, [account, bankId, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const options = {
            onSuccess: () => {
                onSuccess();
                onClose();
            },
            preserveScroll: true,
        };

        if (isEditing) {
            put(route('admin.banks.accounts.update', account.id), options);
        } else {
            post(route('admin.banks.accounts.store'), options);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`} style={{ zIndex: 1100 }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Account' : 'Add Bank Account'}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Account Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.account_name}
                                onChange={e => setData('account_name', e.target.value)}
                                placeholder="e.g. Corporate Checking"
                            />
                            {errors.account_name && <div className="text-red-500 text-xs mt-1">{errors.account_name}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Account Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.account_number}
                                    onChange={e => setData('account_number', e.target.value)}
                                />
                                {errors.account_number && <div className="text-red-500 text-xs mt-1">{errors.account_number}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Currency</label>
                                <select
                                    className="form-select"
                                    value={data.currency}
                                    onChange={e => setData('currency', e.target.value)}
                                >
                                    <option value="">Select Currency</option>
                                    {currencies && currencies.map(curr => (
                                        <option key={curr.id} value={curr.id}>
                                            {curr.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.currency && <div className="text-red-500 text-xs mt-1">{errors.currency}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">IBAN</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.iban}
                                onChange={e => setData('iban', e.target.value)}
                            />
                            {errors.iban && <div className="text-red-500 text-xs mt-1">{errors.iban}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Opening Balance</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.opening_balance}
                                    onChange={e => setData('opening_balance', e.target.value)}
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
                                    onChange={e => setData('current_balance', e.target.value)}
                                />
                                {errors.current_balance && <div className="text-red-500 text-xs mt-1">{errors.current_balance}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Linked GL Account</label>
                            <select
                                className="form-select"
                                value={data.gl_account_id}
                                onChange={e => setData('gl_account_id', e.target.value)}
                            >
                                <option value="">Select Account</option>
                                {glAccounts.map(acc => (
                                    <option key={acc.AccID} value={acc.AccID}>
                                        {acc.AccCode} - {acc.AccName}
                                    </option>
                                ))}
                            </select>
                            {errors.gl_account_id && <div className="text-red-500 text-xs mt-1">{errors.gl_account_id}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="form-group flex items-end mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_default}
                                        onChange={e => setData('is_default', e.target.checked)}
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

const ViewBankModal = ({ isOpen, onClose, bank, glAccounts, currencies }) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);

    const fetchAccounts = useCallback(async () => {
        if (!bank) return;
        setLoading(true);
        try {
            const response = await fetch(route('admin.banks.accounts.index', bank.id));
            if (response.ok) {
                const data = await response.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    }, [bank]);

    useEffect(() => {
        if (isOpen && bank) {
            fetchAccounts();
        }
    }, [isOpen, bank, fetchAccounts]);

    const handleAddAccount = () => {
        setEditingAccount(null);
        setAccountModalOpen(true);
    };

    const handleEditAccount = (account) => {
        setEditingAccount(account);
        setAccountModalOpen(true);
    };

    const handleDeleteAccount = (id) => {
        if (confirm('Are you sure you want to delete this account?')) {
            router.delete(route('admin.banks.accounts.destroy', id), {
                onSuccess: () => fetchAccounts(),
                preserveScroll: true,
            });
        }
    };

    if (!isOpen || !bank) return null;

    return (
        <>
            <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
                <div className="modal-content large">
                    <div className="modal-header">
                        <h2>{bank.name} - Details & Accounts</h2>
                        <button className="close-btn" onClick={onClose}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="bank-details-grid">
                            <div className="bank-info-sidebar">
                                <div className="bank-logo-preview">
                                    {bank.logo ? (
                                        <img src={resolveMediaUrl(bank.logo)} alt={bank.name} />
                                    ) : (
                                        <span className="material-icons-outlined text-4xl text-gray-300">account_balance</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Bank Code</div>
                                    <div className="info-value">{bank.bank_code}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Swift Code</div>
                                    <div className="info-value">{bank.swift_code || '-'}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Country</div>
                                    <div className="info-value">{bank.country || '-'}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Currency</div>
                                    <div className="info-value">{bank.currency}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Status</div>
                                    <span className={`status-badge status-${bank.status}`}>
                                        {bank.status}
                                    </span>
                                </div>
                            </div>

                            <div className="accounts-section">
                                <div className="section-header">
                                    <div className="section-title">Bank Accounts</div>
                                    <button className="btn btn-primary" onClick={handleAddAccount} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add</span>
                                        Add Account
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="loading-spinner">
                                        <div className="spinner"></div>
                                        <p>Loading accounts...</p>
                                    </div>
                                ) : (
                                    <table className="accounts-table">
                                        <thead>
                                            <tr>
                                                <th>Account Name</th>
                                                <th>Number / IBAN</th>
                                                <th>Currency</th>
                                                <th>Balance</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {accounts.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center text-gray-500 py-4">
                                                        No accounts found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                accounts.map(acc => (
                                                    <tr key={acc.id}>
                                                        <td>
                                                            <div className="font-medium">{acc.account_name}</div>
                                                            {acc.is_default && (
                                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Default</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="text-sm">{acc.account_number}</div>
                                                            <div className="text-xs text-gray-500">{acc.iban}</div>
                                                        </td>
                                                        <td>
                                                            <span className="currency-badge">{acc.currency_info?.code || acc.currency}</span>
                                                        </td>
                                                        <td>
                                                            <div className="balance-value">{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(acc.current_balance)}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge status-${acc.status}`}>
                                                                {acc.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-2">
                                                                <button className="icon-btn edit" onClick={() => handleEditAccount(acc)}>
                                                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                                </button>
                                                                <button className="icon-btn delete" onClick={() => handleDeleteAccount(acc.id)}>
                                                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddEditAccountModal
                isOpen={accountModalOpen}
                onClose={() => setAccountModalOpen(false)}
                bankId={bank?.id}
                account={editingAccount}
                isEditing={!!editingAccount}
                glAccounts={glAccounts}
                onSuccess={fetchAccounts}
                currencies={currencies}
            />
        </>
    );
};

// --- Main Page Component ---

const Bank = ({ banks, filters, glAccounts, currencies }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [addEditModalOpen, setAddEditModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState(null);
    const [viewingBank, setViewBank] = useState(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                router.get(route('admin.banks.index'), {
                    search: searchTerm,
                    status: statusFilter === 'all' ? null : statusFilter
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Handle filter change
    const handleFilterChange = (status) => {
        setStatusFilter(status);
        router.get(route('admin.banks.index'), {
            search: searchTerm,
            status: status === 'all' ? null : status
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openAddModal = () => {
        setEditingBank(null);
        setAddEditModalOpen(true);
    };

    const openEditModal = (bank) => {
        setEditingBank(bank);
        setAddEditModalOpen(true);
    };

    const openViewModal = (bank) => {
        setViewBank(bank);
        setViewModalOpen(true);
    };

    const handleDelete = (bank) => {
        if (confirm('Are you sure you want to delete this bank? All associated accounts will also be deleted.')) {
            router.delete(route('admin.banks.destroy', bank.id));
        }
    };

    return (
        <AdminLayout activeMenu="Banks">
            <Head title="Bank Management" />
            
            <div className="bank-page">
                <div className="breadcrumb mb-6 text-sm text-gray-500">
                    <span className="cursor-pointer hover:text-blue-600" onClick={() => router.visit(route('admin.dashboard'))}>Dashboard</span>
                    <span className="mx-2">/</span>
                    <span>Cash & Banks</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 font-medium">Banks</span>
                </div>

                {/* Stats Cards */}
                <div className="stats-cards">
                    <StatsCard
                        icon="account_balance"
                        bgColor="#3b82f6"
                        value={banks.total}
                        label="Total Banks"
                    />
                    <StatsCard
                        icon="check_circle"
                        bgColor="#10b981"
                        value={banks.data.filter(b => b.status === 'active').length + (banks.total > banks.per_page ? '+' : '')} 
                        label="Active (Page)"
                    />
                    <StatsCard
                        icon="account_balance_wallet"
                        bgColor="#f59e0b"
                        value={banks.data.reduce((acc, curr) => acc + (curr.accounts_count || 0), 0)}
                        label="Total Accounts (Page)"
                    />
                </div>

                {/* Filters */}
                <div className="filter-tabs">
                    <FilterTab
                        id="all"
                        label="All Banks"
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

                {/* Main Card */}
                <div className="bank-card">
                    <div className="card-header">
                        <div className="search-bar">
                            <span className="material-icons-outlined">search</span>
                            <input
                                type="text"
                                placeholder="Search banks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="actions">
                            <button className="btn btn-primary" onClick={openAddModal}>
                                <span className="material-icons-outlined">add</span>
                                Add Bank
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Bank</th>
                                    <th>Code</th>
                                    <th>Swift / IBAN Prefix</th>
                                    <th>Country</th>
                                    <th>Currency</th>
                                    <th>Accounts</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {banks.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-gray-500">
                                            No banks found.
                                        </td>
                                    </tr>
                                ) : (
                                    banks.data.map(bank => (
                                        <tr key={bank.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                        {bank.logo ? (
                                                            <img src={resolveMediaUrl(bank.logo)} alt={bank.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-icons-outlined text-gray-400 text-sm">account_balance</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{bank.name}</div>
                                                        <div className="text-xs text-gray-500">{bank.short_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{bank.bank_code}</td>
                                            <td>
                                                <div className="text-sm">{bank.swift_code || '-'}</div>
                                                <div className="text-xs text-gray-500">{bank.iban_prefix}</div>
                                            </td>
                                            <td>{bank.country || '-'}</td>
                                            <td><span className="currency-badge">{bank.currency}</span></td>
                                            <td>
                                                <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded text-xs font-medium">
                                                    {bank.accounts_count || 0} Accounts
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${bank.status}`}>
                                                    {bank.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button 
                                                        className="icon-btn view" 
                                                        title="View Details & Accounts"
                                                        onClick={() => openViewModal(bank)}
                                                    >
                                                        <span className="material-icons-outlined">visibility</span>
                                                    </button>
                                                    <button 
                                                        className="icon-btn edit" 
                                                        title="Edit Bank"
                                                        onClick={() => openEditModal(bank)}
                                                    >
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button 
                                                        className="icon-btn delete" 
                                                        title="Delete Bank"
                                                        onClick={() => handleDelete(bank)}
                                                    >
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

                    {/* Pagination */}
                    {banks.links && banks.links.length > 3 && (
                        <div className="pagination">
                            <div className="text-sm text-gray-500">
                                Showing {banks.from} to {banks.to} of {banks.total} entries
                            </div>
                            <div className="flex gap-1">
                                {banks.links.map((link, i) => (
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

            {/* Modals */}
            <AddEditBankModal
                isOpen={addEditModalOpen}
                onClose={() => setAddEditModalOpen(false)}
                bank={editingBank}
                isEditing={!!editingBank}
                currencies={currencies}
            />

            <ViewBankModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                bank={viewingBank}
                glAccounts={glAccounts}
                currencies={currencies}
            />
        </AdminLayout>
    );
};

export default Bank;
