import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import '../../../../css/backend/05-Client_Sales/Sales_Quotations.scss';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function SalesQuotations({ 
    quotations, 
    customers, 
    currencies, 
    products, 
    units, 
    priceLists = [], 
    warehouses = [], 
    salesAgents = []
}) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};
    const { errors } = props;

    const productOptions = useMemo(() => {
        return (products || []).map(p => ({
            value: String(p.id),
            label: p.name_en || p.name_ar || ''
        }));
    }, [products]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            value: String(u.id),
            label: u.name_en || ''
        }));
    }, [units]);

    const customerOptions = useMemo(() => 
        customers?.map(c => ({
            value: String(c.id),
            label: `${c.name_en} - ${c.name_ar}`
        })) || [], 
    [customers]);

    const salesAgentOptions = useMemo(() => 
        salesAgents?.map(a => ({
            value: String(a.id),
            label: a.name_en || a.name || ''
        })) || [], 
    [salesAgents]);

    const priceListOptions = useMemo(() => 
        priceLists?.map(pl => ({
            value: String(pl.id),
            label: pl.name || ''
        })) || [], 
    [priceLists]);

    const warehouseOptions = useMemo(() => 
        warehouses?.map(w => ({
            value: String(w.id),
            label: w.name || ''
        })) || [], 
    [warehouses]);

    const currencyOptions = useMemo(() => 
        currencies?.map(c => ({
            value: String(c.id),
            label: `${c.code} - ${c.name}`
        })) || [], 
    [currencies]);

    // Initial Form State
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        quotation_number: '',
        quotation_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        valid_days: 30,
        customer_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        status: 'draft',
        
        // Sales Specific
        price_list_id: '',
        warehouse_id: '',
        sales_agent_id: '',
        probability_percentage: 0,
        followup_date: '',
        sent_date: '',
        sent_method: '',
        
        customer_notes: '',
        internal_notes: '',
        
        // Financials
        subtotal: 0,
        discount_percentage: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_cost: 0,
        total_amount: 0,
        base_total: 0,

        // Items
        items: [],
    });

    // Helper to calculate totals
    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.discount_amount, data.discount_percentage, data.shipping_cost, data.tax_amount]);

    const handleCreate = () => {
        reset();
        const today = new Date();
        const expiry = new Date(new Date().setDate(today.getDate() + 30));
        setData(prev => ({
            ...prev,
            quotation_date: today.toISOString().split('T')[0],
            expiry_date: expiry.toISOString().split('T')[0],
            valid_days: 30,
            items: [{
                id: null,
                line_number: 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                unit_price: 0,
                discount_percentage: 0,
                discount_amount: 0,
                tax_id: '',
                tax_amount: 0,
                line_total: 0,
                delivery_date: '',
                notes: ''
            }]
        }));
        setMode('create');
    };

    const handleEdit = (quotation) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...quotation,
            items: (quotation.items || []).map(it => {
                const qty = toNum(it.quantity);
                const unitPrice = toNum(it.unit_price);
                const discountAmount = toNum(it.discount_amount);
                const taxAmount = toNum(it.tax_amount);
                
                return {
                    ...it,
                    quantity: qty,
                    unit_price: unitPrice,
                    discount_percentage: toNum(it.discount_percentage),
                    discount_amount: discountAmount,
                    tax_id: it.tax_id,
                    tax_amount: taxAmount,
                    line_total: toNum(it.line_total),
                    unit_id: it.unit_id,
                    delivery_date: it.delivery_date ? it.delivery_date.split('T')[0] : '',
                    notes: it.notes || ''
                };
            }),
            quotation_date: quotation.quotation_date ? quotation.quotation_date.split('T')[0] : '',
            expiry_date: quotation.expiry_date ? quotation.expiry_date.split('T')[0] : '',
            followup_date: quotation.followup_date ? quotation.followup_date.split('T')[0] : '',
            sent_date: quotation.sent_date ? quotation.sent_date.split('T')[0] : '',
            subtotal: toNum(quotation.subtotal),
            discount_percentage: toNum(quotation.discount_percentage),
            discount_amount: toNum(quotation.discount_amount),
            tax_amount: toNum(quotation.tax_amount),
            shipping_cost: toNum(quotation.shipping_cost),
            total_amount: toNum(quotation.total_amount),
            base_total: toNum(quotation.base_total),
            exchange_rate: toNum(quotation.exchange_rate),
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this quotation?')) {
            destroy(route('admin.client_sales.quotations.destroy', { quotation: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(route('admin.client_sales.quotations.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        } else {
            put(route('admin.client_sales.quotations.update', { quotation: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        }
    };

    const handleDiscountPercentChange = (value) => {
        const percent = parseFloat(value) || 0;
        const subtotal = parseFloat(data.subtotal) || 0;
        const amount = (subtotal * percent) / 100;
        setData(prev => ({
            ...prev,
            discount_percentage: value,
            discount_amount: amount.toFixed(2)
        }));
    };

    // Item Management
    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                id: null,
                line_number: data.items.length + 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                unit_price: 0,
                discount_percentage: 0,
                discount_amount: 0,
                tax_id: '',
                tax_amount: 0,
                line_total: 0,
                delivery_date: '',
                notes: ''
            }
        ]);
    };

    const removeItem = (index) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
        calculateTotals(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        // Auto-fill product details
        if (field === 'product_id') {
            const product = products.find(p => p.id == value);
            if (product) {
                newItems[index].item_name_ar = product.name_ar;
                newItems[index].item_name_en = product.name_en;
                newItems[index].unit_price = product.sale_price || product.price || 0;
                newItems[index].unit_id = product.unit_id || '';
            }
        }

        // Calculate Line Totals
        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].unit_price) || 0;
        
        // Handle discount
        let discAmount = 0;
        if (field === 'discount_percentage') {
            const discPercent = parseFloat(value) || 0;
            discAmount = (qty * price) * (discPercent / 100);
            newItems[index].discount_amount = discAmount.toFixed(2);
        } else if (field === 'discount_amount') {
             discAmount = parseFloat(value) || 0;
             if (qty * price > 0) {
                 newItems[index].discount_percentage = ((discAmount / (qty * price)) * 100).toFixed(2);
             }
        } else {
            discAmount = parseFloat(newItems[index].discount_amount) || 0;
            const discPercent = parseFloat(newItems[index].discount_percentage) || 0;
            if (discPercent > 0) {
                 discAmount = (qty * price) * (discPercent / 100);
                 newItems[index].discount_amount = discAmount.toFixed(2);
            }
        }

        const netPrice = (qty * price) - discAmount;
        
        // Handle Tax
        let taxValue = 0;
        // Simple manual tax for now, unless tax_id logic is added
        taxValue = parseFloat(newItems[index].tax_amount) || 0;

        newItems[index].line_total = (netPrice + taxValue).toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);
        
        const itemDiscounts = items.reduce((sum, item) => sum + (parseFloat(item.discount_amount) || 0), 0);
        const itemTaxes = items.reduce((sum, item) => sum + (parseFloat(item.tax_amount) || 0), 0);
        
        // Global Discount
        let globalDiscount = parseFloat(data.discount_amount) || 0;
        const shipping = parseFloat(data.shipping_cost) || 0;
        
        // Logic: Subtotal - ItemDiscounts + ItemTaxes - GlobalDiscount + Shipping
        const totalAfterItemDisc = subtotal - itemDiscounts;
        const totalWithTax = totalAfterItemDisc + itemTaxes;
        
        const grandTotal = totalWithTax - globalDiscount + shipping;

        if (
            Math.abs(data.subtotal - subtotal) > 0.01 ||
            Math.abs(data.total_amount - grandTotal) > 0.01
        ) {
             setData(prev => ({
                ...prev,
                subtotal: subtotal,
                total_amount: grandTotal,
                base_total: grandTotal * prev.exchange_rate
            }));
        }
    };

    // Export Features
    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const element = printRef.current;
        if (!element) return;
        
        const module = element.closest('.sales-quotations-module');
        if (module) module.classList.add('generating-pdf');
        
        const opt = {
            margin: [5, 5],
            filename: `SalesQuotation_${data.quotation_number || 'New'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            if (module) module.classList.remove('generating-pdf');
        });
    };

    const handleExportExcel = () => {
        const itemsData = data.items.map((item, index) => ({
            '#': index + 1,
            'Product': products.find(p => p.id == item.product_id)?.name_en || '',
            'Description': item.item_name_ar || '',
            'Quantity': Number(item.quantity),
            'Unit': units.find(u => u.id == item.unit_id)?.name_en || '',
            'Price': Number(item.unit_price),
            'Discount': Number(item.discount_amount),
            'Tax Amount': Number(item.tax_amount),
            'Total': Number(item.line_total)
        }));

        itemsData.push({});
        itemsData.push({ 'Product': 'Subtotal', 'Total': Number(data.subtotal) });
        itemsData.push({ 'Product': 'Tax', 'Total': Number(data.tax_amount) });
        itemsData.push({ 'Product': 'Discount', 'Total': Number(data.discount_amount) });
        itemsData.push({ 'Product': 'Shipping', 'Total': Number(data.shipping_cost) });
        itemsData.push({ 'Product': 'Grand Total', 'Total': Number(data.total_amount) });

        const worksheet = XLSX.utils.json_to_sheet(itemsData);
        
        const wscols = [
            {wch: 5}, {wch: 20}, {wch: 30}, {wch: 10}, 
            {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 15}
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quotation");
        XLSX.writeFile(workbook, `SalesQuotation_${data.quotation_number || 'New'}.xlsx`);
    };

    return (
        <AdminLayout>
            <Head title="Sales Quotations" />
            
            <div className="sales-quotations-module">
                <div className="sales-quotations-module__header">
                    <h1>Sales Quotations</h1>
                    {mode === 'list' && (
                    <button className="btn-add" onClick={handleCreate}>
                        + Create Quotation
                    </button>
                )}
                {mode !== 'list' && (
                    <div className="header-actions" style={{display: 'flex', gap: '10px'}}>
                        <button type="button" className="btn-action btn-print" onClick={handlePrint} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span>🖨</span> Print
                        </button>
                        <button type="button" className="btn-action btn-pdf" onClick={handleExportPDF} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span>📄</span> PDF
                        </button>
                        <button type="button" className="btn-action btn-excel" onClick={handleExportExcel} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span>📊</span> Excel
                        </button>
                    </div>
                )}
            </div>

                {flash.success && (
                    <div className="alert alert-success">{flash.success}</div>
                )}
                {flash.error && (
                    <div className="alert alert-error">{flash.error}</div>
                )}

                {mode === 'list' ? (
                    <div className="sales-quotations-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotations.data.map((q) => (
                                    <tr key={q.id}>
                                        <td>{q.quotation_number}</td>
                                        <td>{q.quotation_date}</td>
                                        <td>{q.customer?.name_en || q.customer?.name_ar}</td>
                                        <td>
                                            <span className={`status-badge status-${q.status}`}>
                                                {q.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{Number(q.total_amount).toFixed(2)} {q.currency?.code}</td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(q)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(q.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {quotations.data.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center' }}>No quotations found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                    <form ref={invoiceRef} onSubmit={handleSubmit} className="invoice-container">
                        
                        {/* 1. Invoice Header */}
                        <div className="invoice-header">
                            <div className="company-info">
                                <h2>SALES QUOTATION</h2>
                                <p>Zodic ERP System</p>
                            </div>
                            <div className="invoice-meta">
                                <label>Quotation #</label>
                                <input type="text" value={data.quotation_number} disabled placeholder="Auto-generated" />
                                
                                <label>Date <span className="required">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.quotation_date} 
                                    onChange={e => setData('quotation_date', e.target.value)}
                                    className={errors.quotation_date ? 'error' : ''}
                                />
                                
                                <label>Expiry Date</label>
                                <input 
                                    type="date" 
                                    value={data.expiry_date} 
                                    onChange={e => setData('expiry_date', e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* 2. Info Grid */}
                        <div className="invoice-info-grid">
                            <div className="info-section">
                                <h3>Customer Details</h3>
                                <div className="form-group">
                                    <label>Customer Name <span className="required">*</span></label>
                                    <SearchableComboBox
                                        options={customerOptions}
                                        value={data.customer_id ? String(data.customer_id) : ''}
                                        onChange={(val) => setData('customer_id', val)}
                                        placeholder="Select Customer"
                                        error={errors.customer_id}
                                    />
                                    {errors.customer_id && <span className="error-msg">{errors.customer_id}</span>}
                                </div>
                                
                                <div className="form-grid" style={{marginTop: '1rem'}}>
                                    <div className="form-group">
                                        <label>Sales Agent</label>
                                        <SearchableComboBox
                                            options={salesAgentOptions}
                                            value={data.sales_agent_id ? String(data.sales_agent_id) : ''}
                                            onChange={(val) => setData('sales_agent_id', val)}
                                            placeholder="Select Agent"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Price List</label>
                                        <SearchableComboBox
                                            options={priceListOptions}
                                            value={data.price_list_id ? String(data.price_list_id) : ''}
                                            onChange={(val) => setData('price_list_id', val)}
                                            placeholder="Select Price List"
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{marginTop: '1rem'}}>
                                    <label>Customer Notes</label>
                                    <textarea 
                                        value={data.customer_notes} 
                                        onChange={e => setData('customer_notes', e.target.value)} 
                                        rows="2"
                                        placeholder="Notes for customer..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Settings & Status</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Currency</label>
                                        <SearchableComboBox
                                            options={currencyOptions}
                                            value={data.currency_id ? String(data.currency_id) : ''}
                                            onChange={(val) => setData('currency_id', val)}
                                            placeholder="Select Currency"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Exchange Rate</label>
                                        <input type="number" step="0.000001" value={data.exchange_rate} onChange={e => setData('exchange_rate', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)}>
                                            <option value="draft">Draft</option>
                                            <option value="sent">Sent</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="accepted">Accepted</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="expired">Expired</option>
                                            <option value="converted">Converted</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Warehouse</label>
                                        <SearchableComboBox
                                            options={warehouseOptions}
                                            value={data.warehouse_id ? String(data.warehouse_id) : ''}
                                            onChange={(val) => setData('warehouse_id', val)}
                                            placeholder="Select Warehouse"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Valid Days</label>
                                        <input type="number" value={data.valid_days} onChange={e => setData('valid_days', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-grid" style={{marginTop: '1rem'}}>
                                     <div className="form-group">
                                        <label>Probability %</label>
                                        <input type="number" value={data.probability_percentage} onChange={e => setData('probability_percentage', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Follow-up Date</label>
                                        <input type="date" value={data.followup_date} onChange={e => setData('followup_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Sent Date</label>
                                        <input type="date" value={data.sent_date} onChange={e => setData('sent_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Sent Method</label>
                                        <select value={data.sent_method} onChange={e => setData('sent_method', e.target.value)}>
                                            <option value="">Select Method</option>
                                            <option value="email">Email</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="hand">Hand</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="invoice-items-section">
                            <div className="items-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{width: '30px'}}>#</th>
                                            <th style={{width: '200px'}}>Product</th>
                                            <th>Description</th>
                                            <th style={{width: '80px'}}>Qty</th>
                                            <th style={{width: '100px'}}>Unit</th>
                                            <th style={{width: '100px'}}>Price</th>
                                            <th style={{width: '80px'}}>Disc %</th>
                                            <th style={{width: '100px'}}>Disc Amt</th>
                                            <th style={{width: '100px'}}>Tax Amt</th>
                                            <th style={{width: '120px'}} className="text-right">Total</th>
                                            <th style={{width: '50px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <SearchableComboBox
                                                        options={productOptions}
                                                        value={item.product_id ? String(item.product_id) : ''}
                                                        onChange={(val) => handleItemChange(index, 'product_id', val)}
                                                        placeholder="Select Product"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="text" 
                                                        value={item.item_name_ar} 
                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                        placeholder="Description"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        min="0.01"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td>
                                                    <SearchableComboBox
                                                        options={unitOptions}
                                                        value={item.unit_id ? String(item.unit_id) : ''}
                                                        onChange={(val) => handleItemChange(index, 'unit_id', val)}
                                                        placeholder="Unit"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.unit_price} 
                                                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.discount_percentage} 
                                                        onChange={e => handleItemChange(index, 'discount_percentage', e.target.value)}
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.discount_amount} 
                                                        onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.tax_amount} 
                                                        onChange={e => handleItemChange(index, 'tax_amount', e.target.value)}
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="text-right">
                                                    {Number(item.line_total).toFixed(2)}
                                                </td>
                                                <td>
                                                    <button type="button" onClick={() => removeItem(index)} style={{color: 'red'}}>
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="add-item-row">
                                <button type="button" className="btn-add-item" onClick={addItem}>
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* 4. Footer Section */}
                        <div className="invoice-footer-section">
                            <div className="invoice-terms">
                                <h4>Internal Notes</h4>
                                <textarea 
                                    value={data.internal_notes}
                                    onChange={e => setData('internal_notes', e.target.value)}
                                    placeholder="Internal notes only..."
                                ></textarea>
                            </div>

                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="label">Subtotal</span>
                                    <span>{Number(data.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Discount %</span>
                                    <input 
                                        type="number" 
                                        value={data.discount_percentage} 
                                        onChange={e => handleDiscountPercentChange(e.target.value)}
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Discount Amount</span>
                                    <input 
                                        type="number" 
                                        value={data.discount_amount} 
                                        onChange={e => setData('discount_amount', e.target.value)}
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Tax</span>
                                    <span>{Number(data.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Shipping</span>
                                    <input 
                                        type="number" 
                                        value={data.shipping_cost} 
                                        onChange={e => setData('shipping_cost', e.target.value)}
                                    />
                                </div>
                                <div className="total-row grand-total">
                                    <span className="label">Total</span>
                                    <input 
                                        type="number" 
                                        value={data.total_amount} 
                                        readOnly 
                                    />
                                </div>
                            </div>
                        </div>
                        
                    </form>
                    
                    <div className="sticky-actions-footer">
                        <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-save" 
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            {processing ? 'Saving...' : 'Save Quotation'}
                        </button>
                    </div>

                    <div className="printable-invoice" ref={printRef}>
                        <div className="print-header">
                            <div className="company-branding">
                                <h1>Zodic ERP System</h1>
                                <p>Sales Quotation</p>
                            </div>
                            <div className="doc-info">
                                <h2>SALES QUOTATION</h2>
                                <div className="meta-row"><span className="label">Quotation #:</span> {data.quotation_number || 'DRAFT'}</div>
                                <div className="meta-row"><span className="label">Date:</span> {data.quotation_date}</div>
                                <div className="meta-row"><span className="label">Expiry:</span> {data.expiry_date}</div>
                            </div>
                        </div>

                        <div className="print-meta-grid">
                            <div className="meta-box">
                                <h3>Customer Details</h3>
                                <p><strong>Name:</strong> {customers.find(c => c.id == data.customer_id)?.name_en || 'N/A'}</p>
                                <p><strong>Phone:</strong> {customers.find(c => c.id == data.customer_id)?.phone || 'N/A'}</p>
                                <p><strong>Currency:</strong> {currencies.find(c => c.id == data.currency_id)?.code || 'N/A'}</p>
                            </div>
                            <div className="meta-box" style={{textAlign: 'right'}}>
                                <h3>Quotation Details</h3>
                                <p><strong>Status:</strong> <span style={{textTransform: 'uppercase'}}>{data.status}</span></p>
                                <p><strong>Exchange Rate:</strong> {data.exchange_rate}</p>
                                <p><strong>Sales Agent:</strong> {salesAgents.find(a => a.id == data.sales_agent_id)?.name_en || 'N/A'}</p>
                            </div>
                        </div>

                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Product / Description</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-center">Unit</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Disc.</th>
                                    <th className="text-right">Tax</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <div className="font-bold">{products.find(p => p.id == item.product_id)?.name_en || ''}</div>
                                            <div style={{fontSize: '9pt', color: '#666'}}>{item.item_name_ar}</div>
                                        </td>
                                        <td className="text-center">{Number(item.quantity)}</td>
                                        <td className="text-center">{units.find(u => u.id == item.unit_id)?.name_en || ''}</td>
                                        <td className="text-right">{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="text-right">{Number(item.discount_amount).toFixed(2)}</td>
                                        <td className="text-right">{Number(item.tax_amount).toFixed(2)}</td>
                                        <td className="text-right font-bold">{Number(item.line_total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="print-totals">
                            <div className="totals-box">
                                <div className="row">
                                    <span>Subtotal:</span>
                                    <span>{Number(data.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="row">
                                    <span>Tax:</span>
                                    <span>{Number(data.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="row">
                                    <span>Discount:</span>
                                    <span>{Number(data.discount_amount).toFixed(2)}</span>
                                </div>
                                <div className="row">
                                    <span>Shipping:</span>
                                    <span>{Number(data.shipping_cost).toFixed(2)}</span>
                                </div>
                                <div className="row grand-total">
                                    <span>Total:</span>
                                    <span>{Number(data.total_amount).toFixed(2)} {currencies.find(c => c.id == data.currency_id)?.code}</span>
                                </div>
                            </div>
                        </div>

                        <div className="print-footer">
                            <div className="notes-section">
                                <h4>Notes</h4>
                                <p>{data.customer_notes || ''}</p>
                                <p>{data.internal_notes || ''}</p>
                            </div>
                            <div className="signatures">
                                <div className="sign-box">Prepared By</div>
                                <div className="sign-box">Approved By</div>
                                <div className="sign-box">Customer Acceptance</div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
