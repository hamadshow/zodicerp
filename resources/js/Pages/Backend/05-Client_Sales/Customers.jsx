import React, { useState, useRef } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import Pagination from '../components/Pagination';

export default function Customers({ customers, groups, countries, cities, currencies, accounts, warehouses, priceLists, salesAgents }) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('general');
    
    // Import System State
    const [showImport, setShowImport] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [importSummary, setImportSummary] = useState({});
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef(null);

    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};
    const localization = props.localization;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
          });
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

    // --- IMPORT SYSTEM LOGIC ---
    const downloadTemplate = () => {
        const headers = ['customer_code', 'name_ar', 'name_en', 'group_code', 'primary_phone', 'email', 'currency_code', 'account_code', 'is_active'];
        const sample = ['CUS-10001', 'عميل 1', 'Customer 1', 'GRP-001', '01000000001', 'cust1@example.com', 'EGP', '2101', '1'];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "customers_template.xlsx");
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                processExcelData(jsonData);
            } catch (err) {
                alert(err?.message || 'Error reading file');
                setImportLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            handleFileUpload(file);
        } else {
            alert('Please upload a valid Excel file (.xlsx, .xls)');
        }
    };

    const processExcelData = (rows) => {
        if (rows.length < 2) {
            alert('File is empty or missing headers');
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

    const submitImport = () => {
        if (excelRows.length === 0) return;
        const batch_id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        router.post(getLocalizedRoute('admin.client-sales.customers.bulk-store'), {
            customers: excelRows,
            batch_id: batch_id
        }, {
            onSuccess: () => {
                setShowImport(false);
                setExcelRows([]);
                setInvalidRows([]);
                setImportSummary({});
                // Optional: Force reload or show success message via flash
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Customers Management" />
            
            <div className="customers-module">
                <div className="customers-module__header">
                    <div className="header-title">
                        {mode !== 'list' && (
                            <button 
                                className="btn-back" 
                                onClick={() => setMode('list')}
                                title="Back to List"
                            >
                                <i className="material-icons mirror-rtl">arrow_back</i>
                            </button>
                        )}
                        <h1>
                            {mode === 'list' ? 'Customers Management' : 
                             mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
                        </h1>
                    </div>
                    {mode === 'list' && (
                        <div className="header-actions">
                             <button className="btn-import" onClick={() => setShowImport(true)}>
                                <i className="icon-upload"></i> Import Excel
                            </button>
                            <button className="btn-add" onClick={handleCreate}>
                                + Add Customer
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
                                            <button className="edit" onClick={() => handleEdit(customer)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(customer.id)}>Delete</button>
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
                            onPageChange={(page) => router.get(getLocalizedRoute('admin.client-sales.customers.index'), { page, per_page: customers.per_page }, { preserveState: true })}
                            onRecordsPerPageChange={(perPage) => router.get(getLocalizedRoute('admin.client-sales.customers.index'), { page: 1, per_page: perPage }, { preserveState: true })}
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
                                <i className="material-icons mirror-rtl">arrow_back</i>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={processing}>
                                <i className="material-icons">save</i>
                                {mode === 'create' ? 'Create Customer' : 'Update Customer'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Import Modal */}
                {showImport && (
                    <div className="import-modal-overlay">
                        <div className="import-modal">
                            <div className="import-modal__header">
                                <h2>Import Customers from Excel</h2>
                                <button className="close-btn" onClick={() => setShowImport(false)}>&times;</button>
                            </div>
                            <div className="import-modal__content">
                                {excelRows.length === 0 && invalidRows.length === 0 ? (
                                    <>
                                        <div 
                                            className="drop-zone"
                                            onDrop={handleFileDrop}
                                            onDragOver={e => e.preventDefault()}
                                            onClick={() => fileInputRef.current.click()}
                                        >
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                style={{display: 'none'}} 
                                                accept=".xlsx, .xls"
                                                onChange={e => handleFileUpload(e.target.files[0])}
                                            />
                                            {importLoading ? (
                                                <p>Processing...</p>
                                            ) : (
                                                <>
                                                    <div className="file-info">
                                                        <i className="icon-upload-cloud"></i>
                                                        <span>Click or Drag file here</span>
                                                    </div>
                                                    <p>Supported formats: .xlsx, .xls</p>
                                                </>
                                            )}
                                        </div>
                                        <div style={{textAlign: 'center'}}>
                                            <button type="button" className="btn-secondary" onClick={downloadTemplate}>
                                                <i className="icon-download"></i> Download Template
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <div className="preview-stats">
                                            <span className="stat-badge total">Total Rows: {importSummary.total}</span>
                                            <span className="stat-badge valid">Valid: {importSummary.valid}</span>
                                            {importSummary.invalid > 0 && <span className="stat-badge invalid">Invalid: {importSummary.invalid}</span>}
                                        </div>
                                        
                                        <table className="import-preview-table">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Name (EN)</th>
                                                    <th>Email</th>
                                                    <th>Group</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Show invalid rows first */}
                                                {invalidRows.map((row, i) => (
                                                    <tr key={`inv-${i}`} className="invalid-row">
                                                        <td>{row.customer_code}</td>
                                                        <td>{row.name_en}</td>
                                                        <td>{row.email}</td>
                                                        <td>{row.group_code}</td>
                                                        <td>
                                                            Invalid
                                                            {row._errors.map((e, ei) => <span key={ei} className="row-error">{e}</span>)}
                                                        </td>
                                                        <td>-</td>
                                                    </tr>
                                                ))}
                                                {excelRows.map((row, i) => (
                                                    <tr key={`val-${i}`}>
                                                        <td>{row.customer_code}</td>
                                                        <td>{row.name_en}</td>
                                                        <td>{row.email}</td>
                                                        <td>{row.group_code}</td>
                                                        <td>Valid</td>
                                                        <td>
                                                            <button 
                                                                type="button" 
                                                                className="btn-danger" 
                                                                onClick={() => removeImportRow(i)}
                                                                style={{padding: '0.2rem 0.5rem', fontSize: '0.7rem'}}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="import-modal__footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
                                <button 
                                    type="button" 
                                    className="btn-primary" 
                                    onClick={submitImport}
                                    disabled={excelRows.length === 0 || importLoading}
                                >
                                    Import {excelRows.length} Customers
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
