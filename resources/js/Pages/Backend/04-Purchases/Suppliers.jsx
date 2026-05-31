import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import Pagination from '../components/Pagination';

export default function Suppliers({ suppliers, groups, cities, currencies, accounts, filters }) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('general');
    const [search, setSearch] = useState(filters?.search || '');
    const [accountOpen, setAccountOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const accountDropdownRef = useRef(null);

    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};
    console.log('Suppliers translations:', translations);

    const t = (key, fallback) => {
        return translations[`Suppliers.${key}`] || fallback;
    };

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

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
          });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(getLocalizedRoute('admin.purchases.suppliers.index'), { search }, { preserveState: true });
    };

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
        if (confirm(t('delete_confirm', 'Are you sure you want to delete this supplier?'))) {
            destroy(getLocalizedRoute('admin.purchases.suppliers.destroy', { supplier: id }), {
                onError: () => setErrorMessage(t('failed_delete', 'Failed to delete supplier.'))
            });
        }
    };

    const handleToggleFavorite = (supplier) => {
        router.post(getLocalizedRoute('admin.purchases.suppliers.toggleFavorite', { supplier: supplier.id }), {}, {
            preserveScroll: true,
            preserveState: true,
            onError: () => setErrorMessage(t('failed_favorite', "Failed to update favorite status."))
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMessage(null); // Clear previous errors
        
        const handleError = (errors) => {
            setErrorMessage(t('correct_errors', "Please correct the errors below."));
            if (Object.keys(errors).some(k => k.startsWith('addresses'))) setActiveTab('addresses');
            else if (Object.keys(errors).some(k => k.startsWith('contacts'))) setActiveTab('contacts');
            else if (Object.keys(errors).some(k => k.startsWith('opening_balance'))) setActiveTab('opening_balance');
            else setActiveTab('general');
        };

        if (mode === 'create') {
            post(getLocalizedRoute('admin.purchases.suppliers.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: handleError,
            });
        } else {
            put(getLocalizedRoute('admin.purchases.suppliers.update', { supplier: data.id }), {
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

    // --- IMPORT & EXPORT SYSTEM LOGIC ---
    const downloadTemplate = () => {
        const headers = ['supplier_code', 'name_ar', 'group_code', 'primary_phone', 'email', 'currency_code', 'account_code', 'is_active'];
        const sample = ['VEN-10001', 'مورد 1', 'GRP-001', '01000000001', 'supplier1@example.com', 'SAR', '2101', '1'];
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
            
            // Validate Group Code (Optional: if provided, check if it exists in props.groups)
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
                    router.post(getLocalizedRoute('admin.purchases.suppliers.bulkImport'), {
                        rows: batches[i],
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
            const dataToExport = suppliers.data.map(supplier => ({
                'Supplier Code': supplier.supplier_code,
                'Name (AR)': supplier.name_ar,
                'Group': supplier.group?.name_en || '',
                'Phone': supplier.primary_phone || '',
                'Email': supplier.email || '',
                'Status': supplier.is_active ? 'Active' : 'Inactive',
                'Tax Number': supplier.tax_number || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");

            const wscols = [
                { wch: 15 }, // Code
                { wch: 30 }, // Name
                { wch: 20 }, // Group
                { wch: 15 }, // Phone
                { wch: 25 }, // Email
                { wch: 10 }, // Status
                { wch: 15 }  // Tax
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Suppliers_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                <div className="modal import-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">{t('import_excel_title', 'Import Suppliers from Excel')}</h3>
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
                                <p>{t('click_to_upload', 'Click to upload or drag and drop')}</p>
                                <span>{t('excel_only', 'Excel files only (.xlsx, .xls)')}</span>
                                <button className="btn-template" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                                    <span className="material-icons-outlined" style={{ verticalAlign: 'middle', [localization?.is_rtl ? 'marginLeft' : 'marginRight']: '5px' }}>download</span>
                                    {t('download_template', 'Download Template')}
                                </button>
                            </div>
                        ) : (
                            <div className="import-preview-container">
                                <div className="preview-stats">
                                    <span className="stat-badge total">{t('total', 'Total')}: {importSummary.total}</span>
                                    <span className="stat-badge valid">{t('valid', 'Valid')}: {importSummary.valid}</span>
                                    <span className="stat-badge invalid">{t('invalid', 'Invalid')}: {importSummary.invalid}</span>
                                </div>

                                {importLoading && (
                                    <div className="progress-bar-container">
                                        <div className="progress-bar">
                                            <div className="progress-bar__fill" style={{ width: `${importProgress}%` }}></div>
                                        </div>
                                        <div className="progress-text">{t('importing', 'Importing')} {importProgress}%</div>
                                    </div>
                                )}

                                {importError && <div className="alert alert--error">{importError}</div>}

                                <div className="import-section">
                                    <h4>{t('ready_to_import', 'Ready to Import')}</h4>
                                    <div className="table-container">
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    <th>{t('supplier_code', 'Code')}</th>
                                                    <th>{t('name', 'Name')}</th>
                                                    <th>{t('group', 'Group')}</th>
                                                    <th>{t('actions', 'Action')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {excelRows.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td>{row.supplier_code}</td>
                                                        <td>{row.name_ar}</td>
                                                        <td>{row.group_code}</td>
                                                        <td>
                                                            <button className="btn-remove" onClick={() => removeImportRow(idx)}>
                                                                <span className="material-icons-outlined">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {invalidRows.length > 0 && (
                                    <div className="import-section invalid">
                                        <h4>{t('invalid_rows', 'Invalid Rows')}</h4>
                                        <div className="table-container">
                                            <table className="preview-table">
                                                <thead>
                                                    <tr>
                                                        <th>{t('name', 'Name')}</th>
                                                        <th>{t('errors', 'Errors')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invalidRows.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td>{row.name_ar}</td>
                                                            <td>
                                                                {row._errors.map((err, eIdx) => (
                                                                    <span key={eIdx} className="row-error">{err}</span>
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
                        )}
                    </div>

                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={() => setShowImport(false)} disabled={importLoading}>
                            {t('cancel', 'Cancel')}
                        </button>
                        <button 
                            className="btn-import" 
                            onClick={submitImport} 
                            disabled={importLoading || !excelRows.length}
                        >
                            {importLoading ? t('importing', 'Importing...') : t('confirm_import', 'Confirm Import')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const breadcrumbs = [
        { label: t('dashboard', 'Dashboard'), href: route('admin.dashboard') },
        { label: t('purchases', 'Purchases'), href: '#' },
        { label: t('suppliers', 'Suppliers'), onClick: () => setMode('list') }
    ];

    if (mode === 'create') breadcrumbs.push({ label: t('add_supplier', 'Add New') });
    if (mode === 'edit') breadcrumbs.push({ label: t('edit_supplier', 'Edit Supplier') });

    const filtersContent = (
        <div className="page-header" style={{ marginBottom: '0' }}>
            <div className="header-title-container">
                <h1 className="header-title">
                    {mode === 'list' ? t('suppliers', 'Suppliers Management') : 
                     mode === 'create' ? t('add_supplier', 'Add New Supplier') : t('edit_supplier', 'Edit Supplier')}
                </h1>
            </div>
            {mode === 'list' && (
                <div className="suppliers-actions">
                    <form onSubmit={handleSearch} className="search-form">
                        <input
                            type="text"
                            className="search-input"
                            placeholder={t('search_suppliers', 'Search suppliers...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                    <div className="excel-dropdown-container" ref={excelMenuRef}>
                        <button 
                            className="btn-excel-main" 
                            onClick={() => setShowExcelMenu(!showExcelMenu)}
                        >
                            <span className="material-icons-outlined">table_view</span>
                            <span>{t('excel', 'Excel Options')}</span>
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
                                        <span className="title">{t('import_excel', 'Import Excel')}</span>
                                        <span className="desc">{t('import_desc', 'Upload bulk suppliers')}</span>
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
                                        <span className="title">{t('export_excel', 'Export Excel')}</span>
                                        <span className="desc">{t('export_desc', 'Download all suppliers')}</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="btn-add" onClick={handleCreate}>
                        <span className="material-icons-outlined">person_add</span>
                        <span>{t('add_supplier', 'Add Supplier')}</span>
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title={`${t('suppliers', 'Suppliers Management')} - ZodicERP`} />
            <ToastContainer position="top-right" autoClose={3000} />
            {renderImportModal()}
            
            <BlankPage breadcrumbs={breadcrumbs} filters={filtersContent}>
                <div className="suppliers-container">
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
                                        <th>{t('supplier_code', 'Code')}</th>
                                        <th>{t('name', 'Name')}</th>
                                        <th>{t('group', 'Group')}</th>
                                        <th>{t('phone', 'Phone')}</th>
                                        <th>{t('email', 'Email')}</th>
                                        <th>{t('telegram', 'Telegram')}</th>
                                        <th>{t('status', 'Status')}</th>
                                        <th>{t('actions', 'Actions')}</th>
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
                                                    {supplier.is_active ? t('active', 'Active') : t('inactive', 'Inactive')}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                    className={`btn-favorite ${supplier.favorite ? 'active' : ''}`}
                                                    onClick={() => handleToggleFavorite(supplier)}
                                                    title={supplier.favorite ? t('unfavorite', "Unfavorite") : t('favorite', "Favorite")}
                                                >
                                                    <span className="material-icons-outlined">
                                                        {supplier.favorite ? 'star' : 'star_border'}
                                                    </span>
                                                </button>
                                                <button className="btn-icon edit" onClick={() => handleEdit(supplier)} title={t('edit', 'Edit')}>
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="btn-icon delete" onClick={() => handleDelete(supplier.id)} title={t('delete', 'Delete')}>
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {suppliers.data.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="empty-state">{t('no_suppliers_found', 'No suppliers found.')}</td>
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
                                onPageChange={(page) => router.get(getLocalizedRoute('admin.purchases.suppliers.index'), { search, page, per_page: suppliers.per_page }, { preserveState: true })}
                                onRecordsPerPageChange={(perPage) => router.get(getLocalizedRoute('admin.purchases.suppliers.index'), { search, page: 1, per_page: perPage }, { preserveState: true })}
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
                                            {t(tab, tab.replace('_', ' ').toUpperCase())}
                                        </button>
                                    ))}
                            </div>

                            {/* GENERAL TAB */}
                            <div className={`tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                                <div className="form-row">
                                    {/* Supplier Code is auto-generated in backend */}
                                    <div className="form-group">
                                        <label className="form-label">{t('name', 'Name')}</label>
                                        <input 
                                            type="text" 
                                            className={`form-control ${errors.name_ar ? 'is-invalid' : ''}`}
                                            value={data.name_ar} 
                                            onChange={e => setData('name_ar', e.target.value)}
                                        />
                                        {errors.name_ar && <span className="invalid-feedback">{errors.name_ar}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('store_name', 'Store Name')}</label>
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
                                        <label className="form-label">{t('group', 'Group')}</label>
                                        <select className={`form-control ${errors.supplier_group_id ? 'is-invalid' : ''}`} value={data.supplier_group_id} onChange={e => setData('supplier_group_id', e.target.value)}>
                                            <option value="">{t('select_group', 'Select Group')}</option>
                                            {groups.map(g => <option key={g.id} value={g.id}>{g.name_en}</option>)}
                                        </select>
                                        {errors.supplier_group_id && <span className="invalid-feedback">{errors.supplier_group_id}</span>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('currency', 'Currency')}</label>
                                        <select className={`form-control ${errors.currency_id ? 'is-invalid' : ''}`} value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                            <option value="">{t('select_currency', 'Select Currency')}</option>
                                            {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                        </select>
                                        {errors.currency_id && <span className="invalid-feedback">{errors.currency_id}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('account', 'Account')}</label>
                                        <div className="select-dropdown" ref={accountDropdownRef}>
                                            <button
                                                type="button"
                                                className={`select-dropdown__button ${!data.account_id ? 'is-placeholder' : ''} ${errors.account_id ? 'is-invalid' : ''}`}
                                                onClick={() => setAccountOpen(prev => !prev)}
                                            >
                                                <span>{selectedAccount ? selectedAccount.Name_en : t('select_account', 'Select Account')}</span>
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
                                                        {t('select_account', 'Select Account')}
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
                                        <label className="form-label">{t('tax_number', 'Tax Number')}</label>
                                        <input className={`form-control ${errors.tax_number ? 'is-invalid' : ''}`} type="text" value={data.tax_number} onChange={e => setData('tax_number', e.target.value)} />
                                        {errors.tax_number && <span className="invalid-feedback">{errors.tax_number}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('commercial_register', 'Commercial Register')}</label>
                                        <input className={`form-control ${errors.commercial_register ? 'is-invalid' : ''}`} type="text" value={data.commercial_register} onChange={e => setData('commercial_register', e.target.value)} />
                                        {errors.commercial_register && <span className="invalid-feedback">{errors.commercial_register}</span>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('credit_limit', 'Credit Limit')}</label>
                                        <input className={`form-control ${errors.credit_limit ? 'is-invalid' : ''}`} type="number" value={data.credit_limit} onChange={e => setData('credit_limit', e.target.value)} />
                                        {errors.credit_limit && <span className="invalid-feedback">{errors.credit_limit}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('mobile', 'Mobile')}</label>
                                        <input className={`form-control ${errors.primary_phone ? 'is-invalid' : ''}`} type="text" value={data.primary_phone} onChange={e => setData('primary_phone', e.target.value)} />
                                        {errors.primary_phone && <span className="invalid-feedback">{errors.primary_phone}</span>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('email', 'Email')}</label>
                                        <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                        {errors.email && <span className="invalid-feedback">{errors.email}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('website', 'Website')}</label>
                                        <input className={`form-control ${errors.website ? 'is-invalid' : ''}`} type="text" value={data.website} onChange={e => setData('website', e.target.value)} />
                                        {errors.website && <span className="invalid-feedback">{errors.website}</span>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('password', 'Password')}</label>
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
                                        <label className="form-label">{t('confirm_password', 'Confirm Password')}</label>
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
                                        <label className="form-label" htmlFor="show_password">{t('show_password', 'Show Password')}</label>
                                    </div>
                                </div>

                                <div className="checkbox-row">
                                    <div className="checkbox-group">
                                        <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} id="is_active" />
                                        <label className="form-label" htmlFor="is_active">{t('is_active', 'Is Active')}</label>
                                    </div>
                                    <div className="checkbox-group">
                                        <input type="checkbox" checked={data.is_vendor} onChange={e => setData('is_vendor', e.target.checked)} id="is_vendor" />
                                        <label className="form-label" htmlFor="is_vendor">{t('is_vendor', 'Is Vendor')}</label>
                                    </div>
                                    <div className="checkbox-group">
                                        <input type="checkbox" checked={data.is_manufacturer} onChange={e => setData('is_manufacturer', e.target.checked)} id="is_manufacturer" />
                                        <label className="form-label" htmlFor="is_manufacturer">{t('is_manufacturer', 'Is Manufacturer')}</label>
                                    </div>
                                </div>
                            </div>

                            {/* ADDRESSES TAB */}
                            <div className={`tab-content ${activeTab === 'addresses' ? 'active' : ''}`}>
                                <div className="form-group">
                                    <button type="button" className="btn-secondary" onClick={() => addNested('addresses', { address_type: '', address_name: '', street: '', location_id: '' })}>
                                        + {t('add_address', 'Add Address')}
                                    </button>
                                </div>
                                <div>
                                    {data.addresses.map((address, index) => (
                                        <div key={index} className="nested-card">
                                            <div className="nested-card-header">
                                                <h4 className="nested-card-title">{t('address', 'Address')} #{index + 1}</h4>
                                                <button type="button" className="btn-danger btn-sm" onClick={() => removeNested('addresses', index)}>{t('remove', 'Remove')}</button>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label">{t('type', 'Type')}</label>
                                                    <select 
                                                        className={`form-control ${getNestedError('addresses', index, 'address_type') ? 'is-invalid' : ''}`} 
                                                        value={address.address_type} 
                                                        onChange={e => updateNested('addresses', index, 'address_type', e.target.value)}
                                                    >
                                                        <option value="">{t('select_type', 'Select Type')}</option>
                                                        <option value="billing">{t('billing', 'Billing')}</option>
                                                        <option value="shipping">{t('shipping', 'Shipping')}</option>
                                                    </select>
                                                    {getNestedError('addresses', index, 'address_type') && <span className="invalid-feedback">{getNestedError('addresses', index, 'address_type')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('name', 'Name')}</label>
                                                    <input 
                                                        className={`form-control ${getNestedError('addresses', index, 'address_name') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={address.address_name} 
                                                        onChange={e => updateNested('addresses', index, 'address_name', e.target.value)} 
                                                    />
                                                    {getNestedError('addresses', index, 'address_name') && <span className="invalid-feedback">{getNestedError('addresses', index, 'address_name')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('street', 'Street')}</label>
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
                                                    <label className="form-label">{t('location', 'Location')}</label>
                                                    <select 
                                                        className={`form-control ${getNestedError('addresses', index, 'location_id') ? 'is-invalid' : ''}`} 
                                                        value={address.location_id} 
                                                        onChange={e => updateNested('addresses', index, 'location_id', e.target.value)}
                                                    >
                                                        <option value="">{t('select_location', 'Select Location')}</option>
                                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    {getNestedError('addresses', index, 'location_id') && <span className="invalid-feedback">{getNestedError('addresses', index, 'location_id')}</span>}
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
                                        + {t('add_contact', 'Add Contact')}
                                    </button>
                                </div>
                                <div>
                                    {data.contacts.map((contact, index) => (
                                        <div key={index} className="nested-card">
                                            <div className="nested-card-header">
                                                <h4 className="nested-card-title">{t('contact', 'Contact')} #{index + 1}</h4>
                                                <button type="button" className="btn-danger btn-sm" onClick={() => removeNested('contacts', index)}>{t('remove', 'Remove')}</button>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label">{t('name_ar', 'Name (AR)')} <span className="required">*</span></label>
                                                    <input 
                                                        className={`form-control ${getNestedError('contacts', index, 'name_ar') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={contact.name_ar || ''} 
                                                        onChange={e => updateNested('contacts', index, 'name_ar', e.target.value)} 
                                                    />
                                                    {getNestedError('contacts', index, 'name_ar') && <span className="invalid-feedback">{getNestedError('contacts', index, 'name_ar')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('name_en', 'Name (EN)')}</label>
                                                    <input 
                                                        className={`form-control ${getNestedError('contacts', index, 'name_en') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={contact.name_en || ''} 
                                                        onChange={e => updateNested('contacts', index, 'name_en', e.target.value)} 
                                                    />
                                                    {getNestedError('contacts', index, 'name_en') && <span className="invalid-feedback">{getNestedError('contacts', index, 'name_en')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('department', 'Department')}</label>
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
                                                    <label className="form-label">{t('position_ar', 'Position (AR)')}</label>
                                                    <input 
                                                        className={`form-control ${getNestedError('contacts', index, 'position_ar') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={contact.position_ar || ''} 
                                                        onChange={e => updateNested('contacts', index, 'position_ar', e.target.value)} 
                                                    />
                                                    {getNestedError('contacts', index, 'position_ar') && <span className="invalid-feedback">{getNestedError('contacts', index, 'position_ar')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('position_en', 'Position (EN)')}</label>
                                                    <input 
                                                        className={`form-control ${getNestedError('contacts', index, 'position_en') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={contact.position_en || ''} 
                                                        onChange={e => updateNested('contacts', index, 'position_en', e.target.value)} 
                                                    />
                                                    {getNestedError('contacts', index, 'position_en') && <span className="invalid-feedback">{getNestedError('contacts', index, 'position_en')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('phone', 'Phone')}</label>
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
                                                    <label className="form-label">{t('mobile', 'Mobile')}</label>
                                                    <input 
                                                        className={`form-control ${getNestedError('contacts', index, 'mobile') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={contact.mobile || ''} 
                                                        onChange={e => updateNested('contacts', index, 'mobile', e.target.value)} 
                                                    />
                                                    {getNestedError('contacts', index, 'mobile') && <span className="invalid-feedback">{getNestedError('contacts', index, 'mobile')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('whatsapp', 'WhatsApp')}</label>
                                                    <input 
                                                        className={`form-control ${getNestedError('contacts', index, 'whatsapp') ? 'is-invalid' : ''}`} 
                                                        type="text" 
                                                        value={contact.whatsapp || ''} 
                                                        onChange={e => updateNested('contacts', index, 'whatsapp', e.target.value)} 
                                                    />
                                                    {getNestedError('contacts', index, 'whatsapp') && <span className="invalid-feedback">{getNestedError('contacts', index, 'whatsapp')}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">{t('telegram', 'Telegram')}</label>
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
                                                    <label htmlFor={`contact-primary-${index}`} className="form-label">{t('is_primary', 'Is Primary')}</label>
                                                </div>
                                                <div className="checkbox-group">
                                                    <input type="checkbox" checked={Boolean(contact.receive_statements)} onChange={e => updateNested('contacts', index, 'receive_statements', e.target.checked)} id={`contact-statements-${index}`} />
                                                    <label htmlFor={`contact-statements-${index}`} className="form-label">{t('receive_statements', 'Receive Statements')}</label>
                                                </div>
                                                <div className="checkbox-group">
                                                    <input type="checkbox" checked={Boolean(contact.receive_notifications)} onChange={e => updateNested('contacts', index, 'receive_notifications', e.target.checked)} id={`contact-notifications-${index}`} />
                                                    <label htmlFor={`contact-notifications-${index}`} className="form-label">{t('receive_notifications', 'Receive Notifications')}</label>
                                                </div>
                                            </div>

                                            <div className="form-group-full">
                                                <label className="form-label">{t('notes', 'Notes')}</label>
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
                                        <label className="form-label">{t('financial_year', 'Financial Year')}</label>
                                        <input 
                                            className={`form-control ${errors['opening_balance.financial_year'] ? 'is-invalid' : ''}`}
                                            type="number" 
                                            value={data.opening_balance.financial_year} 
                                            onChange={e => setData('opening_balance', { ...data.opening_balance, financial_year: e.target.value })} 
                                        />
                                        {errors['opening_balance.financial_year'] && <span className="invalid-feedback">{errors['opening_balance.financial_year']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('opening_date', 'Opening Date')}</label>
                                        <input 
                                            className={`form-control ${errors['opening_balance.opening_date'] ? 'is-invalid' : ''}`}
                                            type="date" 
                                            value={data.opening_balance.opening_date} 
                                            onChange={e => setData('opening_balance', { ...data.opening_balance, opening_date: e.target.value })} 
                                        />
                                        {errors['opening_balance.opening_date'] && <span className="invalid-feedback">{errors['opening_balance.opening_date']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('currency', 'Currency')}</label>
                                        <select 
                                            className={`form-control ${errors['opening_balance.currency_id'] ? 'is-invalid' : ''}`}
                                            value={data.opening_balance.currency_id} 
                                            onChange={e => setData('opening_balance', { ...data.opening_balance, currency_id: e.target.value })}
                                        >
                                            <option value="">{t('select_currency', 'Select Currency')}</option>
                                            {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                                        </select>
                                        {errors['opening_balance.currency_id'] && <span className="invalid-feedback">{errors['opening_balance.currency_id']}</span>}
                                    </div>
                                 </div>
                                 <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('exchange_rate', 'Exchange Rate')}</label>
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
                                        <label className="form-label">{t('debit_amount', 'Debit Amount')}</label>
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
                                        <label className="form-label">{t('credit_amount', 'Credit Amount')}</label>
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
                                    <label className="form-label">{t('notes', 'Notes')}</label>
                                    <textarea 
                                        className={`form-control form-textarea ${errors['opening_balance.notes'] ? 'is-invalid' : ''}`}
                                        value={data.opening_balance.notes} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, notes: e.target.value })} 
                                    />
                                    {errors['opening_balance.notes'] && <span className="invalid-feedback">{errors['opening_balance.notes']}</span>}
                                 </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setMode('list')} disabled={processing}>
                                    {t('cancel', 'Cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? t('saving', 'Saving...') : t('save', 'Save Supplier')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </BlankPage>
        </AdminLayout>
    );
}
