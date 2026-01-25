import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/05-Client_Sales/Sales_Orders.scss';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function SalesOrders({ 
    orders, 
    customers, 
    currencies, 
    products, 
    units, 
    priceLists = [], 
    warehouses = [], 
    salesAgents = [],
    customerAddresses = [], // Assuming passed from backend
    openQuotations = [] // Assuming passed from backend for linking
}) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};
    const { errors } = props;

    // Initial Form State
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        order_number: '',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        actual_delivery_date: '',
        
        customer_id: '',
        quotation_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        status: 'draft',
        priority: 'normal',
        
        // Sales Specific
        price_list_id: '',
        warehouse_id: '',
        sales_agent_id: '',
        
        // Logistics & Payment
        shipping_method: '',
        shipping_address_id: '',
        payment_terms: '',
        advance_payment: 0,
        
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
        setData(prev => ({
            ...prev,
            order_date: today.toISOString().split('T')[0],
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
                requested_delivery_date: '',
                notes: ''
            }]
        }));
        setMode('create');
    };

    const handleEdit = (order) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...order,
            items: (order.items || []).map(it => {
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
                    requested_delivery_date: it.requested_delivery_date ? it.requested_delivery_date.split('T')[0] : '',
                    notes: it.notes || ''
                };
            }),
            order_date: order.order_date ? order.order_date.split('T')[0] : '',
            delivery_date: order.delivery_date ? order.delivery_date.split('T')[0] : '',
            actual_delivery_date: order.actual_delivery_date ? order.actual_delivery_date.split('T')[0] : '',
            subtotal: toNum(order.subtotal),
            discount_percentage: toNum(order.discount_percentage),
            discount_amount: toNum(order.discount_amount),
            tax_amount: toNum(order.tax_amount),
            shipping_cost: toNum(order.shipping_cost),
            total_amount: toNum(order.total_amount),
            base_total: toNum(order.base_total),
            exchange_rate: toNum(order.exchange_rate),
            advance_payment: toNum(order.advance_payment),
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this order?')) {
            destroy(route('admin.client-sales.orders.destroy', { order: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(route('admin.client-sales.orders.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        } else {
            put(route('admin.client-sales.orders.update', { order: data.id }), {
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
                requested_delivery_date: '',
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
        
        const module = element.closest('.sales-orders-module');
        if (module) module.classList.add('generating-pdf');
        
        const opt = {
            margin: [5, 5],
            filename: `SalesOrder_${data.order_number || 'New'}.pdf`,
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "Order");
        XLSX.writeFile(workbook, `SalesOrder_${data.order_number || 'New'}.xlsx`);
    };

    return (
        <AdminLayout>
            <Head title="Sales Orders" />
            
            <div className="sales-orders-module">
                <div className="sales-orders-module__header">
                    <h1>Sales Orders</h1>
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
                    <div className="sales-orders-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.data.map((o) => (
                                    <tr key={o.id}>
                                        <td>{o.order_number}</td>
                                        <td>{o.order_date}</td>
                                        <td>{o.customer?.name_en || o.customer?.name_ar}</td>
                                        <td>
                                            <span className={`status-badge status-${o.status}`}>
                                                {o.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`priority-badge priority-${o.priority}`}>
                                                {o.priority}
                                            </span>
                                        </td>
                                        <td>{Number(o.total_amount).toFixed(2)} {o.currency?.code}</td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(o)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(o.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {orders.data.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}>No orders found.</td>
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
                                <h2>SALES ORDER</h2>
                                <p>Zodic ERP System</p>
                            </div>
                            <div className="invoice-meta">
                                <label>Order #</label>
                                <input type="text" value={data.order_number} disabled placeholder="Auto-generated" />
                                
                                <label>Date <span className="required">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.order_date} 
                                    onChange={e => setData('order_date', e.target.value)}
                                    className={errors.order_date ? 'error' : ''}
                                />
                                
                                <label>Delivery Date</label>
                                <input 
                                    type="date" 
                                    value={data.delivery_date} 
                                    onChange={e => setData('delivery_date', e.target.value)} 
                                />

                                <label>Priority</label>
                                <select value={data.priority} onChange={e => setData('priority', e.target.value)}>
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
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
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name_en} - {c.name_ar}</option>
                                        ))}
                                    </select>
                                    {errors.customer_id && <span className="error-msg">{errors.customer_id}</span>}
                                </div>
                                
                                <div className="form-grid" style={{marginTop: '1rem'}}>
                                    <div className="form-group">
                                        <label>Sales Agent</label>
                                        <select value={data.sales_agent_id} onChange={e => setData('sales_agent_id', e.target.value)}>
                                            <option value="">Select Agent</option>
                                            {salesAgents.map(a => (
                                                <option key={a.id} value={a.id}>{a.name_en || a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Price List</label>
                                        <select value={data.price_list_id} onChange={e => setData('price_list_id', e.target.value)}>
                                            <option value="">Select Price List</option>
                                            {priceLists.map(pl => (
                                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Warehouse <span className="required">*</span></label>
                                        <select 
                                            value={data.warehouse_id} 
                                            onChange={e => setData('warehouse_id', e.target.value)}
                                            className={errors.warehouse_id ? 'error' : ''}
                                        >
                                            <option value="">Select Warehouse</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                        {errors.warehouse_id && <span className="error-msg">{errors.warehouse_id}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Currency <span className="required">*</span></label>
                                        <select 
                                            value={data.currency_id} 
                                            onChange={e => setData('currency_id', e.target.value)}
                                            className={errors.currency_id ? 'error' : ''}
                                        >
                                            <option value="">Select Currency</option>
                                            {currencies.map(c => (
                                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                        {errors.currency_id && <span className="error-msg">{errors.currency_id}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Shipping & Logistics</h3>
                                <div className="form-group">
                                    <label>Shipping Method</label>
                                    <input 
                                        type="text" 
                                        value={data.shipping_method} 
                                        onChange={e => setData('shipping_method', e.target.value)}
                                        placeholder="e.g. Courier, Pickup, Truck"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Shipping Address</label>
                                    <select 
                                        value={data.shipping_address_id} 
                                        onChange={e => setData('shipping_address_id', e.target.value)}
                                    >
                                        <option value="">Select Address</option>
                                        {customerAddresses
                                            .filter(a => a.customer_id == data.customer_id)
                                            .map(a => (
                                            <option key={a.id} value={a.id}>{a.address_line_1}, {a.city?.name_en}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Actual Delivery Date</label>
                                        <input 
                                            type="date" 
                                            value={data.actual_delivery_date} 
                                            onChange={e => setData('actual_delivery_date', e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Reference Quotation</label>
                                        <select value={data.quotation_id} onChange={e => setData('quotation_id', e.target.value)}>
                                            <option value="">Select Quotation</option>
                                            {openQuotations.map(q => (
                                                <option key={q.id} value={q.id}>{q.quotation_number}</option>
                                            ))}
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
                                            <th style={{width: '100px'}} className="text-center">Qty</th>
                                            <th style={{width: '100px'}}>Unit</th>
                                            <th style={{width: '120px'}} className="text-right">Price</th>
                                            <th style={{width: '100px'}} className="text-right">Discount</th>
                                            <th style={{width: '100px'}} className="text-right">Tax</th>
                                            <th style={{width: '120px'}} className="text-right">Total</th>
                                            <th style={{width: '40px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <select 
                                                        value={item.product_id} 
                                                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                                                    >
                                                        <option value="">Select Product</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name_en}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input 
                                                        type="text" 
                                                        value={item.item_name_ar} 
                                                        onChange={(e) => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                        placeholder="Description"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity} 
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="text-center"
                                                    />
                                                </td>
                                                <td>
                                                    <select 
                                                        value={item.unit_id} 
                                                        onChange={(e) => handleItemChange(index, 'unit_id', e.target.value)}
                                                    >
                                                        <option value="">Unit</option>
                                                        {units.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name_en}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.unit_price} 
                                                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.discount_amount} 
                                                        onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)}
                                                        className="text-right"
                                                        placeholder="Amt"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.tax_amount} 
                                                        onChange={(e) => handleItemChange(index, 'tax_amount', e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                                <td className="text-right">
                                                    {Number(item.line_total).toFixed(2)}
                                                </td>
                                                <td>
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
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* 4. Footer Section */}
                        <div className="invoice-footer-section">
                            <div className="invoice-terms">
                                <div className="terms-grid">
                                    <div className="form-group">
                                        <label>Payment Terms</label>
                                        <input 
                                            type="text" 
                                            value={data.payment_terms} 
                                            onChange={e => setData('payment_terms', e.target.value)}
                                            placeholder="e.g. Net 30"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Advance Payment</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={data.advance_payment} 
                                            onChange={e => setData('advance_payment', e.target.value)}
                                            className="text-right"
                                        />
                                    </div>
                                </div>

                                <h4>Customer Notes</h4>
                                <textarea 
                                    value={data.customer_notes} 
                                    onChange={e => setData('customer_notes', e.target.value)}
                                    placeholder="Notes visible to customer..."
                                />
                                
                                <h4 style={{marginTop: '1rem'}}>Internal Notes</h4>
                                <textarea 
                                    value={data.internal_notes} 
                                    onChange={e => setData('internal_notes', e.target.value)}
                                    placeholder="Internal use only..."
                                />
                            </div>

                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="label">Subtotal</span>
                                    <span>{Number(data.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Discount</span>
                                    <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                                        <input 
                                            type="number" 
                                            value={data.discount_percentage} 
                                            onChange={e => handleDiscountPercentChange(e.target.value)} 
                                            style={{width: '60px'}}
                                            placeholder="%"
                                        />
                                        <span>%</span>
                                        <input 
                                            type="number" 
                                            value={data.discount_amount} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setData(prev => ({ ...prev, discount_amount: val, discount_percentage: 0 }));
                                            }}
                                            style={{width: '80px'}}
                                        />
                                    </div>
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
                                        onChange={e => setData('shipping_cost', parseFloat(e.target.value) || 0)} 
                                    />
                                </div>
                                <div className="total-row grand-total">
                                    <span className="label">Total</span>
                                    <span>{Number(data.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Advance Paid</span>
                                    <span>{Number(data.advance_payment).toFixed(2)}</span>
                                </div>
                                <div className="total-row" style={{fontWeight: 'bold', color: 'var(--danger-color)'}}>
                                    <span className="label">Balance Due</span>
                                    <span>{(Number(data.total_amount) - Number(data.advance_payment)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer Actions */}
                        <div className="sticky-actions-footer">
                            <div style={{marginRight: 'auto', display: 'flex', gap: '10px', alignItems: 'center'}}>
                                <label>Status:</label>
                                <select 
                                    value={data.status} 
                                    onChange={e => setData('status', e.target.value)}
                                    style={{padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0'}}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="processing">Processing</option>
                                    <option value="ready_for_delivery">Ready for Delivery</option>
                                    <option value="partially_delivered">Partially Delivered</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>Cancel</button>
                            <button type="submit" className="btn btn-save" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Order'}
                            </button>
                        </div>

                        {/* Printable Invoice (Hidden) */}
                        <div ref={printRef} className="printable-invoice">
                            <div className="print-header">
                                <div className="company-branding">
                                    <h1>Zodic ERP</h1>
                                    <p>Sales Order</p>
                                </div>
                                <div className="doc-info">
                                    <h2>ORDER #{data.order_number}</h2>
                                    <div className="meta-row"><span className="label">Date:</span> {data.order_date}</div>
                                    <div className="meta-row"><span className="label">Delivery:</span> {data.delivery_date}</div>
                                </div>
                            </div>

                            <div className="print-meta-grid">
                                <div className="meta-box">
                                    <h3>Bill To:</h3>
                                    <p><strong>{customers.find(c => c.id == data.customer_id)?.name_en}</strong></p>
                                    {/* Add address if available */}
                                </div>
                                <div className="meta-box">
                                    <h3>Ship To:</h3>
                                    <p>{data.shipping_method}</p>
                                    <p>{customerAddresses.find(a => a.id == data.shipping_address_id)?.address_line_1}</p>
                                </div>
                            </div>

                            <table className="print-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Item</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, i) => (
                                        <tr key={i}>
                                            <td>{i+1}</td>
                                            <td>
                                                <strong>{products.find(p => p.id == item.product_id)?.name_en}</strong><br/>
                                                <small>{item.item_name_ar}</small>
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
                                <div className="notes-section">
                                    <h4>Notes:</h4>
                                    <p>{data.customer_notes}</p>
                                </div>
                                <div className="signatures">
                                    <div className="sign-box">Authorized Signature</div>
                                    <div className="sign-box">Customer Signature</div>
                                </div>
                            </div>
                        </div>

                    </form>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
