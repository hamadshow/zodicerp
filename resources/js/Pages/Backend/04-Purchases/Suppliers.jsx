import React, { useState, useRef } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/04-Purchases/Suppliers.scss';

export default function Suppliers({ suppliers, groups, countries, cities, currencies, accounts }) {
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

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        supplier_code: '',
        name_ar: '',
        name_en: '',
        supplier_group_id: '',
        account_id: '',
        currency_id: '',
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

    const handleCreate = () => {
        reset();
        setMode('create');
        setActiveTab('general');
    };

    const handleEdit = (supplier) => {
        // Transform supplier data to match form structure
        // Especially opening balance which might be a collection
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
            ...supplier,
            addresses: supplier.addresses || [],
            contacts: supplier.contacts || [],
            opening_balance: ob,
            // Ensure booleans are correct
            is_vendor: Boolean(supplier.is_vendor),
            is_manufacturer: Boolean(supplier.is_manufacturer),
            is_active: Boolean(supplier.is_active),
        });
        setMode('edit');
        setActiveTab('general');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            destroy(route('admin.purchases.suppliers.destroy', { supplier: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(route('admin.purchases.suppliers.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: () => setActiveTab('general'),
            });
        } else {
            put(route('admin.purchases.suppliers.update', { supplier: data.id }), {
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

    return (
        <AdminLayout>
            <Head title="Suppliers Management" />
            
            <div className="suppliers-module">
                <div className="suppliers-module__header">
                    <h1>Suppliers Management</h1>
                    {mode === 'list' && (
                        <button className="btn-add" onClick={handleCreate}>
                            + Add Supplier
                        </button>
                    )}

                </div>
                {flash.success && (
                    <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#7f1d1d', padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                        {flash.error}
                    </div>
                )}

                {mode === 'list' ? (
                    <div className="suppliers-module__table-container">
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
                                {suppliers.data.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td>{supplier.supplier_code}</td>
                                        <td>{supplier.name_en}</td>
                                        <td>{supplier.group?.name_en || '-'}</td>
                                        <td>{supplier.primary_phone}</td>
                                        <td>{supplier.email}</td>
                                        <td>
                                            <span className={`status-badge ${supplier.is_active ? 'active' : 'inactive'}`}>
                                                {supplier.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(supplier)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(supplier.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {suppliers.data.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}>No suppliers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="suppliers-module__form-container">
                        <div className="suppliers-module__tabs">
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
                        <div className={`suppliers-module__tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                            <div className="suppliers-module__grid">
                                <div className="suppliers-module__group">
                                    <label>Supplier Code <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        value={data.supplier_code} 
                                        onChange={e => setData('supplier_code', e.target.value)}
                                        className={errors.supplier_code ? 'error' : ''}
                                        disabled={mode === 'create'}
                                        placeholder={mode === 'create' ? "Auto-generated (e.g. SUP-10001)" : ""}
                                    />
                                    {errors.supplier_code && <span className="error-msg">{errors.supplier_code}</span>}
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Name (AR)</label>
                                    <input 
                                        type="text" 
                                        value={data.name_ar} 
                                        onChange={e => setData('name_ar', e.target.value)}
                                    />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Name (EN) <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        value={data.name_en} 
                                        onChange={e => setData('name_en', e.target.value)}
                                        className={errors.name_en ? 'error' : ''}
                                    />
                                    {errors.name_en && <span className="error-msg">{errors.name_en}</span>}
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Group</label>
                                    <select value={data.supplier_group_id} onChange={e => setData('supplier_group_id', e.target.value)}>
                                        <option value="">Select Group</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name_en}</option>)}
                                    </select>
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Currency</label>
                                    <select value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                        <option value="">Select Currency</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Account</label>
                                    <select value={data.account_id} onChange={e => setData('account_id', e.target.value)}>
                                        <option value="">Select Account</option>
                                        {accounts.map(a => <option key={a.AccID} value={a.AccID}>{a.Name_en}</option>)}
                                    </select>
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Tax Number</label>
                                    <input type="text" value={data.tax_number} onChange={e => setData('tax_number', e.target.value)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Commercial Register</label>
                                    <input type="text" value={data.commercial_register} onChange={e => setData('commercial_register', e.target.value)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Credit Limit</label>
                                    <input type="number" value={data.credit_limit} onChange={e => setData('credit_limit', e.target.value)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Primary Phone</label>
                                    <input type="text" value={data.primary_phone} onChange={e => setData('primary_phone', e.target.value)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Email</label>
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Website</label>
                                    <input type="text" value={data.website} onChange={e => setData('website', e.target.value)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Is Active</label>
                                    <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Is Vendor</label>
                                    <input type="checkbox" checked={data.is_vendor} onChange={e => setData('is_vendor', e.target.checked)} />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Is Manufacturer</label>
                                    <input type="checkbox" checked={data.is_manufacturer} onChange={e => setData('is_manufacturer', e.target.checked)} />
                                </div>
                            </div>
                        </div>

                        {/* ADDRESSES TAB */}
                        <div className={`suppliers-module__tab-content ${activeTab === 'addresses' ? 'active' : ''}`}>
                            <button type="button" className="add-more-btn" onClick={() => addNested('addresses', { address_type: '', address_name: '', street: '', city_id: '', country_id: '' })}>
                                + Add Address
                            </button>
                            <div className="card-list">
                                {data.addresses.map((address, index) => (
                                    <div key={index} className="card-item">
                                        <div className="card-item__header">
                                            <span>Address #{index + 1}</span>
                                        </div>
                                        <div className="card-item__actions">
                                            <button type="button" onClick={() => removeNested('addresses', index)}>Remove</button>
                                        </div>
                                        <div className="suppliers-module__grid">
                                            <div className="suppliers-module__group">
                                                <label>Type</label>
                                                <select value={address.address_type} onChange={e => updateNested('addresses', index, 'address_type', e.target.value)}>
                                                    <option value="">Select Type</option>
                                                    <option value="billing">Billing</option>
                                                    <option value="shipping">Shipping</option>
                                                </select>
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Name</label>
                                                <input type="text" value={address.address_name} onChange={e => updateNested('addresses', index, 'address_name', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Street</label>
                                                <input type="text" value={address.street} onChange={e => updateNested('addresses', index, 'street', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Country</label>
                                                <select value={address.country_id} onChange={e => updateNested('addresses', index, 'country_id', e.target.value)}>
                                                    <option value="">Select Country</option>
                                                    {countries.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                                                </select>
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>City</label>
                                                <select value={address.city_id} onChange={e => updateNested('addresses', index, 'city_id', e.target.value)}>
                                                    <option value="">Select City</option>
                                                    {cities.filter(c => !address.country_id || c.country_id == address.country_id).map(c => (
                                                        <option key={c.id} value={c.id}>{c.name_en}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CONTACTS TAB */}
                        <div className={`suppliers-module__tab-content ${activeTab === 'contacts' ? 'active' : ''}`}>
                            <button type="button" className="add-more-btn" onClick={() => addNested('contacts', { 
                                name_ar: '', name_en: '', phone: '', mobile: '', whatsapp: '', email: '', 
                                department: '', position_ar: '', position_en: '', 
                                is_primary: false, receive_statements: false, receive_notifications: false, notes: '' 
                            })}>
                                + Add Contact
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
                                        <div className="suppliers-module__grid">
                                            <div className="suppliers-module__group">
                                                <label>Name (AR) <span className="required">*</span></label>
                                                <input type="text" value={contact.name_ar || ''} onChange={e => updateNested('contacts', index, 'name_ar', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Name (EN)</label>
                                                <input type="text" value={contact.name_en || ''} onChange={e => updateNested('contacts', index, 'name_en', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Department</label>
                                                <input type="text" value={contact.department || ''} onChange={e => updateNested('contacts', index, 'department', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Position (AR)</label>
                                                <input type="text" value={contact.position_ar || ''} onChange={e => updateNested('contacts', index, 'position_ar', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Position (EN)</label>
                                                <input type="text" value={contact.position_en || ''} onChange={e => updateNested('contacts', index, 'position_en', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Phone</label>
                                                <input type="text" value={contact.phone || ''} onChange={e => updateNested('contacts', index, 'phone', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Mobile</label>
                                                <input type="text" value={contact.mobile || ''} onChange={e => updateNested('contacts', index, 'mobile', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>WhatsApp</label>
                                                <input type="text" value={contact.whatsapp || ''} onChange={e => updateNested('contacts', index, 'whatsapp', e.target.value)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Email</label>
                                                <input type="email" value={contact.email || ''} onChange={e => updateNested('contacts', index, 'email', e.target.value)} />
                                            </div>
                                            
                                            {/* Booleans */}
                                            <div className="suppliers-module__group">
                                                <label>Is Primary</label>
                                                <input type="checkbox" checked={Boolean(contact.is_primary)} onChange={e => updateNested('contacts', index, 'is_primary', e.target.checked)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Receive Statements</label>
                                                <input type="checkbox" checked={Boolean(contact.receive_statements)} onChange={e => updateNested('contacts', index, 'receive_statements', e.target.checked)} />
                                            </div>
                                            <div className="suppliers-module__group">
                                                <label>Receive Notifications</label>
                                                <input type="checkbox" checked={Boolean(contact.receive_notifications)} onChange={e => updateNested('contacts', index, 'receive_notifications', e.target.checked)} />
                                            </div>

                                            <div className="suppliers-module__group--full">
                                                <label>Notes</label>
                                                <textarea value={contact.notes || ''} onChange={e => updateNested('contacts', index, 'notes', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OPENING BALANCE TAB */}
                        <div className={`suppliers-module__tab-content ${activeTab === 'opening_balance' ? 'active' : ''}`}>
                             <div className="suppliers-module__grid">
                                <div className="suppliers-module__group">
                                    <label>Financial Year</label>
                                    <input 
                                        type="number" 
                                        value={data.opening_balance.financial_year} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, financial_year: e.target.value })} 
                                    />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Opening Date</label>
                                    <input 
                                        type="date" 
                                        value={data.opening_balance.opening_date} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, opening_date: e.target.value })} 
                                    />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Currency</label>
                                    <select 
                                        value={data.opening_balance.currency_id} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, currency_id: e.target.value })}
                                    >
                                        <option value="">Select Currency</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                                    </select>
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Exchange Rate</label>
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        value={data.opening_balance.exchange_rate} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, exchange_rate: e.target.value })} 
                                    />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Debit Amount</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.opening_balance.debit_amount} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, debit_amount: e.target.value })} 
                                    />
                                </div>
                                <div className="suppliers-module__group">
                                    <label>Credit Amount</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.opening_balance.credit_amount} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, credit_amount: e.target.value })} 
                                    />
                                </div>
                                <div className="suppliers-module__group--full">
                                    <label>Notes</label>
                                    <textarea 
                                        value={data.opening_balance.notes} 
                                        onChange={e => setData('opening_balance', { ...data.opening_balance, notes: e.target.value })} 
                                    />
                                </div>
                             </div>
                        </div>

                        <div className="suppliers-module__actions">
                            <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>Cancel</button>
                            <button type="submit" className="btn btn-save" disabled={processing}>
                                {mode === 'create' ? 'Create Supplier' : 'Update Supplier'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            {/* IMPORT MODAL */}
            {showImport && (
                <div className="import-modal-overlay">
                    <div className="import-modal">
                        <div className="import-modal__header">
                            <h2>Import Suppliers from Excel</h2>
                            <button className="close-btn" onClick={() => setShowImport(false)}>&times;</button>
                        </div>
                        <div className="import-modal__content">
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
                                    <div style={{ textAlign: 'center' }}>
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
                                            <div className="progress-bar__fill" style={{ width: '100%' }}></div>
                                        </div>
                                    )}

                                    <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="import-preview-table">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Name (EN)</th>
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
                                                        <td>{row.name_en}</td>
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
                                                        <td>{row.name_en}</td>
                                                        <td>{row.email}</td>
                                                        <td>{row.is_active ? 'Active' : 'Inactive'}</td>
                                                        <td>-</td>
                                                        <td>
                                                            <button className="btn-danger" onClick={() => removeImportRow(i)}>
                                                                &times;
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
                        <div className="import-modal__footer">
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
