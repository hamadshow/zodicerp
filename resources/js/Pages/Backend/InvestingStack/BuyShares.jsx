import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import { debounce } from 'lodash';

export default function BuyShares({ buyShares, currencies, companies = [], brokers = [], filters = {} }) {
    const { localization } = usePage().props;
    const currentLocale = localization?.current_locale || 'ar';
    const [mode, setMode] = useState('list'); // list, create, edit
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    // Form logic using useForm from Inertia
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        currency_id: '',
        broker_id: '',
        notes: '',
        commission: 0,
        tax_total: 0,
        grand_total: 0,
        items: [
            { stock_symbol: '', company_name: '', quantity: 1, price_per_share: 0, total_amount: 0 }
        ]
    });

    const companyOptions = useMemo(() => {
        return companies.map(c => ({
            value: c.ticker_symbol,
            label: `${c.ticker_symbol} - ${currentLocale === 'en' ? (c.legal_name_en || c.legal_name_ar) : (c.legal_name_ar || c.legal_name_en)}`,
            code: c.company_code,
            ticker_symbol: c.ticker_symbol,
            company_name: currentLocale === 'en' ? (c.legal_name_en || c.legal_name_ar) : (c.legal_name_ar || c.legal_name_en)
        }));
    }, [companies, currentLocale]);

    const brokerOptions = useMemo(() => {
        return brokers.map(b => ({
            value: b.id,
            label: currentLocale === 'ar' 
                ? (b.broker_name_ar || b.broker_name_en) 
                : (b.broker_name_en || b.broker_name_ar),
            broker_name_ar: b.broker_name_ar,
            broker_name_en: b.broker_name_en
        }));
    }, [brokers, currentLocale]);

    const handleSearch = useMemo(
        () => debounce((value) => {
            router.get(
                route('admin.investing.buy-shares.index'),
                { search: value },
                { preserveState: true, replace: true }
            );
        }, 300),
        []
    );

    useEffect(() => {
        if (searchTerm !== (filters.search || '')) {
            handleSearch(searchTerm);
        }
    }, [searchTerm]);

    const handleCreate = () => {
        reset();
        setData(prev => ({
            ...prev,
            purchase_date: new Date().toISOString().split('T')[0],
            items: [{ stock_symbol: '', company_name: '', quantity: 1, price_per_share: 0, total_amount: 0 }]
        }));
        setMode('create');
    };

    const handleEdit = (record) => {
        setData({
            id: record.id,
            purchase_date: record.purchase_date ? new Date(record.purchase_date).toISOString().split('T')[0] : '',
            currency_id: record.currency_id || '',
            broker_id: record.broker_id || '',
            notes: record.notes || '',
            commission: record.commission || 0,
            tax_total: record.tax_total || 0,
            grand_total: record.grand_total || 0,
            items: record.items && record.items.length > 0 
                ? record.items.map(item => ({
                    stock_symbol: item.stock_symbol,
                    company_name: item.company_name,
                    quantity: item.quantity,
                    price_per_share: item.price_per_share,
                    total_amount: item.total_amount
                }))
                : [{ stock_symbol: record.stock_symbol, company_name: record.company_name, quantity: record.quantity, price_per_share: record.price_per_share, total_amount: record.total_amount }]
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this record?')) {
            destroy(route('admin.investing.buy-shares.destroy', id), {
                preserveScroll: true,
                onSuccess: () => router.visit(route('admin.investing.portfolio.index')),
            });
        }
    };

    // Calculate subtotal from items
    const subtotal = useMemo(() => {
        return data.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
    }, [data.items]);

    // Update grand total whenever subtotal, commission or tax changes
    useEffect(() => {
        const grand = subtotal + (parseFloat(data.commission) || 0) + (parseFloat(data.tax_total) || 0);
        setData('grand_total', grand.toFixed(2));
    }, [subtotal, data.commission, data.tax_total]);

    const addItem = () => {
        setData('items', [
            ...data.items,
            { stock_symbol: '', company_name: '', quantity: 1, price_per_share: 0, total_amount: 0 }
        ]);
    };

    const removeItem = (index) => {
        if (data.items.length > 1) {
            const newItems = [...data.items];
            newItems.splice(index, 1);
            setData('items', newItems);
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'price_per_share') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const price = parseFloat(newItems[index].price_per_share) || 0;
            newItems[index].total_amount = (qty * price).toFixed(2);
        }

        if (field === 'stock_symbol') {
            const selected = companyOptions.find(opt => opt.value === value);
            if (selected) {
                newItems[index].company_name = selected.company_name;
            }
        }

        setData('items', newItems);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(route('admin.investing.buy-shares.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        } else {
            put(route('admin.investing.buy-shares.update', data.id), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Buy Shares" />
            
            <div className="buy-shares-module">
                {mode === 'list' ? (
                    <>
                        <div className="buy-shares-module__top-header">
                            <h1>Share Purchases</h1>
                            <div className="export-actions">
                                <button className="btn-export"><span className="material-icons-outlined">print</span> Print</button>
                                <button className="btn-export"><span className="material-icons-outlined">picture_as_pdf</span> PDF</button>
                                <button className="btn-export"><span className="material-icons-outlined">table_view</span> Excel</button>
                                <button className="btn-add" onClick={handleCreate} style={{marginLeft: '1rem', background: '#3182ce', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    <span className="material-icons-outlined">add</span>
                                    Add Record
                                </button>
                            </div>
                        </div>

                        <div className="buy-shares-module__stats" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
                            <div className="stat-card" style={{background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                <div className="stat-icon blue" style={{background: '#ebf8ff', color: '#3182ce', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <span className="material-icons-outlined" style={{fontSize: '24px'}}>shopping_cart</span>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value" style={{display: 'block', fontSize: '1.25rem', fontWeight: '700'}}>{buyShares.total}</span>
                                    <span className="stat-label" style={{fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase'}}>Total Records</span>
                                </div>
                            </div>
                        </div>

                        <div className="buy-shares-module__filters" style={{background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem'}}>
                            <div className="search-box" style={{position: 'relative', width: '300px'}}>
                                <span className="material-icons-outlined search-icon" style={{position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#718096'}}>search</span>
                                <input
                                    type="text"
                                    placeholder="Search by symbol or company..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '6px'}}
                                />
                            </div>
                        </div>

                        <div className="buy-shares-module__table-container" style={{background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden'}}>
                            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                                    <tr>
                                        <th style={{padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase'}}>Date</th>
                                        <th style={{padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase'}}>Summary</th>
                                        <th style={{padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase'}}>Items</th>
                                        <th style={{padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase'}}>Total Amount</th>
                                        <th style={{padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {buyShares.data && buyShares.data.length > 0 ? (
                                        buyShares.data.map(record => (
                                            <tr key={record.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                                                <td style={{padding: '1rem', fontSize: '0.875rem'}}>{new Date(record.purchase_date).toLocaleDateString()}</td>
                                                <td style={{padding: '1rem', fontSize: '0.875rem'}}>
                                                    <span style={{background: '#ebf8ff', color: '#3182ce', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600'}}>{record.stock_symbol}</span>
                                                    <div style={{fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem'}}>{record.company_name}</div>
                                                </td>
                                                <td style={{padding: '1rem', fontSize: '0.875rem'}}>
                                                    {record.items?.length || 1} Item(s)
                                                </td>
                                                <td style={{padding: '1rem', fontSize: '0.875rem', fontWeight: '700', color: '#38a169'}}>{record.grand_total || record.total_amount}</td>
                                                <td style={{padding: '1rem', fontSize: '0.875rem'}}>
                                                    <div style={{display: 'flex', gap: '0.5rem'}}>
                                                        <button onClick={() => handleEdit(record)} style={{border: '1px solid #e2e8f0', background: 'white', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer'}}><span className="material-icons-outlined" style={{fontSize: '18px', color: '#718096'}}>edit</span></button>
                                                        <button onClick={() => handleDelete(record.id)} style={{border: '1px solid #e2e8f0', background: 'white', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer'}}><span className="material-icons-outlined" style={{fontSize: '18px', color: '#e53e3e'}}>delete</span></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" style={{padding: '2rem', textAlign: 'center', color: '#718096'}}>No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="buy-shares-module__top-header">
                            <h1>Share Purchase</h1>
                            <div className="export-actions">
                                <button className="btn-export"><span className="material-icons-outlined">print</span> Print</button>
                                <button className="btn-export"><span className="material-icons-outlined">picture_as_pdf</span> PDF</button>
                                <button className="btn-export"><span className="material-icons-outlined">table_view</span> Excel</button>
                            </div>
                        </div>

                        <div className="invoice-card">
                            <div className="invoice-header-row">
                                <div className="company-info">
                                    <h2>SHARE PURCHASE</h2>
                                    <p>Zodic ERP System</p>
                                </div>
                                <div className="invoice-meta">
                                    <div className="meta-field">
                                        <label>Purchase #</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={mode === 'edit' ? `PR-${data.id.toString().padStart(4, '0')}` : 'Auto-generated'} disabled />
                                        </div>
                                    </div>
                                    <div className="meta-field">
                                        <label>Date <span style={{color: '#f56565'}}>*</span></label>
                                        <div className="input-wrapper">
                                            <input type="date" value={data.purchase_date} onChange={e => setData('purchase_date', e.target.value)} className="required" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="grid-column">
                                    <div className="section-title">PURCHASE SETTINGS</div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Currency</label>
                                            <select value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                                <option value="">Select Currency</option>
                                                {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Broker</label>
                                            <SearchableComboBox
                                                options={brokerOptions}
                                                value={data.broker_id}
                                                onChange={(val) => setData('broker_id', val)}
                                                placeholder="Select Broker..."
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Exchange Rate</label>
                                            <input type="number" defaultValue="1" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-column">
                                    <div className="section-title">STATUS</div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Payment Status</label>
                                            <select defaultValue="completed">
                                                <option value="completed">Completed</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th style={{width: '50px'}}>#</th>
                                        <th>STOCK</th>
                                        <th style={{width: '120px'}}>QTY</th>
                                        <th style={{width: '150px'}}>PRICE</th>
                                        <th style={{width: '150px'}}>TOTAL</th>
                                        <th style={{width: '50px'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td style={{minWidth: '250px'}}>
                                                <SearchableComboBox
                                                    options={companyOptions}
                                                    value={item.stock_symbol}
                                                    onChange={(val) => updateItem(index, 'stock_symbol', val)}
                                                    placeholder="Search Stock..."
                                                />
                                                <div style={{fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem'}}>
                                                    {item.company_name || 'Arabic Name'}
                                                </div>
                                            </td>
                                            <td>
                                                <input type="number" className="item-input" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} placeholder="0" />
                                            </td>
                                            <td>
                                                <input type="number" step="0.01" className="item-input" value={item.price_per_share} onChange={e => updateItem(index, 'price_per_share', e.target.value)} placeholder="0.00" />
                                            </td>
                                            <td style={{fontWeight: '700'}}>{item.total_amount}</td>
                                            <td>
                                                {data.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(index)} style={{border: 'none', background: 'transparent', color: '#e53e3e', cursor: 'pointer'}}>
                                                        <span className="material-icons-outlined">close</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <button type="button" className="btn-add-item" onClick={addItem}>
                                + Add Line Item
                            </button>

                            <div className="summary-section" style={{marginTop: '2rem'}}>
                                <div className="notes-column">
                                    <div className="form-group">
                                        <label>Purchase Notes</label>
                                        <textarea rows="4" value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Internal notes visible to administrators..."></textarea>
                                    </div>
                                </div>
                                <div className="totals-card">
                                    <div className="total-row">
                                        <span>Subtotal</span>
                                        <span className="value">{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="total-row">
                                        <span>Commission</span>
                                        <input type="number" step="0.01" value={data.commission} onChange={e => setData('commission', e.target.value)} />
                                    </div>
                                    <div className="total-row">
                                        <span>Tax Total</span>
                                        <input type="number" step="0.01" value={data.tax_total} onChange={e => setData('tax_total', e.target.value)} />
                                    </div>
                                    <div className="total-row grand-total">
                                        <span>Total Amount</span>
                                        <span className="value">{data.grand_total}</span>
                                    </div>
                                    <div className="total-row">
                                        <span>Paid Amount</span>
                                        <input type="number" defaultValue={data.grand_total} />
                                    </div>
                                    <div className="total-row balance" style={{color: '#e53e3e'}}>
                                        <span>Balance Due</span>
                                        <span className="value">0.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-footer">
                            <button className="btn btn-cancel" onClick={() => setMode('list')}>Cancel</button>
                            <button className="btn btn-save" onClick={handleSubmit} disabled={processing}>
                                {mode === 'edit' ? 'Update Purchase' : 'Save Purchase'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
