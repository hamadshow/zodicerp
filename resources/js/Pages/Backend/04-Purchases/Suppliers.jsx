import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import Pagination from '../components/Pagination';

export default function Suppliers({ suppliers, groups, countries, cities, currencies, accounts, filters }) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('general');
    const [search, setSearch] = useState(filters?.search || '');
    const [accountOpen, setAccountOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const accountDropdownRef = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.purchases.suppliers.index'), { search }, { preserveState: true });
    };
    
    // Import System State
    const [showImport, setShowImport] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [importSummary, setImportSummary] = useState({});
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const fileInputRef = useRef(null);

    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};

    // Helper to get nested errors
    const getNestedError = (field, index, key) => errors[`${field}.${index}.${key}`];

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        supplier_code: '',
        name_ar: '',
        store_name_json: '',
        supplier_group_id: '',
        account_id: '',
        currency_id: '',
        password: '',
        password_confirmation: '',
        tax_number: '',
        commercial_register: '',
        tax_file_number: '',
        credit_limit: '',
        payment_terms: '',
        default_payment_method: '',
        default_warehouse_id: '',
        country_id: '',
        city_id: '',
        primary_phone: '',
        secondary_phone: '',
        fax: '',
        email: '',
        website: '',
        is_vendor: true,
        is_manufacturer: false,
        is_active: true,
        rating: 0,
        notes: '',
        
        addresses: [],
        contacts: [],
        opening_balance: {
            financial_year: new Date().getFullYear(),
            opening_date: new Date().toISOString().split('T')[0],
            currency_id: '',
            exchange_rate: 1,
            debit_amount: 0,
            credit_amount: 0,
            notes: ''
        }
    });

    const selectedAccount = accounts.find(a => String(a.AccID) === String(data.account_id));
    const handleAccountSelect = (value) => {
        setData('account_id', value);
        setAccountOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
                setAccountOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (mode === 'create' || mode === 'edit') {
            setData('password', '');
            setData('password_confirmation', '');
            setShowPassword(false);
        }
    }, [mode]);

    const handleCreate = () => {
        reset();
        setMode('create');
        setActiveTab('general');
    };

    const handleEdit = (supplier) => {
        // Transform supplier data to match form structure
        // Especially opening balance which might be a collection
        const supplierWithoutPassword = { ...supplier };
        delete supplierWithoutPassword.password;
        
        let storeName = '';
        if (supplier.store_name_json) {
            if (typeof supplier.store_name_json === 'object') {
                storeName = supplier.store_name_json.ar || supplier.store_name_json.en || Object.values(supplier.store_name_json)[0] || '';
            } else {
                storeName = supplier.store_name_json;
            }
        }

        const ob = supplier.opening_balances && supplier.opening_balances.length > 0 
            ? supplier.opening_balances[0] 
            : {
                financial_year: new Date().getFullYear(),
                opening_date: new Date().toISOString().split('T')[0],
                currency_id: supplier.currency_id || '',
                exchange_rate: 1,
                debit_amount: 0,
                credit_amount: 0,
                notes: ''
            };

        setData({
            ...supplierWithoutPassword,
            store_name_json: storeName,
            addresses: supplier.addresses || [],
            contacts: supplier.contacts || [],
            opening_balance: ob,
            // Ensure booleans are correct
            is_vendor: Boolean(supplier.is_vendor),
            is_manufacturer: Boolean(supplier.is_manufacturer),
            is_active: Boolean(supplier.is_active),
            password: '',
            password_confirmation: '',
        });
        setMode('edit');
        setActiveTab('general');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            destroy(route('admin.purchases.suppliers.destroy', { supplier: id }), {
                onError: () => setErrorMessage("Failed to delete supplier.")
            });
        }
    };

    const handleToggleFavorite = (supplier) => {
        router.post(route('admin.purchases.suppliers.toggleFavorite', { supplier: supplier.id }), {}, {
            preserveScroll: true,
            preserveState: true,
            onError: () => setErrorMessage("Failed to update favorite status.")
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMessage(null); // Clear previous errors
        
        const handleError = (errors) => {
            setErrorMessage("Please correct the errors below.");
            if (Object.keys(errors).some(k => k.startsWith('addresses'))) setActiveTab('addresses');
            else if (Object.keys(errors).some(k => k.startsWith('contacts'))) setActiveTab('contacts');
            else if (Object.keys(errors).some(k => k.startsWith('opening_balance'))) setActiveTab('opening_balance');
            else setActiveTab('general');
        };

        if (mode === 'create') {
            post(route('admin.purchases.suppliers.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: handleError,
            });
        } else {
            put(route('admin.purchases.suppliers.update', { supplier: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: handleError,
            });
        }
    };

    // Helper for nested array updates
    const updateNested = (field, index, key, value) => {
        const list = [...data[field]];
        list[index][key] = value;
        setData(field, list);
    };

    const addNested = (field, item) => {
        setData(field, [...data[field], item]);
    };

    const removeNested = (field, index) => {
        const list = [...data[field]];
        list.splice(index, 1);
        setData(field, list);
    };

    // --- IMPORT SYSTEM LOGIC ---
    const downloadTemplate = () => {
        const headers = ['supplier_code', 'name_ar', 'group_code', 'primary_phone', 'email', 'currency_code', 'account_code', 'is_active'];
        const sample = ['SUP-10001', 'مورد 1', 'GRP-001', '01000000001', 'supplier1@example.com', 'SAR', '2101', '1'];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "suppliers_template.xlsx");
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        setImportLoading(true);
        setImportError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                processExcelData(jsonData);
            } catch (err) {
                setImportError(err?.message || 'Error reading file');
                setImportLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setImportError(null);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            handleFileUpload(file);
        } else {
            setImportError('Please upload a valid Excel file (.xlsx, .xls)');
        }
    };

    const processExcelData = (rows) => {
        if (rows.length < 2) {
            setImportError('File is empty or missing headers');
            setImportLoading(false);
            return;
        }

        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const dataRows = rows.slice(1);
        const valid = [];
        const invalid = [];

        // Column mapping
        const map = {
            'supplier_code': headers.indexOf('supplier_code'),
            'name_ar': headers.indexOf('name_ar'),
            'group_code': headers.indexOf('group_code'),
            'primary_phone': headers.indexOf('primary_phone'),
            'email': headers.indexOf('email'),
            'currency_code': headers.indexOf('currency_code'),
            'account_code': headers.indexOf('account_code'),
            'is_active': headers.indexOf('is_active'),
        };

        dataRows.forEach((row) => {
            const getVal = (key) => {
                const colIdx = map[key];
                return colIdx !== -1 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
            };

            const item = {
                supplier_code: getVal('supplier_code'),
                name_ar: getVal('name_ar'),
                group_code: getVal('group_code'),
                primary_phone: getVal('primary_phone'),
                email: getVal('email'),
                currency_code: getVal('currency_code'),
                account_code: getVal('account_code'),
                is_active: getVal('is_active') === '' || ['1', 'yes', 'true'].includes(getVal('is_active').toLowerCase()),
                _errors: []
            };

            // Client-side Validation
            if (!item.name_ar) item._errors.push('Name is required');
            // if (item.telegram && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.telegram)) item._errors.push('Invalid telegram format');
            
            // Validate Group Code (Optional: if provided, check if it exists in props.groups)
            // Assuming groups have 'code' field. If not, we might need to skip this check or use name.
            // Let's assume groups prop has { id, code, name_en } structure.
            if (item.group_code && groups && groups.length > 0) {
                const groupExists = groups.some(g => g.code === item.group_code);
                if (!groupExists) item._errors.push('Group Code not found');
            }

            // Check duplicates in current batch
            if (valid.find(v => v.supplier_code === item.supplier_code && item.supplier_code)) {
                item._errors.push('Duplicate Supplier Code in file');
            }

            if (item._errors.length > 0) {
                invalid.push(item);
            } else {
                valid.push(item);
            }
        });

        setExcelRows(valid);
        setInvalidRows(invalid);
        setImportSummary({
            total: dataRows.length,
            valid: valid.length,
            invalid: invalid.length
        });
        setImportLoading(false);
    };

    const removeImportRow = (index) => {
        const rows = [...excelRows];
        rows.splice(index, 1);
        setExcelRows(rows);
        setImportSummary(prev => ({ ...prev, valid: rows.length }));
    };

    const submitImport = () => {
        if (excelRows.length === 0) return;
        setImportError(null);
        const batch_id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        router.post(route('admin.purchases.suppliers.bulkImport'), {
            rows: excelRows,
            batch_id: batch_id
        }, {
            onSuccess: () => {
                setShowImport(false);
                setExcelRows([]);
                setInvalidRows([]);
                setImportSummary({});
                // Optional: Force reload or show success message via flash
            },
            onError: (errors) => {
                setImportError('Failed to import. Please check the file format or server logs.');
                console.error(errors);
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Suppliers Management" />
            
            <div className="suppliers-container">


                <div className="page-header">
                    <h1 className="header-title">Suppliers Management</h1>
                    {mode === 'list' && (
                        <div className="suppliers-actions">
                            <form onSubmit={handleSearch} className="search-form">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search suppliers..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </form>
                             <button className="btn-import" onClick={() => setShowImport(true)}>
                                <i className="icon-upload"></i> Import Excel
                            </button>
                            <button className="btn-add" onClick={handleCreate}>
                                + Add Supplier
                            </button>
                        </div>
                    )}

                </div>
                {flash.success && (
                    <div className="alert alert--success">
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div className="alert alert--error">
                        {flash.error}
                    </div>
                )}
                {errorMessage && (
                    <div className="alert alert--error">
                        {errorMessage}
                    </div>
                )}

                {mode === 'list' ? (
                    <div className="suppliers-card">
                        <div className="table-responsive">
                            <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Name</th>
                                    <th>Group</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Telegram</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.data.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td>{supplier.supplier_code}</td>
                                        <td>{supplier.name_ar}</td>
                                        <td>{supplier.group?.name_en || '-'}</td>
                                        <td>{supplier.primary_phone}</td>
                                        <td>{supplier.email || '-'}</td>
                                        <td>
                                            {(() => {
                                                const contact = supplier.contacts?.find(c => c.is_primary && c.telegram) || supplier.contacts?.find(c => c.telegram);
                                                if (!contact) return '-';
                                                let link = contact.telegram;
                                                if (!link.startsWith('http') && !link.startsWith('t.me')) {
                                                    link = `https://t.me/${link.replace('@', '')}`;
                                                } else if (link.startsWith('t.me')) {
                                                    link = `https://${link}`;
                                                }
                                                return (
                                                    <a href={link} target="_blank" rel="noopener noreferrer" title="Open Telegram">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" width="20" height="20" fill="#229ED9">
                                                            <path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z"/>
                                                        </svg>
                                                    </a>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <span className={`supplier-status ${supplier.is_active ? 'status-active' : 'status-inactive'}`}>
                                                {supplier.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                className={`btn-favorite ${supplier.favorite ? 'active' : ''}`}
                                                onClick={() => handleToggleFavorite(supplier)}
                                                title={supplier.favorite ? "Unfavorite" : "Favorite"}
                                            >
                                                {supplier.favorite ? '★' : '☆'}
                                            </button>
                                            <button className="btn-icon edit" onClick={() => handleEdit(supplier)} title="Edit">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(supplier.id)} title="Delete">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {suppliers.data.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="empty-state">No suppliers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                        <Pagination
                            currentPage={suppliers.current_page}
                            totalPages={suppliers.last_page}
                            totalRecords={suppliers.total}
                            recordsPerPage={suppliers.per_page}
                            onPageChange={(page) => router.get(route('admin.purchases.suppliers.index'), { page, per_page: suppliers.per_page }, { preserveState: true })}
                            onRecordsPerPageChange={(perPage) => router.get(route('admin.purchases.suppliers.index'), { page: 1, per_page: perPage }, { preserveState: true })}
                        />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="suppliers-card">
                        <div className="tabs">
                            {['general', 'addresses', 'contacts', 'opening_balance'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.replace('_', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* GENERAL TAB */}
                        <div className={`tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                            <div className="form-row">
                                {/* Supplier Code is auto-generated in backend */}
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${errors.name_ar ? 'is-invalid' : ''}`}
                                        value={data.name_ar} 
                                        onChange={e => setData('name_ar', e.target.value)}
                                    />
                                    {errors.name_ar && <span className="invalid-feedback">{errors.name_ar}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Store Name</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${errors.store_name_json ? 'is-invalid' : ''}`}
                                        value={data.store_name_json} 
                                        onChange={e => setData('store_name_json', e.target.value)}
                                    />
                                    {errors.store_name_json && <span className="invalid-feedback">{errors.store_name_json}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Group</label>
                                    <select className={`form-control ${errors.supplier_group_id ? 'is-invalid' : ''}`} value={data.supplier_group_id} onChange={e => setData('supplier_group_id', e.target.value)}>
                                        <option value="">Select Group</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name_en}</option>)}
                                    </select>
                                    {errors.supplier_group_id && <span className="invalid-feedback">{errors.supplier_group_id}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select className={`form-control ${errors.currency_id ? 'is-invalid' : ''}`} value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                        <option value="">Select Currency</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                    </select>
                                    {errors.currency_id && <span className="invalid-feedback">{errors.currency_id}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Account</label>
                                    <div className="select-dropdown" ref={accountDropdownRef}>
                                        <button
                                            type="button"
                                            className={`select-dropdown__button ${!data.account_id ? 'is-placeholder' : ''} ${errors.account_id ? 'is-invalid' : ''}`}
                                            onClick={() => setAccountOpen(prev => !prev)}
                                        >
                                            <span>{selectedAccount ? selectedAccount.Name_en : 'Select Account'}</span>
                                            <span className="select-dropdown__chevron">▾</span>
                                        </button>
                                        {accountOpen && (
                                            <div className="select-dropdown__menu" role="listbox">
                                                <div
                                                    role="option"
                                                    tabIndex={0}
                                                    aria-selected={!data.account_id}
                                                    className={`select-dropdown__option ${!data.account_id ? 'is-selected' : ''}`}
                                                    onClick={() => handleAccountSelect('')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleAccountSelect('');
                                                        }
                                                    }}
                                                >
                                                    Select Account
                                                </div>
                                                {accounts.map(a => (
                                                    <div
                                                        role="option"
                                                        tabIndex={0}
                                                        aria-selected={String(data.account_id) === String(a.AccID)}
                                                        key={a.AccID}
                                                        className={`select-dropdown__option ${String(data.account_id) === String(a.AccID) ? 'is-selected' : ''}`}
                                                        onClick={() => handleAccountSelect(a.AccID)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                handleAccountSelect(a.AccID);
                                                            }
                                                        }}
                                                    >
                                                        {a.Name_en}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {errors.account_id && <span className="invalid-feedback">{errors.account_id}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Tax Number</label>
                                    <input className={`form-control ${errors.tax_number ? 'is-invalid' : ''}`} type="text" value={data.tax_number} onChange={e => setData('tax_number', e.target.value)} />
                                    {errors.tax_number && <span className="invalid-feedback">{errors.tax_number}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Commercial Register</label>
                                    <input className={`form-control ${errors.commercial_register ? 'is-invalid' : ''}`} type="text" value={data.commercial_register} onChange={e => setData('commercial_register', e.target.value)} />
                                    {errors.commercial_register && <span className="invalid-feedback">{errors.commercial_register}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Credit Limit</label>
                                    <input className={`form-control ${errors.credit_limit ? 'is-invalid' : ''}`} type="number" value={data.credit_limit} onChange={e => setData('credit_limit', e.target.value)} />
                                    {errors.credit_limit && <span className="invalid-feedback">{errors.credit_limit}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mobile</label>
                                    <input className={`form-control ${errors.primary_phone ? 'is-invalid' : ''}`} type="text" value={data.primary_phone} onChange={e => setData('primary_phone', e.target.value)} />
                                    {errors.primary_phone && <span className="invalid-feedback">{errors.primary_phone}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                    {errors.email && <span className="invalid-feedback">{errors.email}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Website</label>
                                    <input className={`form-control ${errors.website ? 'is-invalid' : ''}`} type="text" value={data.website} onChange={e => setData('website', e.target.value)} />
                                    {errors.website && <span className="invalid-feedback">{errors.website}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    {errors.password && <span className="invalid-feedback">{errors.password}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`}
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    {errors.password_confirmation && <span className="invalid-feedback">{errors.password_confirmation}</span>}
                                </div>
                            </div>
                            <div className="checkbox-row">
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        checked={showPassword}
                                        onChange={e => setShowPassword(e.target.checked)}
                                        id="show_password"
                                    />
                                    <label className="form-label" htmlFor="show_password">Show Password</label>
                                </div>
                            </div>

                            <div className="checkbox-row">
                                <div className="checkbox-group">
                                    <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} id="is_active" />
                                    <label className="form-label" htmlFor="is_active">Is Active</label>
                                </div>
                                <div className="checkbox-group">
                                    <input type="checkbox" checked={data.is_vendor} onChange={e => setData('is_vendor', e.target.checked)} id="is_vendor" />
                                    <label className="form-label" htmlFor="is_vendor">Is Vendor</label>
                                </div>
                                <div className="checkbox-group">
                                    <input type="checkbox" checked={data.is_manufacturer} onChange={e => setData('is_manufacturer', e.target.checked)} id="is_manufacturer" />
                                    <label className="form-label" htmlFor="is_manufacturer">Is Manufacturer</label>
                                </div>
                            </div>
                        </div>

                        {/* ADDRESSES TAB */}
                        <div className={`tab-content ${activeTab === 'addresses' ? 'active' : ''}`}>
                            <div className="form-group">
                                <button type="button" className="btn-secondary" onClick={() => addNested('addresses', { address_type: '', address_name: '', street: '', city_id: '', country_id: '' })}>
                                    + Add Address
                                </button>
                            </div>
                            <div>
                                {data.addresses.map((address, index) => (
                                    <div key={index} className="nested-card">
                                        <div className="nested-card-header">
                                            <h4 className="nested-card-title">Address #{index + 1}</h4>
                                            <button type="button" className="btn-danger btn-sm" onClick={() => removeNested('addresses', index)}>Remove</button>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Type</label>
                                                <select 
                                                    className={`form-control ${getNestedError('addresses', index, 'address_type') ? 'is-invalid' : ''}`} 
                                                    value={address.address_type} 
                                                    onChange={e => updateNested('addresses', index, 'address_type', e.target.value)}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="billing">Billing</option>
                                                    <option value="shipping">Shipping</option>
                                                </select>
                                                {getNestedError('addresses', index, 'address_type') && <span className="invalid-feedback">{getNestedError('addresses', index, 'address_type')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Name</label>
                                                <input 
                                                    className={`form-control ${getNestedError('addresses', index, 'address_name') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={address.address_name} 
                                                    onChange={e => updateNested('addresses', index, 'address_name', e.target.value)} 
                                                />
                                                {getNestedError('addresses', index, 'address_name') && <span className="invalid-feedback">{getNestedError('addresses', index, 'address_name')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Street</label>
                                                <input 
                                                    className={`form-control ${getNestedError('addresses', index, 'street') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={address.street} 
                                                    onChange={e => updateNested('addresses', index, 'street', e.target.value)} 
                                                />
                                                {getNestedError('addresses', index, 'street') && <span className="invalid-feedback">{getNestedError('addresses', index, 'street')}</span>}
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Country</label>
                                                <select 
                                                    className={`form-control ${getNestedError('addresses', index, 'country_id') ? 'is-invalid' : ''}`} 
                                                    value={address.country_id} 
                                                    onChange={e => updateNested('addresses', index, 'country_id', e.target.value)}
                                                >
                                                    <option value="">Select Country</option>
                                                    {countries.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                                                </select>
                                                {getNestedError('addresses', index, 'country_id') && <span className="invalid-feedback">{getNestedError('addresses', index, 'country_id')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">City</label>
                                                <select 
                                                    className={`form-control ${getNestedError('addresses', index, 'city_id') ? 'is-invalid' : ''}`} 
                                                    value={address.city_id} 
                                                    onChange={e => updateNested('addresses', index, 'city_id', e.target.value)}
                                                >
                                                    <option value="">Select City</option>
                                                    {cities.filter(c => !address.country_id || c.country_id == address.country_id).map(c => (
                                                        <option key={c.id} value={c.id}>{c.name_en}</option>
                                                    ))}
                                                </select>
                                                {getNestedError('addresses', index, 'city_id') && <span className="invalid-feedback">{getNestedError('addresses', index, 'city_id')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CONTACTS TAB */}
                        <div className={`tab-content ${activeTab === 'contacts' ? 'active' : ''}`}>
                            <div className="form-group">
                                <button type="button" className="btn-secondary" onClick={() => addNested('contacts', { 
                                    name_ar: '', name_en: '', phone: '', mobile: '', whatsapp: '', email: '', 
                                    department: '', position_ar: '', position_en: '', 
                                    is_primary: false, receive_statements: false, receive_notifications: false, notes: '' 
                                })}>
                                    + Add Contact
                                </button>
                            </div>
                            <div>
                                {data.contacts.map((contact, index) => (
                                    <div key={index} className="nested-card">
                                        <div className="nested-card-header">
                                            <h4 className="nested-card-title">Contact #{index + 1}</h4>
                                            <button type="button" className="btn-danger btn-sm" onClick={() => removeNested('contacts', index)}>Remove</button>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Name (AR) <span className="required">*</span></label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'name_ar') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.name_ar || ''} 
                                                    onChange={e => updateNested('contacts', index, 'name_ar', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'name_ar') && <span className="invalid-feedback">{getNestedError('contacts', index, 'name_ar')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Name (EN)</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'name_en') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.name_en || ''} 
                                                    onChange={e => updateNested('contacts', index, 'name_en', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'name_en') && <span className="invalid-feedback">{getNestedError('contacts', index, 'name_en')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Department</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'department') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.department || ''} 
                                                    onChange={e => updateNested('contacts', index, 'department', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'department') && <span className="invalid-feedback">{getNestedError('contacts', index, 'department')}</span>}
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Position (AR)</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'position_ar') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.position_ar || ''} 
                                                    onChange={e => updateNested('contacts', index, 'position_ar', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'position_ar') && <span className="invalid-feedback">{getNestedError('contacts', index, 'position_ar')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Position (EN)</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'position_en') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.position_en || ''} 
                                                    onChange={e => updateNested('contacts', index, 'position_en', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'position_en') && <span className="invalid-feedback">{getNestedError('contacts', index, 'position_en')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Phone</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'phone') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.phone || ''} 
                                                    onChange={e => updateNested('contacts', index, 'phone', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'phone') && <span className="invalid-feedback">{getNestedError('contacts', index, 'phone')}</span>}
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Mobile</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'mobile') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.mobile || ''} 
                                                    onChange={e => updateNested('contacts', index, 'mobile', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'mobile') && <span className="invalid-feedback">{getNestedError('contacts', index, 'mobile')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">WhatsApp</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'whatsapp') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.whatsapp || ''} 
                                                    onChange={e => updateNested('contacts', index, 'whatsapp', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'whatsapp') && <span className="invalid-feedback">{getNestedError('contacts', index, 'whatsapp')}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Telegram</label>
                                                <input 
                                                    className={`form-control ${getNestedError('contacts', index, 'telegram') ? 'is-invalid' : ''}`} 
                                                    type="text" 
                                                    value={contact.telegram || ''} 
                                                    onChange={e => updateNested('contacts', index, 'telegram', e.target.value)} 
                                                />
                                                {getNestedError('contacts', index, 'telegram') && <span className="invalid-feedback">{getNestedError('contacts', index, 'telegram')}</span>}
                                            </div>
                                        </div>
                                        
                                        {/* Booleans */}
                                        <div className="checkbox-row">
                                            <div className="checkbox-group">
                                                <input type="checkbox" checked={Boolean(contact.is_primary)} onChange={e => updateNested('contacts', index, 'is_primary', e.target.checked)} id={`contact-primary-${index}`} />
                                                <label htmlFor={`contact-primary-${index}`} className="form-label">Is Primary</label>
                                            </div>
                                            <div className="checkbox-group">
                                                <input type="checkbox" checked={Boolean(contact.receive_statements)} onChange={e => updateNested('contacts', index, 'receive_statements', e.target.checked)} id={`contact-statements-${index}`} />
                                                <label htmlFor={`contact-statements-${index}`} className="form-label">Receive Statements</label>
                                            </div>
                                            <div className="checkbox-group">
                                                <input type="checkbox" checked={Boolean(contact.receive_notifications)} onChange={e => updateNested('contacts', index, 'receive_notifications', e.target.checked)} id={`contact-notifications-${index}`} />
                                                <label htmlFor={`contact-notifications-${index}`} className="form-label">Receive Notifications</label>
                                            </div>
                                        </div>

                                        <div className="form-group-full">
                                            <label className="form-label">Notes</label>
                                            <textarea className="form-control form-textarea" value={contact.notes || ''} onChange={e => updateNested('contacts', index, 'notes', e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OPENING BALANCE TAB */}
                        <div className={`tab-content ${activeTab === 'opening_balance' ? 'active' : ''}`}>
                             <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Financial Year</label>
                                    <input 
                                        className={`form-control ${errors['opening_balance.financial_year'] ? 'is-invalid' : ''}`}
                                        type="number" 
                                        value={data.opening_balance.financial_year} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, financial_year: e.target.value })} 
                                    />
                                    {errors['opening_balance.financial_year'] && <span className="invalid-feedback">{errors['opening_balance.financial_year']}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Opening Date</label>
                                    <input 
                                        className={`form-control ${errors['opening_balance.opening_date'] ? 'is-invalid' : ''}`}
                                        type="date" 
                                        value={data.opening_balance.opening_date} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, opening_date: e.target.value })} 
                                    />
                                    {errors['opening_balance.opening_date'] && <span className="invalid-feedback">{errors['opening_balance.opening_date']}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select 
                                        className={`form-control ${errors['opening_balance.currency_id'] ? 'is-invalid' : ''}`}
                                        value={data.opening_balance.currency_id} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, currency_id: e.target.value })}
                                    >
                                        <option value="">Select Currency</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                                    </select>
                                    {errors['opening_balance.currency_id'] && <span className="invalid-feedback">{errors['opening_balance.currency_id']}</span>}
                                </div>
                             </div>
                             <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Exchange Rate</label>
                                    <input 
                                        className={`form-control ${errors['opening_balance.exchange_rate'] ? 'is-invalid' : ''}`}
                                        type="number" 
                                        step="0.0001"
                                        value={data.opening_balance.exchange_rate} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, exchange_rate: e.target.value })} 
                                    />
                                    {errors['opening_balance.exchange_rate'] && <span className="invalid-feedback">{errors['opening_balance.exchange_rate']}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Debit Amount</label>
                                    <input 
                                        className={`form-control ${errors['opening_balance.debit_amount'] ? 'is-invalid' : ''}`}
                                        type="number" 
                                        step="0.01"
                                        value={data.opening_balance.debit_amount} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, debit_amount: e.target.value })} 
                                    />
                                    {errors['opening_balance.debit_amount'] && <span className="invalid-feedback">{errors['opening_balance.debit_amount']}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Credit Amount</label>
                                    <input 
                                        className={`form-control ${errors['opening_balance.credit_amount'] ? 'is-invalid' : ''}`}
                                        type="number" 
                                        step="0.01"
                                        value={data.opening_balance.credit_amount} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, credit_amount: e.target.value })} 
                                    />
                                    {errors['opening_balance.credit_amount'] && <span className="invalid-feedback">{errors['opening_balance.credit_amount']}</span>}
                                </div>
                             </div>
                             <div className="form-group-full">
                                <label className="form-label">Notes</label>
                                <textarea 
                                    className={`form-control form-textarea ${errors['opening_balance.notes'] ? 'is-invalid' : ''}`}
                                    value={data.opening_balance.notes} 
                                    onChange={e => setData('opening_balance', { ...data.opening_balance, notes: e.target.value })} 
                                />
                                {errors['opening_balance.notes'] && <span className="invalid-feedback">{errors['opening_balance.notes']}</span>}
                             </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={() => setMode('list')}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={processing}>
                                {mode === 'create' ? 'Create Supplier' : 'Update Supplier'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            {/* IMPORT MODAL */}
            {showImport && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Import Suppliers from Excel</h3>
                            <button className="modal-close" onClick={() => setShowImport(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {importError && (
                                <div className="alert alert--error">
                                    {importError}
                                </div>
                            )}
                            {!importSummary.total ? (
                                <>
                                    <div 
                                        className="drop-zone"
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={handleFileDrop}
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        <p>Drag & Drop your Excel file here or click to browse</p>
                                        <input 
                                            type="file" 
                                            hidden 
                                            ref={fileInputRef} 
                                            accept=".xlsx, .xls"
                                            onChange={e => handleFileUpload(e.target.files[0])}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <button className="btn-secondary" onClick={downloadTemplate}>
                                            Download Template
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="preview-stats">
                                        <span className="stat-badge total">Total: {importSummary.total}</span>
                                        <span className="stat-badge valid">Valid: {importSummary.valid}</span>
                                        {importSummary.invalid > 0 && (
                                            <span className="stat-badge invalid">Invalid: {importSummary.invalid}</span>
                                        )}
                                    </div>

                                    {importLoading && (
                                        <div className="progress-bar">
                                            <div className="progress-bar__fill"></div>
                                        </div>
                                    )}

                                    <div className="table-responsive import-preview">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Status</th>
                                                    <th>Errors</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Invalid Rows First */}
                                                {invalidRows.map((row, i) => (
                                                    <tr key={`inv-${i}`} className="invalid-row">
                                                        <td>{row.supplier_code}</td>
                                                        <td>{row.name_ar}</td>
                                                        <td>{row.email}</td>
                                                        <td>-</td>
                                                        <td>
                                                            {row._errors.map((e, idx) => (
                                                                <span key={idx} className="row-error">{e}</span>
                                                            ))}
                                                        </td>
                                                        <td>Skipped</td>
                                                    </tr>
                                                ))}
                                                {/* Valid Rows */}
                                                {excelRows.map((row, i) => (
                                                    <tr key={`val-${i}`}>
                                                        <td>{row.supplier_code}</td>
                                                        <td>{row.name_ar}</td>
                                                        <td>{row.email}</td>
                                                        <td>{row.is_active ? 'Active' : 'Inactive'}</td>
                                                        <td>-</td>
                                                        <td>
                                                            <button className="btn-icon delete" onClick={() => removeImportRow(i)} title="Remove">
                                                                <i className="fas fa-times"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => {
                                setShowImport(false);
                                setExcelRows([]);
                                setInvalidRows([]);
                                setImportSummary({});
                            }}>
                                Cancel
                            </button>
                            {importSummary.valid > 0 && (
                                <button 
                                    className="btn-primary" 
                                    onClick={submitImport}
                                    disabled={importLoading}
                                >
                                    {importLoading ? 'Importing...' : `Import ${importSummary.valid} Suppliers`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
