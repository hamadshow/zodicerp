import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import { formatDate } from '@/utils/date';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function SalesInvoice({ invoices, customers, orders, currencies, products, salesAgents }) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const { localization, flash } = props;
    const { errors } = props;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const orderOptions = useMemo(() => {
        return (orders || []).map(o => ({
            value: String(o.id),
            label: o.order_number || String(o.id)
        }));
    }, [orders]);

    const currencyOptions = useMemo(() => {
        return (currencies || []).map(c => ({
            value: String(c.id),
            label: c.code
        }));
    }, [currencies]);

    const productOptions = useMemo(() => {
        return (products || []).map(p => ({
            value: String(p.id),
            label: p.name_en || p.name_ar || ''
        }));
    }, [products]);

    // Initial Form State
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        order_id: '',
        customer_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        invoice_type: 'standard', // standard, proforma, credit_note, debit_note
        payment_status: 'unpaid', // unpaid, partial, paid, overdue
        
        // Sales specific
        sales_agent_id: '',
        shipping_address_id: '',
        customer_notes: '',
        internal_notes: '',
        
        // Financials
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_cost: 0,
        other_charges: 0,
        total_amount: 0,
        paid_amount: 0,
        balance_amount: 0,

        // Items
        items: [],
        
        // Terms
        payment_terms: '',
    });

    // Helper to calculate totals
    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.discount_amount, data.shipping_cost, data.other_charges, data.tax_amount, data.paid_amount]);

    const handleCreate = () => {
        reset();
        const today = new Date();
        const due = new Date();
        due.setDate(today.getDate() + 30); // Default 30 days due
        
        setData(prev => ({
            ...prev,
            invoice_date: today.toISOString().split('T')[0],
            due_date: due.toISOString().split('T')[0],
            items: [{
                id: null,
                line_number: 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                unit_price: 0,
                discount_amount: 0,
                tax_amount: 0,
                line_total: 0,
            }]
        }));
        setMode('create');
    };

    const handleEdit = (invoice) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...invoice,
            items: (invoice.details || []).map(it => {
                const qty = toNum(it.quantity);
                const unitPrice = toNum(it.unit_price);
                const discountAmount = toNum(it.discount_amount);
                const taxAmount = toNum(it.tax_amount);
                
                return {
                    ...it,
                    quantity: qty,
                    unit_price: unitPrice,
                    discount_amount: discountAmount,
                    tax_amount: taxAmount,
                    line_total: toNum(it.line_total),
                    unit_id: it.product?.unit_id || '',
                    item_name_ar: it.product?.name_ar || '',
                    item_name_en: it.product?.name_en || '',
                };
            }),
            invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
            due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
            subtotal: toNum(invoice.subtotal),
            tax_amount: toNum(invoice.tax_amount),
            discount_amount: toNum(invoice.discount_amount),
            shipping_cost: toNum(invoice.shipping_cost),
            other_charges: toNum(invoice.other_charges),
            total_amount: toNum(invoice.total_amount),
            paid_amount: toNum(invoice.paid_amount),
            balance_amount: toNum(invoice.balance_amount),
            exchange_rate: toNum(invoice.exchange_rate) || 1.000000,
            customer_id: invoice.customer_id || '',
            sales_agent_id: invoice.sales_agent_id || '',
            shipping_address_id: invoice.shipping_address_id || '',
            payment_terms: invoice.payment_terms || '',
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this invoice?')) {
            destroy(getLocalizedRoute('admin.client-sales.invoices.destroy', { invoice: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(getLocalizedRoute('admin.client-sales.invoices.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        } else {
            put(getLocalizedRoute('admin.client-sales.invoices.update', { invoice: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        }
    };

    // Export Features
    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const element = printRef.current;
        if (!element) return;
        
        const module = element.closest('.sales-invoices-module');
        if (module) module.classList.add('generating-pdf');
        
        const opt = {
            margin: [5, 5],
            filename: `SalesInvoice_${data.invoice_number || 'New'}.pdf`,
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
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
        XLSX.writeFile(workbook, `SalesInvoice_${data.invoice_number || 'New'}.xlsx`);
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
                discount_amount: 0,
                tax_amount: 0,
                line_total: 0,
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
                newItems[index].item_name_ar = product.name_ar || product.name || '';
                newItems[index].item_name_en = product.name_en || product.name || '';
                newItems[index].unit_price = product.price || 0;
                newItems[index].unit_id = product.unit_id || '';
            }
        }

        // Calculate Line Totals
        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].unit_price) || 0;
        const discAmount = parseFloat(newItems[index].discount_amount) || 0;
        const taxVal = parseFloat(newItems[index].tax_amount) || 0;

        const netPrice = (qty * price) - discAmount;
        const total = netPrice + taxVal;
        
        newItems[index].line_total = total.toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        const globalDiscount = parseFloat(data.discount_amount) || 0;
        const shipping = parseFloat(data.shipping_cost) || 0;
        const other = parseFloat(data.other_charges) || 0;
        
        let calculatedSubtotal = 0;
        let calculatedTax = 0;
        
        items.forEach(item => {
             const qty = parseFloat(item.quantity) || 0;
             const price = parseFloat(item.unit_price) || 0;
             const iDisc = parseFloat(item.discount_amount) || 0;
             const iTax = parseFloat(item.tax_amount) || 0;
             
             calculatedSubtotal += (qty * price) - iDisc;
             calculatedTax += iTax;
        });

        const totalAmount = calculatedSubtotal + calculatedTax - globalDiscount + shipping + other;
        const paid = parseFloat(data.paid_amount) || 0;
        const balance = totalAmount - paid;

        if (
            Math.abs(data.subtotal - calculatedSubtotal) > 0.01 ||
            Math.abs(data.tax_amount - calculatedTax) > 0.01 ||
            Math.abs(data.total_amount - totalAmount) > 0.01 ||
            Math.abs(data.balance_amount - balance) > 0.01
        ) {
             setData(prev => ({
                ...prev,
                subtotal: calculatedSubtotal,
                tax_amount: calculatedTax,
                total_amount: totalAmount,
                balance_amount: balance
            }));
        }
    };

    return (
        <AdminLayout>
            <Head title="Sales Invoices" />
            
            <div className="sales-invoices-module">
                <div className="sales-invoices-module__header">
                    <h1>Sales Invoices</h1>
                    {mode === 'list' && (
                        <button className="btn-add" onClick={handleCreate}>
                            + Create Invoice
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
                    <div className="sales-invoices-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Balance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices?.data?.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td>{invoice.invoice_number}</td>
                                        <td>{formatDate(invoice.invoice_date)}</td>
                                        <td>{invoice.customer?.name_en || invoice.customer?.name_ar || invoice.customer?.name}</td>
                                        <td>
                                            <span className={`status-badge type-${invoice.invoice_type}`}>
                                                {invoice.invoice_type?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${invoice.payment_status}`}>
                                                {invoice.payment_status}
                                            </span>
                                        </td>
                                        <td>{Number(invoice.total_amount).toFixed(2)} {invoice.currency?.code}</td>
                                        <td>{Number(invoice.balance_amount).toFixed(2)} {invoice.currency?.code}</td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(invoice)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(invoice.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {(!invoices?.data || invoices.data.length === 0) && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center' }}>No sales invoices found.</td>
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
                                <h2>SALES INVOICE</h2>
                                <p>Zodic ERP System</p>
                            </div>
                            <div className="invoice-meta">
                                <label>Invoice #</label>
                                <input type="text" value={data.invoice_number} disabled placeholder="Auto-generated" />
                                
                                <label>Date <span className="required">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.invoice_date} 
                                    onChange={e => setData('invoice_date', e.target.value)}
                                    className={errors.invoice_date ? 'error' : ''}
                                />
                                
                                <label>Due Date</label>
                                <input 
                                    type="date" 
                                    value={data.due_date} 
                                    onChange={e => setData('due_date', e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* 2. Info Grid */}
                        <div className="invoice-info-grid">
                            <div className="info-section">
                                <h3>Customer Details</h3>
                                <div className="form-group">
                                    <label>Customer Name <span className="required">*</span></label>
                                    <select 
                                        value={data.customer_id} 
                                        onChange={e => setData('customer_id', e.target.value)}
                                        className={errors.customer_id ? 'error' : ''}
                                    >
                                        <option value="">Select Customer</option>
                                        {customers?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name_en || c.name_ar}</option>
                                        ))}
                                    </select>
                                    {errors.customer_id && <span className="error-msg">{errors.customer_id}</span>}
                                </div>
                                
                                <div className="form-grid" style={{marginTop: '1rem'}}>
                                    <div className="form-group">
                                        <label>Sales Agent</label>
                                        <select value={data.sales_agent_id} onChange={e => setData('sales_agent_id', e.target.value)}>
                                            <option value="">Select Agent</option>
                                            {salesAgents?.map(a => (
                                                <option key={a.id} value={a.id}>{a.name_en || a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Link Order</label>
                                        <SearchableComboBox
                                            options={orderOptions}
                                            value={data.order_id ? String(data.order_id) : ''}
                                            onChange={(val) => setData('order_id', val)}
                                            placeholder="Select Order"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Invoice Settings</h3>
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
                                        <input 
                                            type="number" 
                                            step="0.000001" 
                                            value={data.exchange_rate} 
                                            onChange={e => setData('exchange_rate', e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Type</label>
                                        <select value={data.invoice_type} onChange={e => setData('invoice_type', e.target.value)}>
                                            <option value="standard">Standard</option>
                                            <option value="proforma">Proforma</option>
                                            <option value="credit_note">Credit Note</option>
                                            <option value="debit_note">Debit Note</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Payment Status</label>
                                        <select value={data.payment_status} onChange={e => setData('payment_status', e.target.value)}>
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partial">Partial</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Section */}
                        <div className="invoice-items-section">
                            <div className="items-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{width: '50px'}} className="text-center">#</th>
                                            <th style={{width: '25%'}}>Item</th>
                                            <th style={{width: '10%'}} className="text-center">Qty</th>
                                            <th style={{width: '15%'}} className="text-right">Price</th>
                                            <th style={{width: '10%'}} className="text-right">Disc</th>
                                            <th style={{width: '10%'}} className="text-right">Tax</th>
                                            <th style={{width: '15%'}} className="text-right">Total</th>
                                            <th style={{width: '50px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>
                                                    <div style={{ marginBottom: '5px' }}>
                                                        <SearchableComboBox
                                                            options={productOptions}
                                                            value={item.product_id ? String(item.product_id) : ''}
                                                            onChange={(val) => handleItemChange(index, 'product_id', val)}
                                                            placeholder="Select Product"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Description"
                                                        value={item.item_name_ar}
                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity} 
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="text-center"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.unit_price} 
                                                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.discount_amount} 
                                                        onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.tax_amount} 
                                                        onChange={e => handleItemChange(index, 'tax_amount', e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="text" 
                                                        value={item.line_total} 
                                                        disabled 
                                                        className="text-right"
                                                        style={{fontWeight: 'bold'}}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button type="button" onClick={() => removeItem(index)} style={{color: 'red', background: 'none', border: 'none', cursor: 'pointer'}}>
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
                                    + Add Line Item
                                </button>
                            </div>
                        </div>

                        {/* 4. Footer Section */}
                        <div className="invoice-footer-section">
                            <div className="invoice-terms">
                                <div className="form-group">
                                    <label>Customer Notes</label>
                                    <textarea 
                                        value={data.customer_notes} 
                                        onChange={e => setData('customer_notes', e.target.value)}
                                        placeholder="Notes visible to customer..."
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Internal Notes</label>
                                    <textarea 
                                        value={data.internal_notes} 
                                        onChange={e => setData('internal_notes', e.target.value)}
                                        placeholder="Internal notes..."
                                        style={{minHeight: '60px'}}
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Payment Terms</label>
                                    <textarea 
                                        value={data.payment_terms} 
                                        onChange={e => setData('payment_terms', e.target.value)}
                                        placeholder="Payment terms..."
                                        style={{minHeight: '60px'}}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="label">Subtotal</span>
                                    <span>{Number(data.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Global Discount</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.discount_amount} 
                                        onChange={e => setData('discount_amount', e.target.value)} 
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Shipping</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.shipping_cost} 
                                        onChange={e => setData('shipping_cost', e.target.value)} 
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Extra Charges</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.other_charges} 
                                        onChange={e => setData('other_charges', e.target.value)} 
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Tax Total</span>
                                    <span>{Number(data.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row grand-total">
                                    <span>Total Amount</span>
                                    <span>{Number(data.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Paid Amount</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.paid_amount} 
                                        onChange={e => setData('paid_amount', e.target.value)} 
                                    />
                                </div>
                                <div className="total-row" style={{color: 'red', fontWeight: 'bold'}}>
                                    <span>Balance Due</span>
                                    <span>{Number(data.balance_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Sticky Actions Footer */}
                    <div className="sticky-actions-footer">
                        <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-save" onClick={handleSubmit} disabled={processing}>
                            {processing ? 'Saving...' : 'Save Invoice'}
                        </button>
                    </div>

                    {/* Printable Invoice Component (Hidden from screen) */}
                    <div className="printable-invoice" ref={printRef}>
                        <div className="print-header">
                            <div className="company-branding">
                                <h1>ZODIC ERP</h1>
                                <p>123 Business Street, City, Country</p>
                                <p>Phone: +1 234 567 890</p>
                            </div>
                            <div className="doc-info">
                                <h2>SALES INVOICE</h2>
                                <div className="meta-row"><span className="label">Invoice #:</span> {data.invoice_number || 'DRAFT'}</div>
                                <div className="meta-row"><span className="label">Date:</span> {data.invoice_date}</div>
                                <div className="meta-row"><span className="label">Due Date:</span> {data.due_date}</div>
                            </div>
                        </div>

                        <div className="print-meta-grid">
                            <div className="meta-box">
                                <h3>Bill To:</h3>
                                <p><strong>{customers?.find(c => c.id == data.customer_id)?.name_en || 'Customer Name'}</strong></p>
                                {/* Add address if available */}
                            </div>
                            <div className="meta-box">
                                <h3>Details:</h3>
                                <p><strong>Sales Agent:</strong> {salesAgents?.find(a => a.id == data.sales_agent_id)?.name_en || '-'}</p>
                                <p><strong>Order Ref:</strong> {orders?.find(o => o.id == data.order_id)?.order_number || '-'}</p>
                            </div>
                        </div>

                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Description</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <strong>{products?.find(p => p.id == item.product_id)?.name_en}</strong>
                                            {item.item_name_ar && <div>{item.item_name_ar}</div>}
                                        </td>
                                        <td className="text-center">{item.quantity}</td>
                                        <td className="text-right">{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="text-right">{Number(item.line_total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="print-totals">
                            <div className="totals-box">
                                <div className="row"><span>Subtotal:</span> <span>{Number(data.subtotal).toFixed(2)}</span></div>
                                <div className="row"><span>Discount:</span> <span>{Number(data.discount_amount).toFixed(2)}</span></div>
                                <div className="row"><span>Tax:</span> <span>{Number(data.tax_amount).toFixed(2)}</span></div>
                                <div className="row"><span>Shipping:</span> <span>{Number(data.shipping_cost).toFixed(2)}</span></div>
                                <div className="row grand-total"><span>Total:</span> <span>{Number(data.total_amount).toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div className="print-footer">
                            {data.customer_notes && (
                                <div className="notes-section">
                                    <h4>Notes:</h4>
                                    <p>{data.customer_notes}</p>
                                </div>
                            )}
                            
                            <div className="signatures">
                                <div className="sign-box">Authorized Signature</div>
                                <div className="sign-box">Customer Signature</div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
