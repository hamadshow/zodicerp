import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function PurchaseOrder({ orders, vendors, currencies, products, units, paymentTerms, deliveryTerms }) {
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

    const productOptions = useMemo(() => {
        return (products || []).map(p => ({
            value: String(p.id),
            label: p.name_en || ''
        }));
    }, [products]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            value: String(u.id),
            label: u.name_en || ''
        }));
    }, [units]);

    // Initial Form State
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        po_number: '',
        po_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        vendor_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        status: 'draft',
        priority: 'medium',
        notes: '',
        
        // Financials
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_charges: 0,
        grand_total: 0,

        // Items
        items: [],
        
        // Terms
        payment_terms_id: '',
        delivery_terms_id: '',
        shipping_method: '',
        shipping_address: '',
        terms_and_conditions: '',
    });

    // Helper to calculate totals
    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.discount_amount, data.shipping_charges, data.tax_amount]);

    const handleCreate = () => {
        reset();
        const today = new Date();
        const delivery = new Date(new Date().setDate(today.getDate() + 30));
        setData(prev => ({
            ...prev,
            po_date: today.toISOString().split('T')[0],
            expected_delivery_date: delivery.toISOString().split('T')[0],
            items: [{
                id: null,
                line_number: 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                unit_price: 0,
                discount_percent: 0,
                discount_amount: 0,
                tax_percent: 0,
                tax_amount: 0,
                line_total: 0,
                warehouse_id: '',
            }]
        }));
        setMode('create');
    };

    const handleEdit = (order) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...order,
            items: (order.items || []).map(it => {
                const qty = toNum(it.quantity || it.ordered_quantity);
                const unitPrice = toNum(it.unit_price);
                const discountAmount = toNum(it.discount_amount);
                const taxAmount = toNum(it.tax_amount || it.tax_total);
                
                const netPrice = unitPrice - discountAmount;
                const taxableAmount = qty * netPrice;
                
                let taxPercent = 0;
                if (taxableAmount > 0) {
                    taxPercent = (taxAmount / taxableAmount) * 100;
                }

                return {
                    ...it,
                    quantity: qty,
                    unit_price: unitPrice,
                    discount_amount: discountAmount,
                    tax_amount: taxAmount,
                    line_total: toNum(it.line_total),
                    unit_id: it.unit_id,
                    tax_percent: taxPercent.toFixed(2)
                };
            }),
            po_date: order.po_date ? order.po_date.split('T')[0] : '',
            expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '',
            subtotal: toNum(order.subtotal),
            tax_amount: toNum(order.tax_amount),
            discount_amount: toNum(order.discount_amount),
            shipping_charges: toNum(order.shipping_charges),
            grand_total: toNum(order.grand_total),
            exchange_rate: toNum(order.exchange_rate),
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this order?')) {
            destroy(getLocalizedRoute('admin.purchases.orders.destroy', { order: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(getLocalizedRoute('admin.purchases.orders.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        } else {
            put(getLocalizedRoute('admin.purchases.orders.update', { order: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        }
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
                discount_percent: 0,
                discount_amount: 0,
                tax_amount: 0,
                line_total: 0,
                warehouse_id: '',
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
                newItems[index].unit_price = product.purchase_price || 0;
                newItems[index].unit_id = product.unit_id || '';
            }
        }

        // Calculate Line Totals
        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].unit_price) || 0;
        const discAmount = parseFloat(newItems[index].discount_amount) || 0;
        const taxRate = parseFloat(newItems[index].tax_percent) || 0;

        const netPrice = price - discAmount;
        const taxableAmount = qty * netPrice;
        const taxValue = taxableAmount * (taxRate / 100);
        
        newItems[index].tax_amount = taxValue.toFixed(2);
        newItems[index].line_total = (taxableAmount + taxValue).toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0) - (parseFloat(item.tax_amount) || 0), 0);
        const taxTotal = items.reduce((sum, item) => sum + (parseFloat(item.tax_amount) || 0), 0);
        
        // Global calculations
        const globalDiscount = parseFloat(data.discount_amount) || 0;
        const shipping = parseFloat(data.shipping_charges) || 0;
        
        const grandTotal = subtotal + taxTotal - globalDiscount + shipping;

        // Only update if values changed to avoid infinite loop
        if (
            Math.abs(data.subtotal - subtotal) > 0.01 ||
            Math.abs(data.tax_amount - taxTotal) > 0.01 ||
            Math.abs(data.grand_total - grandTotal) > 0.01
        ) {
             setData(prev => ({
                ...prev,
                subtotal: subtotal,
                tax_amount: taxTotal,
                grand_total: grandTotal
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
        
        // Apply class to parent to toggle visibility
        const module = element.closest('.purchase-orders-module');
        if (module) module.classList.add('generating-pdf');
        
        const opt = {
            margin: [5, 5],
            filename: `PurchaseOrder_${data.po_number || 'New'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            if (module) module.classList.remove('generating-pdf');
        });
    };

    const handleExportExcel = () => {
        // Prepare data
        const itemsData = data.items.map((item, index) => ({
            '#': index + 1,
            'Product': products.find(p => p.id == item.product_id)?.name_en || '',
            'Description': item.item_name_ar || '',
            'Quantity': Number(item.quantity),
            'Unit': units.find(u => u.id == item.unit_id)?.name_en || '',
            'Price': Number(item.unit_price),
            'Discount': Number(item.discount_amount),
            'Tax %': Number(item.tax_percent),
            'Tax Amount': Number(item.tax_amount),
            'Total': Number(item.line_total)
        }));

        // Add Totals rows
        itemsData.push({}); // Empty row
        itemsData.push({ 'Product': 'Subtotal', 'Total': Number(data.subtotal) });
        itemsData.push({ 'Product': 'Tax', 'Total': Number(data.tax_amount) });
        itemsData.push({ 'Product': 'Discount', 'Total': Number(data.discount_amount) });
        itemsData.push({ 'Product': 'Shipping', 'Total': Number(data.shipping_charges) });
        itemsData.push({ 'Product': 'Grand Total', 'Total': Number(data.grand_total) });

        const worksheet = XLSX.utils.json_to_sheet(itemsData);
        
        // Auto-width for columns
        const wscols = [
            {wch: 5}, // #
            {wch: 20}, // Product
            {wch: 30}, // Description
            {wch: 10}, // Qty
            {wch: 10}, // Unit
            {wch: 10}, // Price
            {wch: 10}, // Discount
            {wch: 10}, // Tax %
            {wch: 10}, // Tax Amt
            {wch: 15}  // Total
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
        XLSX.writeFile(workbook, `PurchaseOrder_${data.po_number || 'New'}.xlsx`);
    };

    return (
        <AdminLayout>
            <Head title="Purchase Orders" />
            
            <div className="purchase-orders-module">
                <div className="purchase-orders-module__header">
                    <h1>Purchase Orders</h1>
                    {mode === 'list' && (
                    <button className="btn-add" onClick={handleCreate}>
                        + Create Order
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
                    <div className="purchase-orders-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Vendor</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.data.map((order) => (
                                    <tr key={order.id}>
                                        <td>{order.po_number}</td>
                                        <td>{order.po_date}</td>
                                        <td>{order.vendor?.name_en || order.vendor?.name_ar}</td>
                                        <td>
                                            <span className={`status-badge status-${order.status}`}>
                                                {order.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{order.grand_total} {order.currency?.code}</td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(order)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(order.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {orders.data.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center' }}>No orders found.</td>
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
                                <h2>PURCHASE ORDER</h2>
                                <p>Zodic ERP System</p>
                            </div>
                            <div className="invoice-meta">
                                <label>Order #</label>
                                <input type="text" value={data.po_number} disabled placeholder="Auto-generated" />
                                
                                <label>Date <span className="required">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.po_date} 
                                    onChange={e => setData('po_date', e.target.value)}
                                    className={errors.po_date ? 'error' : ''}
                                />
                                
                                <label>Expected Delivery</label>
                                <input 
                                    type="date" 
                                    value={data.expected_delivery_date} 
                                    onChange={e => setData('expected_delivery_date', e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* 2. Info Grid (Vendor, Currency, Status) */}
                        <div className="invoice-info-grid">
                            <div className="info-section">
                                <h3>Vendor Details</h3>
                                <div className="form-group">
                                    <label>Vendor Name <span className="required">*</span></label>
                                    <select 
                                        value={data.vendor_id} 
                                        onChange={e => setData('vendor_id', e.target.value)}
                                        className={errors.vendor_id ? 'error' : ''}
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name_en} - {v.name_ar}</option>
                                        ))}
                                    </select>
                                    {errors.vendor_id && <span className="error-msg">{errors.vendor_id}</span>}
                                </div>
                                <div className="form-group" style={{marginTop: '1rem'}}>
                                    <label>Notes</label>
                                    <textarea 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)} 
                                        rows="2"
                                        placeholder="Internal notes..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Settings & Currency</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Currency</label>
                                        <select value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                            <option value="">Select Currency</option>
                                            {currencies.map(c => (
                                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Exchange Rate</label>
                                        <input type="number" step="0.000001" value={data.exchange_rate} onChange={e => setData('exchange_rate', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)}>
                                            <option value="draft">Draft</option>
                                            <option value="pending_approval">Pending Approval</option>
                                            <option value="approved">Approved</option>
                                            <option value="sent_to_vendor">Sent to Vendor</option>
                                            <option value="partially_received">Partially Received</option>
                                            <option value="fully_received">Fully Received</option>
                                            <option value="invoiced">Invoiced</option>
                                            <option value="closed">Closed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                     <div className="form-group">
                                        <label>Priority</label>
                                        <select value={data.priority} onChange={e => setData('priority', e.target.value)}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
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
                                            <th className="text-center" style={{width: '50px'}}>#</th>
                                            <th style={{width: '25%'}}>Product</th>
                                            <th>Description</th>
                                            <th className="text-center" style={{width: '80px'}}>Qty</th>
                                            <th style={{width: '100px'}}>Unit</th>
                                            <th className="text-right" style={{width: '120px'}}>Price</th>
                                            <th className="text-right" style={{width: '100px'}}>Discount</th>
                                            <th className="text-center" style={{width: '80px'}}>Tax %</th>
                                            <th className="text-right" style={{width: '100px'}}>Tax Amt</th>
                                            <th className="text-right" style={{width: '120px'}}>Total</th>
                                            <th className="text-center" style={{width: '50px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="text-center">{index + 1}</td>
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
                                                        placeholder="Description" 
                                                        value={item.item_name_ar} 
                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        className="text-center"
                                                        value={item.quantity} 
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
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
                                                        className="text-right"
                                                        value={item.unit_price} 
                                                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        className="text-right"
                                                        value={item.discount_amount} 
                                                        onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        className="text-center"
                                                        value={item.tax_percent} 
                                                        onChange={e => handleItemChange(index, 'tax_percent', e.target.value)}
                                                    />
                                                </td>
                                                <td className="text-right">
                                                    {Number(item.tax_amount || 0).toFixed(2)}
                                                </td>
                                                <td className="text-right font-bold">
                                                    {Number(item.line_total || 0).toFixed(2)}
                                                </td>
                                                <td className="text-center">
                                                    <button type="button" className="btn-remove" onClick={() => removeItem(index)} style={{color: 'var(--danger-color)', border:'none', background:'none', cursor:'pointer', fontSize:'1.2rem'}}>×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="add-item-row">
                                <button type="button" className="btn-add-item" onClick={addItem}>
                                    <span>+ Add Line Item</span>
                                </button>
                            </div>
                        </div>

                        {/* 4. Footer Section (Terms & Totals) */}
                        <div className="invoice-footer-section">
                            <div className="invoice-terms">
                                <h4>Terms & Conditions</h4>
                                <div className="terms-grid">
                                    <div className="form-group">
                                        <label>Payment Terms</label>
                                        <select 
                                            value={data.payment_terms_id} 
                                            onChange={e => setData('payment_terms_id', e.target.value)}
                                        >
                                            <option value="">Select Terms</option>
                                            {paymentTerms && paymentTerms.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Delivery Terms</label>
                                        <select 
                                            value={data.delivery_terms_id} 
                                            onChange={e => setData('delivery_terms_id', e.target.value)}
                                        >
                                            <option value="">Select Terms</option>
                                            {deliveryTerms && deliveryTerms.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Shipping Method</label>
                                    <input 
                                        type="text" 
                                        value={data.shipping_method} 
                                        onChange={e => setData('shipping_method', e.target.value)} 
                                        placeholder="e.g. Air Freight"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Additional Terms</label>
                                    <textarea 
                                        value={data.terms_and_conditions} 
                                        onChange={e => setData('terms_and_conditions', e.target.value)} 
                                        placeholder="Enter any specific terms and conditions..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="label">Subtotal</span>
                                    <span>{Number(data.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Tax</span>
                                    <span>{Number(data.tax_amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Discount</span>
                                    <input 
                                        type="number" 
                                        value={data.discount_amount} 
                                        onChange={e => setData('discount_amount', e.target.value)}
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Shipping</span>
                                    <input 
                                        type="number" 
                                        value={data.shipping_charges} 
                                        onChange={e => setData('shipping_charges', e.target.value)}
                                    />
                                </div>
                                <div className="total-row grand-total">
                                    <span className="label">Grand Total</span>
                                    <input type="text" value={Number(data.grand_total || 0).toFixed(2)} readOnly />
                                </div>
                            </div>
                        </div>

                        {/* 5. Sticky Actions Footer */}
                        <div className="sticky-actions-footer">
                            <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>Cancel</button>
                            <button type="submit" className="btn btn-save" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Order'}
                            </button>
                        </div>
                    </form>

                    {/* HIDDEN PRINTABLE INVOICE - Only Visible on Print/PDF */}
                    <div className="printable-invoice" ref={printRef}>
                        {/* Header */}
                        <div className="print-header">
                            <div className="company-branding">
                                <h1>Zodic ERP System</h1>
                                <p>123 Business Road, City, Country</p>
                                <p>Phone: +1 234 567 890</p>
                            </div>
                            <div className="doc-info">
                                <h2>PURCHASE ORDER</h2>
                                <div className="meta-row"><span className="label">Order #:</span> {data.po_number || 'DRAFT'}</div>
                                <div className="meta-row"><span className="label">Date:</span> {data.po_date}</div>
                                <div className="meta-row"><span className="label">Expected Delivery:</span> {data.expected_delivery_date}</div>
                            </div>
                        </div>

                        {/* Meta Grid */}
                        <div className="print-meta-grid">
                            <div className="meta-box">
                                <h3>Vendor Details</h3>
                                <p><strong>Name:</strong> {vendors.find(v => v.id == data.vendor_id)?.name_en || 'N/A'}</p>
                                <p><strong>Phone:</strong> {vendors.find(v => v.id == data.vendor_id)?.phone || 'N/A'}</p>
                                <p><strong>Address:</strong> {vendors.find(v => v.id == data.vendor_id)?.address || 'N/A'}</p>
                            </div>
                            <div className="meta-box" style={{textAlign: 'right'}}>
                                <h3>Order Details</h3>
                                <p><strong>Currency:</strong> {currencies.find(c => c.id == data.currency_id)?.code || 'N/A'}</p>
                                <p><strong>Exchange Rate:</strong> {data.exchange_rate}</p>
                                <p><strong>Status:</strong> <span style={{textTransform: 'uppercase'}}>{data.status}</span></p>
                            </div>
                        </div>

                        {/* Table */}
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Product / Description</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-center">Unit</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Disc.</th>
                                    <th className="text-center">Tax %</th>
                                    <th className="text-right">Tax Amt</th>
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
                                        <td className="text-center">{Number(item.tax_percent)}%</td>
                                        <td className="text-right">{Number(item.tax_amount).toFixed(2)}</td>
                                        <td className="text-right font-bold">{Number(item.line_total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
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
                                    <span>{Number(data.shipping_charges).toFixed(2)}</span>
                                </div>
                                <div className="row grand-total">
                                    <span>Grand Total:</span>
                                    <span>{Number(data.grand_total).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="print-footer">
                            <div className="notes-section">
                                <h4>Terms & Conditions / Notes</h4>
                                <p>{data.terms_and_conditions || data.notes || 'No specific terms.'}</p>
                            </div>
                            <div className="signatures">
                                <div className="sign-box">Authorized Signature</div>
                                <div className="sign-box">Vendor Acceptance</div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
