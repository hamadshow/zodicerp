import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { toast } from 'react-toastify';

const Currencies = ({ currencies = [] }) => {
    const { props } = usePage();
    const { localization } = props;
    const isArabic = localization?.current_locale === 'ar';

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const [filteredCurrencies, setFilteredCurrencies] = useState(currencies);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectAll, setSelectAll] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [view, setView] = useState('list');
    const [currentCurrency, setCurrentCurrency] = useState(null);
    const [form, setForm] = useState({
        code: '',
        name: '',
        symbol: '',
        decimal_places: 2,
        format: '',
        is_base: false,
        status: 'active',
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        baseCurrency: '-',
        inactive: 0
    });

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'
    ];

    useEffect(() => {
        setFilteredCurrencies(currencies);
    }, [currencies]);

    useEffect(() => {
        filterCurrencies();
    }, [currencies, searchTerm]);

    useEffect(() => {
        updateStats();
    }, [filteredCurrencies, currencies]);

    const updateStats = () => {
        const total = filteredCurrencies.length;
        const active = filteredCurrencies.filter(c => c.status === 'active').length;
        const base = currencies.find(c => c.is_base);
        const inactive = filteredCurrencies.filter(c => c.status !== 'active').length;

        setStats({ 
            total, 
            active, 
            baseCurrency: base ? `${base.code} (${base.symbol})` : 'None', 
            inactive 
        });
    };

    const filterCurrencies = () => {
        if (!searchTerm) {
            setFilteredCurrencies(currencies);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = currencies.filter(c => 
            c.name.toLowerCase().includes(lowerTerm) ||
            c.code.toLowerCase().includes(lowerTerm) ||
            (c.symbol && c.symbol.toLowerCase().includes(lowerTerm))
        );
        setFilteredCurrencies(filtered);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const totalPages = Math.ceil(filteredCurrencies.length / recordsPerPage);
    const paginatedCurrencies = filteredCurrencies.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    );

    const handleSelectAll = () => {
        setSelectAll(!selectAll);
        if (!selectAll) {
            setSelectedRows(filteredCurrencies.map(c => c.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleRowSelect = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const tableColumns = [
        { 
            header: isArabic ? 'الكود' : 'CODE', 
            key: 'code',
            sortable: true
        },
        { 
            header: isArabic ? 'العملة' : 'CURRENCY', 
            key: 'name',
            sortable: true,
            render: (row) => (
                <div className="currency-info">
                    <div className="currency-icon" style={{ backgroundColor: getCurrencyColor(row.code) }}>
                        <span>{row.symbol}</span>
                    </div>
                    <div className="currency-details">
                        <div className="currency-name">{row.name}</div>
                        <div className="currency-code">{row.format || '-'}</div>
                    </div>
                </div>
            )
        },
        { 
            header: isArabic ? 'الرمز' : 'SYMBOL', 
            key: 'symbol' 
        },
        { 
            header: isArabic ? 'الكسور العشرية' : 'DECIMALS', 
            key: 'decimal_places' 
        },
        { 
            header: isArabic ? 'عملة أساسية' : 'IS BASE', 
            key: 'is_base',
            render: (row) => row.is_base ? (
                <span className="base-badge">
                    <span className="material-icons-outlined" style={{ fontSize: '12px', verticalAlign: 'middle' }}>star</span>
                    {isArabic ? ' أساسية' : ' Base'}
                </span>
            ) : <span className="text-gray-400">-</span>
        },
        { 
            header: isArabic ? 'الحالة' : 'STATUS', 
            key: 'status',
            render: (row) => (
                <span className={`currency-status status-${row.status}`}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </span>
            )
        },
    ];

    const openAdd = () => {
        setCurrentCurrency(null);
        setForm({
            code: '',
            name: '',
            symbol: '',
            decimal_places: 2,
            format: '',
            is_base: false,
            status: 'active',
        });
        setView('add');
    };

    const openEdit = (currency) => {
        setCurrentCurrency(currency);
        setForm({
            code: currency?.code ?? '',
            name: currency?.name ?? '',
            symbol: currency?.symbol ?? '',
            decimal_places: currency?.decimal_places ?? 2,
            format: currency?.format ?? '',
            is_base: Boolean(currency?.is_base),
            status: currency?.status ?? 'active',
        });
        setView('edit');
    };

    const closeEditor = () => {
        setView('list');
        setCurrentCurrency(null);
        setForm({
            code: '',
            name: '',
            symbol: '',
            decimal_places: 2,
            format: '',
            is_base: false,
            status: 'active',
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            code: (form.code || '').toUpperCase(),
            name: form.name,
            symbol: form.symbol,
            decimal_places: Number(form.decimal_places),
            format: form.format || null,
            is_base: Boolean(form.is_base),
            status: form.status,
        };

        if (view === 'edit' && currentCurrency) {
            router.put(getLocalizedRoute('admin.currencies.update', { currency: currentCurrency.id }), data, {
                onStart: () => toast.info('Updating currency...', { autoClose: 2000 }),
                onSuccess: () => closeEditor(),
                onError: () => toast.error('Failed to update currency'),
            });
        } else {
            router.post(getLocalizedRoute('admin.currencies.store'), data, {
                onStart: () => toast.info('Creating currency...', { autoClose: 2000 }),
                onSuccess: () => closeEditor(),
                onError: () => toast.error('Failed to create currency'),
            });
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this currency?')) {
            router.delete(getLocalizedRoute('admin.currencies.destroy', { currency: id }), {
                onStart: () => toast.info('Deleting currency...', { autoClose: 2000 }),
                onError: () => toast.error('Failed to delete currency'),
            });
        }
    };

    const getCurrencyColor = (code) => {
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            hash = code.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: 'Essential Data' },
        { label: view === 'list' ? 'Currencies' : 'Currency Management', href: view === 'list' ? null : getLocalizedRoute('admin.currencies.index') }
    ];

    if (view !== 'list') {
        breadcrumbs.push({ label: view === 'edit' ? 'Edit Currency' : 'Create Currency' });
    }

    const statsContent = view === 'list' ? (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">monetization_on</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Currencies</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                    <span className="material-icons-outlined">check_circle</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">Active Currencies</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                    <span className="material-icons-outlined">flag</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.baseCurrency}</div>
                    <div className="stat-label">Base Currency</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                    <span className="material-icons-outlined">archive</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.inactive}</div>
                    <div className="stat-label">Inactive/Archived</div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <AdminLayout activeMenu="Currencies">
            <Head title="Currencies - ZodicERP" />
            
            <BlankPage breadcrumbs={breadcrumbs} stats={statsContent}>
                {view === 'list' ? (
                    <div className="currencies-card fade-in">
                        <Table
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchValue={searchTerm}
                            onToolbarSearch={handleSearch}
                            toolbarSearchPlaceholder="Search currencies..."
                            showAddButton={true}
                            addButtonText="Add Currency"
                            onAdd={openAdd}
                            showRefreshButton={true}
                            onRefresh={() => window.location.reload()}
                            toolbarActions={
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select className="btn-toolbar btn-refresh" defaultValue="" style={{ height: '42px' }}>
                                        <option disabled value="">Bulk Actions</option>
                                        <option value="activate">Activate Selected</option>
                                        <option value="deactivate">Deactivate Selected</option>
                                        <option value="delete">Delete Selected</option>
                                    </select>
                                    <button className="btn-toolbar btn-refresh">
                                        <span className="material-icons-outlined">play_arrow</span>
                                        <span>Apply</span>
                                    </button>
                                </div>
                            }
                            tableData={paginatedCurrencies.map(c => ({ ...c, selected: selectedRows.includes(c.id) }))}
                            columns={tableColumns}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={filteredCurrencies.length}
                            recordsPerPage={recordsPerPage}
                            handleRowSelect={handleRowSelect}
                            selectAll={selectAll}
                            handleSelectAll={handleSelectAll}
                            onPageChange={(page) => setCurrentPage(page)}
                            onRecordsPerPageChange={(size) => {
                                setRecordsPerPage(size);
                                setCurrentPage(1);
                            }}
                            onEdit={(row) => openEdit(row)}
                            onDelete={(row) => handleDelete(row.id)}
                        />
                    </div>
            ) : (
                <div className="currencies-card currency-editor-card fade-in">
                    <div className="card-header">
                        <div className="currency-editor-title">
                            {view === 'edit' ? 'Edit Currency' : 'Create Currency'}
                        </div>
                        <div className="actions currency-editor-actions">
                            <button type="button" className="btn btn-outline" onClick={closeEditor}>
                                <span>Cancel</span>
                            </button>
                            <button type="submit" className="btn btn-primary" form="currencyForm">
                                <span>{view === 'edit' ? 'Update Currency' : 'Create Currency'}</span>
                            </button>
                        </div>
                    </div>

                    <form id="currencyForm" onSubmit={handleSubmit}>
                        <div className="currency-editor-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Currency Code</label>
                                    <input
                                        type="text"
                                        name="code"
                                        className="form-control"
                                        value={form.code}
                                        onChange={handleFormChange}
                                        placeholder="e.g. USD"
                                        required
                                        maxLength="3"
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Symbol</label>
                                    <input
                                        type="text"
                                        name="symbol"
                                        className="form-control"
                                        value={form.symbol}
                                        onChange={handleFormChange}
                                        placeholder="e.g. $"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Currency Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    value={form.name}
                                    onChange={handleFormChange}
                                    placeholder="e.g. US Dollar"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Decimal Places</label>
                                    <input
                                        type="number"
                                        name="decimal_places"
                                        className="form-control"
                                        value={form.decimal_places}
                                        onChange={handleFormChange}
                                        min="0"
                                        max="8"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Format</label>
                                    <input
                                        type="text"
                                        name="format"
                                        className="form-control"
                                        value={form.format}
                                        onChange={handleFormChange}
                                        placeholder="e.g. 1,0.00"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    name="status"
                                    className="form-control"
                                    value={form.status}
                                    onChange={handleFormChange}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_base"
                                        className="form-checkbox"
                                        checked={form.is_base}
                                        onChange={handleFormChange}
                                    />
                                    Set as Base Currency
                                </label>
                                <div className="text-xs text-gray-500 mt-1 ml-6">
                                    Warning: Setting this as base currency will unset any existing base currency.
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}
            </BlankPage>
        </AdminLayout>
    );
};

export default Currencies;
