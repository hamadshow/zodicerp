import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import ActionsCell from '@/Components/ActionsCell';
import SearchBar from '@/Components/search-bar';
import NavigationLink from '@/Components/NavigationLink';
import StatsCards from '@/Components/stats-cards';
import FilterTabs from '@/Components/filter-tabs';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';

const PettyCash = ({ cashAccounts, filters, banks, currencies, chartOfAccounts }) => {
    const [currentView, setCurrentView] = useState('list'); // list, create, edit, view
    const [selectedCash, setSelectedCash] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // Form logic
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
        if (selectedCash && (currentView === 'edit')) {
            setData({
                account_code: selectedCash.account_code || '',
                name: selectedCash.name || '',
                type: selectedCash.type || 'Petty Cash',
                bank_id: selectedCash.bank_id || '',
                currency: selectedCash.currency || '',
                opening_balance: selectedCash.opening_balance || 0,
                current_balance: selectedCash.current_balance || 0,
                status: selectedCash.status || 'active',
                is_default: selectedCash.is_default || false,
            });
        } else if (currentView === 'create') {
            reset();
            setData('type', 'Petty Cash');
            setData('status', 'active');
            setData('opening_balance', 0);
            setData('current_balance', 0);
        }
    }, [selectedCash, currentView]);

    const handleCOASelection = (coaId) => {
        const selected = chartOfAccounts.find(acc => acc.AccID === parseInt(coaId));
        if (selected) {
            setData({
                ...data,
                account_code: selected.AccCode.toString(),
                name: selected.AccName,
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentView === 'edit') {
            put(route('admin.petty-cash.update', selectedCash.id), {
                onSuccess: () => setCurrentView('list'),
            });
        } else {
            post(route('admin.petty-cash.store'), {
                onSuccess: () => setCurrentView('list'),
            });
        }
    };

    const handleDelete = (cash) => {
        if (confirm('Are you sure you want to delete this cash account?')) {
            router.delete(route('admin.petty-cash.destroy', cash.id), {
                onSuccess: () => {
                    if (currentView !== 'list') setCurrentView('list');
                }
            });
        }
    };

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

    const totalAccounts = cashAccounts.total;
    const activeAccounts = cashAccounts.data.filter((c) => c.status === 'active').length;
    const totalBalance = cashAccounts.data.reduce((sum, c) => sum + Number(c.current_balance || 0), 0);

    const renderListView = () => {
        return (
            <div className="bank-card">
                <div className="card-header">
                    <SearchBar
                        placeholder="Search cash accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="actions">
                        <button className="btn btn-primary" onClick={() => setCurrentView('create')}>
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
    <ActionsCell 
        onView={() => { setSelectedCash(cash); setCurrentView('view'); }}
        onEdit={() => { setSelectedCash(cash); setCurrentView('edit'); }}
        onDelete={() => handleDelete(cash)}
    />
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
        );
    };

    const renderCreateEditView = () => (
        <div className="view-card">
            <div className="internal-page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => setCurrentView('list')}>
                        <span className="material-icons-outlined">arrow_back</span>
                        Back
                    </button>
                    <h2 className="view-title">{currentView === 'edit' ? 'Edit Cash Account' : 'Add Cash Account'}</h2>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={processing}>
                        <span className="material-icons-outlined">save</span>
                        {processing ? 'Saving...' : 'Save Account'}
                    </button>
                </div>
            </div>
            
            <div className="p-8">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                    {!selectedCash && currentView === 'create' && (
                        <div className="form-group mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <label className="form-label text-blue-800 font-bold mb-2">Link to Chart of Accounts (Nature: Cash)</label>
                            <select
                                className="form-select bg-white"
                                onChange={(e) => handleCOASelection(e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>Select an account to auto-fill</option>
                                {chartOfAccounts.map(acc => (
                                    <option key={acc.AccID} value={acc.AccID}>
                                        {acc.AccCode} - {acc.AccName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <div className="form-group md:col-span-2">
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
                        <div className="form-group flex items-end mb-5">
                            <label className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 rounded border border-gray-100 w-full">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5"
                                    checked={data.is_default}
                                    onChange={(e) => setData('is_default', e.target.checked)}
                                />
                                <span className="font-medium">Default Account</span>
                            </label>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderDetailsView = () => (
        <div className="view-card">
            <div className="internal-page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => setCurrentView('list')}>
                        <span className="material-icons-outlined">arrow_back</span>
                        Back
                    </button>
                    <h2 className="view-title">{selectedCash.name} - Details</h2>
                </div>
                <div className="header-actions flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setCurrentView('edit')}>
                        <span className="material-icons-outlined">edit</span>
                        Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(selectedCash)}>
                        <span className="material-icons-outlined">delete</span>
                        Delete
                    </button>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                                    <span className="material-icons-outlined text-5xl text-blue-500">account_balance_wallet</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedCash.name}</h3>
                                <div className="text-sm text-gray-500 mb-4">{selectedCash.account_code}</div>
                                <span className={`status-badge status-${selectedCash.status} mb-4`}>
                                    {selectedCash.status.toUpperCase()}
                                </span>
                                
                                <div className="w-full border-t border-gray-200 pt-4 mt-2">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Default:</span>
                                        <span className="font-medium">{selectedCash.is_default ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Type:</span>
                                        <span className="font-medium">{selectedCash.type || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="text-sm text-gray-500 mb-1">Current Balance</div>
                                    <div className="text-3xl font-bold text-blue-600">
                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(selectedCash.current_balance || 0)}
                                        <span className="text-sm ml-1 text-gray-400 font-normal">{selectedCash.currency}</span>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="text-sm text-gray-500 mb-1">Opening Balance</div>
                                    <div className="text-3xl font-bold text-gray-900">
                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(selectedCash.opening_balance || 0)}
                                        <span className="text-sm ml-1 text-gray-400 font-normal">{selectedCash.currency}</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="material-icons-outlined text-gray-400">info</span>
                                        Additional Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-4">
                                        <div>
                                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bank Name</div>
                                            <div className="font-medium">{selectedCash.bank?.name || 'No Bank Linked'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Currency Code</div>
                                            <div className="font-medium">{selectedCash.currency}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Account Code</div>
                                            <div className="font-medium">{selectedCash.account_code}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Account Type</div>
                                            <div className="font-medium">{selectedCash.type}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const breadcrumbLinks = [
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Cash & Banks' },
        { 
            label: 'Cash', 
            onClick: currentView !== 'list' ? () => setCurrentView('list') : null 
        }
    ];

    if (currentView === 'create') breadcrumbLinks.push({ label: 'Add Account' });
    if (currentView === 'edit') breadcrumbLinks.push({ label: 'Edit Account' });
    if (currentView === 'view') breadcrumbLinks.push({ label: 'Details' });

    return (
        <AdminLayout activeMenu="Cash">
            <Head title="Petty Cash Accounts" />
            <BlankPage
                breadcrumbs={breadcrumbLinks}
                stats={currentView === 'list' && (
                    <StatsCards items={[
                        {
                            icon: "account_balance_wallet",
                            bgColor: "#3b82f6",
                            value: totalAccounts,
                            label: "Total Accounts"
                        },
                        {
                            icon: "check_circle",
                            bgColor: "#10b981",
                            value: `${activeAccounts}${cashAccounts.total > cashAccounts.per_page ? '+' : ''}`,
                            label: "Active (Page)"
                        },
                        {
                            icon: "payments",
                            bgColor: "#f59e0b",
                            value: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totalBalance),
                            label: "Total Balance (Page)"
                        }
                    ]} />
                )}
                filters={currentView === 'list' && (
                    <FilterTabs 
                        tabs={[
                            { id: 'all', label: 'All Accounts' },
                            { id: 'active', label: 'Active' },
                            { id: 'inactive', label: 'Inactive' }
                        ]}
                        activeTab={statusFilter}
                        onTabChange={handleFilterChange}
                    />
                )}
            >
                {currentView === 'list' && renderListView()}
                {(currentView === 'create' || currentView === 'edit') && renderCreateEditView()}
                {currentView === 'view' && renderDetailsView()}
            </BlankPage>
        </AdminLayout>
    );
};

export default PettyCash;
