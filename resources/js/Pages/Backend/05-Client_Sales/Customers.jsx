import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import Pagination from '../components/Pagination';

export default function Customers({ customers, groups, countries, cities, currencies, accounts, warehouses, priceLists, salesAgents, filters }) {
    const { props } = usePage();
    const [mode, setMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('general');
    const [search, setSearch] = useState(filters?.search || '');
    
    // Import System State
    const [showImport, setShowImport] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [importSummary, setImportSummary] = useState({});
    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importError, setImportError] = useState(null);
    const [showExcelMenu, setShowExcelMenu] = useState(false);
    const fileInputRef = useRef(null);
    const excelMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (excelMenuRef.current && !excelMenuRef.current.contains(event.target)) {
                setShowExcelMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (props.flash?.success) {
            toast.success(props.flash.success);
            setShowImport(false);
            setExcelRows([]);
            setInvalidRows([]);
            setImportSummary({});
        }
        if (props.flash?.error) {
            toast.error(props.flash.error);
        }
    }, [props.flash]);

    const flash = (props && props.flash) ? props.flash : {};
    const localization = props.localization;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
          });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(getLocalizedRoute('admin.client-sales.customers.index'), { search }, { preserveState: true });
    };

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        customer_code: '',
        name_ar: '',
        name_en: '',
        customer_group_id: '',
        account_id: '',
        currency_id: '',
        price_list_id: '',
        sales_agent_id: '',
        default_warehouse_id: '',
        tax_number: '',
        commercial_register: '',
        credit_limit: '',
        payment_terms: '',
        default_payment_method: '',
        country_id: '',
        city_id: '',
        primary_phone: '',
        secondary_phone: '',
        mobile: '',
        fax: '',
        email: '',
        website: '',
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

    const handleCreate = () => {
        reset();
        setMode('create');
        setActiveTab('general');
    };

    const handleEdit = (customer) => {
        // Transform customer data to match form structure
        // Especially opening balance which might be a collection
        const ob = customer.opening_balances && customer.opening_balances.length > 0 
            ? customer.opening_balances[0] 
            : {
                financial_year: new Date().getFullYear(),
                opening_date: new Date().toISOString().split('T')[0],
                currency_id: customer.currency_id || '',
                exchange_rate: 1,
                debit_amount: 0,
                credit_amount: 0,
                notes: ''
            };

        setData({
            ...customer,
            addresses: customer.addresses || [],
            contacts: customer.contacts || [],
            opening_balance: ob,
            // Ensure booleans are correct
            is_active: Boolean(customer.is_active),
        });
        setMode('edit');
        setActiveTab('general');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            destroy(getLocalizedRoute('admin.client-sales.customers.destroy', { customer: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(getLocalizedRoute('admin.client-sales.customers.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: () => setActiveTab('general'),
            });
        } else {
            put(getLocalizedRoute('admin.client-sales.customers.update', { customer: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: () => setActiveTab('general'),
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

    // --- IMPORT & EXPORT SYSTEM LOGIC ---
    const downloadTemplate = () => {
        const headers = ['customer_code', 'name_ar', 'name_en', 'group_code', 'primary_phone', 'email', 'currency_code', 'account_code', 'is_active'];
        const sample = ['CUS-10001', 'عميل 1', 'Customer 1', 'GRP-001', '01000000001', 'cust1@example.com', 'SAR', '2101', '1'];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "customers_template.xlsx");
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
            'customer_code': headers.indexOf('customer_code'),
            'name_ar': headers.indexOf('name_ar'),
            'name_en': headers.indexOf('name_en'),
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
                customer_code: getVal('customer_code'),
                name_ar: getVal('name_ar'),
                name_en: getVal('name_en'),
                group_code: getVal('group_code'),
                primary_phone: getVal('primary_phone'),
                email: getVal('email'),
                currency_code: getVal('currency_code'),
                account_code: getVal('account_code'),
                is_active: getVal('is_active') === '' || ['1', 'yes', 'true'].includes(getVal('is_active').toLowerCase()),
                _errors: []
            };

            // Client-side Validation
            if (!item.name_en) item._errors.push('Name (EN) is required');
            if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) item._errors.push('Invalid email format');
            
            // Validate Group Code (Optional: if provided, check if it exists in props.groups)
            if (item.group_code && groups && groups.length > 0) {
                const groupExists = groups.some(g => g.code === item.group_code);
                if (!groupExists) item._errors.push('Group Code not found');
            }

            // Check duplicates in current batch
            if (valid.find(v => v.customer_code === item.customer_code && item.customer_code)) {
                item._errors.push('Duplicate Customer Code in file');
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

    const submitImport = async () => {
        if (excelRows.length === 0) return;
        setImportError(null);
        setImportLoading(true);
        setImportProgress(0);

        const totalRows = excelRows.length;
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < totalRows; i += batchSize) {
            batches.push(excelRows.slice(i, i + batchSize));
        }

        try {
            const batch_id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            for (let i = 0; i < batches.length; i++) {
                await new Promise((resolve, reject) => {
                    router.post(getLocalizedRoute('admin.client-sales.customers.bulk-store'), {
                        customers: batches[i],
                        batch_id: batch_id
                    }, {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            const progress = Math.min(Math.round(((i + 1) / batches.length) * 100), 100);
                            setImportProgress(progress);
                            resolve();
                        },
                        onError: (err) => {
                            reject(err);
                        }
                    });
                });
            }
            
            toast.success('تم استيراد البيانات بنجاح');
            setShowImport(false);
            setExcelRows([]);
            setInvalidRows([]);
            setImportSummary({});
            setImportProgress(0);
        } catch (err) {
            setImportError('Failed to import. Some rows may not have been processed.');
            console.error(err);
        } finally {
            setImportLoading(false);
        }
    };

    const handleExportExcel = () => {
        try {
            const dataToExport = customers.data.map(customer => ({
                'Customer Code': customer.customer_code,
                'Name (AR)': customer.name_ar,
                'Name (EN)': customer.name_en,
                'Group': customer.group?.name_en || '',
                'Phone': customer.primary_phone || '',
                'Email': customer.email || '',
                'Status': customer.is_active ? 'Active' : 'Inactive',
                'Tax Number': customer.tax_number || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

            const wscols = [
                { wch: 15 }, // Code
                { wch: 25 }, // Name AR
                { wch: 25 }, // Name EN
                { wch: 20 }, // Group
                { wch: 15 }, // Phone
                { wch: 25 }, // Email
                { wch: 10 }, // Status
                { wch: 15 }  // Tax
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Customers_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('تم تصدير البيانات بنجاح');
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('فشل عملية التصدير');
        }
    };

    const renderImportModal = () => {
        if (!showImport) return null;

        return (
            <div className="modal-overlay active" onClick={() => !importLoading && setShowImport(false)}>
                <div className="modal import-modal" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Import Customers from Excel</h3>
                        <button className="modal-close" onClick={() => setShowImport(false)}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        {!excelRows.length && !invalidRows.length ? (
                            <div 
                                className="drop-zone"
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={e => handleFileUpload(e.target.files[0])} 
                                    accept=".xlsx, .xls"
                                    style={{ display: 'none' }}
                                />
                                <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#3b82f6', marginBottom: '10px' }}>cloud_upload</span>
                                <p>Click to upload or drag and drop</p>
                                <span>Excel files only (.xlsx, .xls)</span>
                                <button className="btn-template" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                                    <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '5px' }}>download</span>
                                    Download Template
                                </button>
                            </div>
                        ) : (
                            <div className="import-preview-container">
                                <div className="preview-stats">
                                    <span className="stat-badge total">Total: {importSummary.total}</span>
                                    <span className="stat-badge valid">Valid: {importSummary.valid}</span>
                                    <span className="stat-badge invalid">Invalid: {importSummary.invalid}</span>
                                    <button className="btn-reset" onClick={() => { setExcelRows([]); setInvalidRows([]); }}>
                                        Upload Different File
                                    </button>
                                </div>

                                {importLoading && (
                                    <div className="progress-bar-container">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-bar__fill" 
                                                style={{ width: `${importProgress}%` }}
                                            ></div>
                                        </div>
                                        <div className="progress-text">جاري الاستيراد: {importProgress}%</div>
                                    </div>
                                )}

                                <div className="import-tables">
                                    {excelRows.length > 0 && (
                                        <div className="import-section">
                                            <h4>Valid Rows ({excelRows.length})</h4>
                                            <div className="table-responsive">
                                                <table className="data-table preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Code</th>
                                                            <th>Name (EN)</th>
                                                            <th>Group</th>
                                                            <th>Phone</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {excelRows.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td>{row.customer_code}</td>
                                                                <td>{row.name_en}</td>
                                                                <td>{row.group_code || '-'}</td>
                                                                <td>{row.primary_phone || '-'}</td>
                                                                <td>
                                                                    <button className="btn-icon delete" onClick={() => removeImportRow(idx)}>
                                                                        <span className="material-icons-outlined">delete</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {invalidRows.length > 0 && (
                                        <div className="import-section invalid">
                                            <h4>Invalid Rows ({invalidRows.length})</h4>
                                            <div className="table-responsive">
                                                <table className="data-table preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Code</th>
                                                            <th>Name (EN)</th>
                                                            <th>Errors</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {invalidRows.map((row, idx) => (
                                                            <tr key={idx} className="invalid-row">
                                                                <td>{row.customer_code || '-'}</td>
                                                                <td>{row.name_en || '-'}</td>
                                                                <td>
                                                                    {row._errors.map((err, i) => (
                                                                        <span key={i} className="row-error">{err}</span>
                                                                    ))}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {importError && (
                            <div className="alert alert--error" style={{ marginTop: '20px' }}>
                                {importError}
                            </div>
                        )}

                        <div className="import-instructions">
                            <h4>Instructions:</h4>
                            <ul>
                                <li>Download the template to ensure correct column mapping.</li>
                                <li><b>customer_code:</b> Required. Must be unique.</li>
                                <li><b>name_en:</b> Required.</li>
                                <li><b>group_code:</b> Optional. Must match an existing group code.</li>
                                <li><b>is_active:</b> 1 for Active, 0 for Inactive.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={() => setShowImport(false)}>Cancel</button>
                        <button 
                            className="btn-primary" 
                            onClick={submitImport}
                            disabled={excelRows.length === 0 || importLoading}
                        >
                            {importLoading ? 'Importing...' : `Import ${excelRows.length} Customers`}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout>
            <Head title="Customers Management" />
            <ToastContainer position="top-right" autoClose={3000} />
            {renderImportModal()}
            
            <div className="customers-module">
                <div className="customers-module__header">
                    <div className="header-title">
                        {mode !== 'list' && (
                            <button 
                                className="btn-back" 
                                onClick={() => setMode('list')}
                                title="Back to List"
                            >
                                <span className="material-icons-outlined mirror-rtl">arrow_back</span>
                            </button>
                        )}
                        <h1>
                            {mode === 'list' ? 'Customers Management' : 
                             mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
                        </h1>
                    </div>
                    {mode === 'list' && (
                        <div className="header-actions">
                            <form className="search-box" onSubmit={handleSearch}>
                                <span className="material-icons-outlined search-icon">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search customers..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button type="button" className="clear-search" onClick={() => { setSearch(''); router.get(getLocalizedRoute('admin.client-sales.customers.index'), {}, { preserveState: true }); }}>
                                        <span className="material-icons-outlined">close</span>
                                    </button>
                                )}
                            </form>

                            <div className="excel-dropdown-container" ref={excelMenuRef}>
                                <button
                                    type="button"
                                    className="btn-excel-main"
                                    onClick={() => setShowExcelMenu(!showExcelMenu)}
                                >
                                    <span className="material-icons-outlined">table_view</span>
                                    <span>Excel Options</span>
                                    <span className={`material-icons-outlined arrow ${showExcelMenu ? 'up' : ''}`}>expand_more</span>
                                </button>
                                {showExcelMenu && (
                                    <div className="excel-dropdown-menu">
                                        <button
                                            type="button"
                                            className="dropdown-item import"
                                            onClick={() => {
                                                setShowImport(true);
                                                setShowExcelMenu(false);
                                            }}
                                        >
                                            <span className="material-icons-outlined">upload_file</span>
                                            <div className="item-content">
                                                <span className="title">Import Excel</span>
                                                <span className="desc">Upload bulk customers</span>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            className="dropdown-item export"
                                            onClick={() => {
                                                handleExportExcel();
                                                setShowExcelMenu(false);
                                            }}
                                        >
                                            <span className="material-icons-outlined">download</span>
                                            <div className="item-content">
                                                <span className="title">Export Excel</span>
                                                <span className="desc">Download all customers</span>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button className="btn-add" onClick={handleCreate}>
                                <span className="material-icons-outlined">person_add</span>
                                <span>Add Customer</span>
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

                {mode === 'list' ? (
                    <div className="customers-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Name (EN)</th>
                                    <th>Group</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.map((customer) => (
                                    <tr key={customer.id}>
                                        <td>{customer.customer_code}</td>
                                        <td>{customer.name_en}</td>
                                        <td>{customer.group?.name_en || '-'}</td>
                                        <td>{customer.primary_phone}</td>
                                        <td>{customer.email}</td>
                                        <td>
                                            <span className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
                                                {customer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button className="btn-icon edit" onClick={() => handleEdit(customer)} title="Edit">
                                                <span className="material-icons-outlined">edit</span>
                                            </button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(customer.id)} title="Delete">
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {customers.data.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="empty-state">No customers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination
                            currentPage={customers.current_page}
                            totalPages={customers.last_page}
                            totalRecords={customers.total}
                            recordsPerPage={customers.per_page}
                            onPageChange={(page) => router.get(getLocalizedRoute('admin.client-sales.customers.index'), { search, page, per_page: customers.per_page }, { preserveState: true })}
                            onRecordsPerPageChange={(perPage) => router.get(getLocalizedRoute('admin.client-sales.customers.index'), { search, page: 1, per_page: perPage }, { preserveState: true })}
                        />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="customers-module__form-container">
                        <div className="customers-module__tabs">
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
                        <div className={`customers-module__tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                            <div className="customers-module__grid">
                                <div className="customers-module__group">
                                    <label>Customer Code <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        value={data.customer_code} 
                                        onChange={e => setData('customer_code', e.target.value)}
                                        className={errors.customer_code ? 'error' : ''}
                                        disabled={mode === 'create'}
                                        placeholder={mode === 'create' ? "Auto-generated (e.g. CUS-10001)" : ""}
                                    />
                                    {errors.customer_code && <span className="error-msg">{errors.customer_code}</span>}
                                </div>
                                <div className="customers-module__group">
                                    <label>Name (AR)</label>
                                    <input 
                                        type="text" 
                                        value={data.name_ar} 
                                        onChange={e => setData('name_ar', e.target.value)}
                                    />
                                </div>
                                <div className="customers-module__group">
                                    <label>Name (EN) <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        value={data.name_en} 
                                        onChange={e => setData('name_en', e.target.value)}
                                        className={errors.name_en ? 'error' : ''}
                                    />
                                    {errors.name_en && <span className="error-msg">{errors.name_en}</span>}
                                </div>
                                <div className="customers-module__group">
                                    <label>Group</label>
                                    <select value={data.customer_group_id} onChange={e => setData('customer_group_id', e.target.value)}>
                                        <option value="">Select Group</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name_en}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Currency</label>
                                    <select value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                        <option value="">Select Currency</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Account</label>
                                    <select value={data.account_id} onChange={e => setData('account_id', e.target.value)}>
                                        <option value="">Select Account</option>
                                        {accounts.map(a => <option key={a.AccID} value={a.AccID}>{a.Name_en}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Price List</label>
                                    <select value={data.price_list_id} onChange={e => setData('price_list_id', e.target.value)}>
                                        <option value="">Select Price List</option>
                                        {priceLists.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Sales Agent</label>
                                    <select value={data.sales_agent_id} onChange={e => setData('sales_agent_id', e.target.value)}>
                                        <option value="">Select Sales Agent</option>
                                        {salesAgents.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Warehouse</label>
                                    <select value={data.default_warehouse_id} onChange={e => setData('default_warehouse_id', e.target.value)}>
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Tax Number</label>
                                    <input type="text" value={data.tax_number} onChange={e => setData('tax_number', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Commercial Register</label>
                                    <input type="text" value={data.commercial_register} onChange={e => setData('commercial_register', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Credit Limit</label>
                                    <input type="number" value={data.credit_limit} onChange={e => setData('credit_limit', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Payment Terms (Days)</label>
                                    <input type="number" value={data.payment_terms} onChange={e => setData('payment_terms', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Primary Phone</label>
                                    <input type="text" value={data.primary_phone} onChange={e => setData('primary_phone', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Secondary Phone</label>
                                    <input type="text" value={data.secondary_phone} onChange={e => setData('secondary_phone', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Mobile</label>
                                    <input type="text" value={data.mobile} onChange={e => setData('mobile', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Fax</label>
                                    <input type="text" value={data.fax} onChange={e => setData('fax', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Email</label>
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Website</label>
                                    <input type="url" value={data.website} onChange={e => setData('website', e.target.value)} />
                                </div>
                                <div className="customers-module__group">
                                    <label>Active Status</label>
                                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                        <input 
                                            type="checkbox" 
                                            checked={data.is_active} 
                                            onChange={e => setData('is_active', e.target.checked)}
                                        />
                                        <span>Active</span>
                                    </div>
                                </div>
                                <div className="customers-module__group customers-module__grid--full">
                                    <label>Notes</label>
                                    <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows="3"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* ADDRESSES TAB */}
                        <div className={`customers-module__tab-content ${activeTab === 'addresses' ? 'active' : ''}`}>
                             <button type="button" className="add-more-btn" onClick={() => addNested('addresses', {
                                address: '', country_id: '', city_id: '', state: '', postal_code: '', 
                                is_default: false, is_billing: false, is_shipping: false
                            })}>
                                + Add Address
                            </button>
                            
                            <div className="card-list">
                                {data.addresses.map((addr, index) => (
                                    <div key={index} className="card-item">
                                        <div className="card-item__header">
                                            <span>Address #{index + 1}</span>
                                        </div>
                                        <div className="card-item__actions">
                                            <button type="button" onClick={() => removeNested('addresses', index)}>Remove</button>
                                        </div>
                                        <div className="customers-module__grid">
                                            <div className="customers-module__group customers-module__grid--full">
                                                <label>Address Details</label>
                                                <input 
                                                    type="text" 
                                                    value={addr.address} 
                                                    onChange={e => updateNested('addresses', index, 'address', e.target.value)}
                                                    placeholder="Street, Building, etc."
                                                />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Country</label>
                                                <select value={addr.country_id} onChange={e => updateNested('addresses', index, 'country_id', e.target.value)}>
                                                    <option value="">Select Country</option>
                                                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="customers-module__group">
                                                <label>City</label>
                                                <select value={addr.city_id} onChange={e => updateNested('addresses', index, 'city_id', e.target.value)}>
                                                    <option value="">Select City</option>
                                                    {cities.filter(c => !addr.country_id || c.country_id == addr.country_id).map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="customers-module__group">
                                                <label>State / Region</label>
                                                <input type="text" value={addr.state} onChange={e => updateNested('addresses', index, 'state', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Postal Code</label>
                                                <input type="text" value={addr.postal_code} onChange={e => updateNested('addresses', index, 'postal_code', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group customers-module__grid--full">
                                                <div style={{display: 'flex', gap: '2rem'}}>
                                                    <label>
                                                        <input type="checkbox" checked={addr.is_default} onChange={e => updateNested('addresses', index, 'is_default', e.target.checked)} />
                                                        <span style={{marginLeft: '0.5rem'}}>Default</span>
                                                    </label>
                                                    <label>
                                                        <input type="checkbox" checked={addr.is_billing} onChange={e => updateNested('addresses', index, 'is_billing', e.target.checked)} />
                                                        <span style={{marginLeft: '0.5rem'}}>Billing</span>
                                                    </label>
                                                    <label>
                                                        <input type="checkbox" checked={addr.is_shipping} onChange={e => updateNested('addresses', index, 'is_shipping', e.target.checked)} />
                                                        <span style={{marginLeft: '0.5rem'}}>Shipping</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CONTACTS TAB */}
                        <div className={`customers-module__tab-content ${activeTab === 'contacts' ? 'active' : ''}`}>
                            <button type="button" className="add-more-btn" onClick={() => addNested('contacts', {
                                first_name: '', last_name: '', email: '', phone: '', position: '', department: '', is_primary: false
                            })}>
                                + Add Contact Person
                            </button>

                            <div className="card-list">
                                {data.contacts.map((contact, index) => (
                                    <div key={index} className="card-item">
                                        <div className="card-item__header">
                                            <span>Contact #{index + 1}</span>
                                        </div>
                                        <div className="card-item__actions">
                                            <button type="button" onClick={() => removeNested('contacts', index)}>Remove</button>
                                        </div>
                                        <div className="customers-module__grid">
                                            <div className="customers-module__group">
                                                <label>First Name</label>
                                                <input type="text" value={contact.first_name} onChange={e => updateNested('contacts', index, 'first_name', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Last Name</label>
                                                <input type="text" value={contact.last_name} onChange={e => updateNested('contacts', index, 'last_name', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Email</label>
                                                <input type="email" value={contact.email} onChange={e => updateNested('contacts', index, 'email', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Phone</label>
                                                <input type="text" value={contact.phone} onChange={e => updateNested('contacts', index, 'phone', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Position</label>
                                                <input type="text" value={contact.position} onChange={e => updateNested('contacts', index, 'position', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>Department</label>
                                                <input type="text" value={contact.department} onChange={e => updateNested('contacts', index, 'department', e.target.value)} />
                                            </div>
                                            <div className="customers-module__group">
                                                <label>
                                                    <input type="checkbox" checked={contact.is_primary} onChange={e => updateNested('contacts', index, 'is_primary', e.target.checked)} />
                                                    <span style={{marginLeft: '0.5rem'}}>Primary Contact</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OPENING BALANCE TAB */}
                        <div className={`customers-module__tab-content ${activeTab === 'opening_balance' ? 'active' : ''}`}>
                            <div className="customers-module__grid">
                                <div className="customers-module__group">
                                    <label>Opening Date</label>
                                    <input 
                                        type="date" 
                                        value={data.opening_balance.opening_date} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, opening_date: e.target.value})} 
                                    />
                                </div>
                                <div className="customers-module__group">
                                    <label>Financial Year</label>
                                    <input 
                                        type="number" 
                                        value={data.opening_balance.financial_year} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, financial_year: e.target.value})} 
                                    />
                                </div>
                                <div className="customers-module__group">
                                    <label>Currency</label>
                                    <select 
                                        value={data.opening_balance.currency_id} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, currency_id: e.target.value})}
                                    >
                                        <option value="">Select Currency</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                                    </select>
                                </div>
                                <div className="customers-module__group">
                                    <label>Exchange Rate</label>
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        value={data.opening_balance.exchange_rate} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, exchange_rate: e.target.value})} 
                                    />
                                </div>
                                <div className="customers-module__group">
                                    <label>Debit Amount (Receivable)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.opening_balance.debit_amount} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, debit_amount: e.target.value})} 
                                    />
                                </div>
                                <div className="customers-module__group">
                                    <label>Credit Amount (Advance)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.opening_balance.credit_amount} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, credit_amount: e.target.value})} 
                                    />
                                </div>
                                <div className="customers-module__group customers-module__grid--full">
                                    <label>Notes</label>
                                    <textarea 
                                        value={data.opening_balance.notes} 
                                        onChange={e => setData('opening_balance', {...data.opening_balance, notes: e.target.value})}
                                        rows="2"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="customers-module__actions">
                            <button type="button" className="btn-secondary" onClick={() => setMode('list')}>
                                <span className="material-icons-outlined mirror-rtl">arrow_back</span>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={processing}>
                                <span className="material-icons-outlined">save</span>
                                {mode === 'create' ? 'Create Customer' : 'Update Customer'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
