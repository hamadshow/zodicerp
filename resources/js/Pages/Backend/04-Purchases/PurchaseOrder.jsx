import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/04-Purchases/PurchaseOrder.scss';

export default function PurchaseOrder({ orders, vendors, currencies, products, units, paymentTerms, deliveryTerms }) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('general');
    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};
    const { errors } = props;

    // Initial Form State
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        po_number: '',
        po_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
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
    });

    // Helper to calculate totals
    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.discount_amount, data.shipping_charges, data.tax_amount]);

    const handleCreate = () => {
        reset();
        const today = new Date();
        setData(prev => ({
            ...prev,
            po_date: today.toISOString().split('T')[0],
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
        setActiveTab('general');
    };

    const handleEdit = (order) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...order,
            items: (order.items || []).map(it => {
                const qty = toNum(it.ordered_quantity);
                const unitPrice = toNum(it.unit_price);
                const discountAmount = toNum(it.discount_amount);
                const taxAmount = toNum(it.tax_total); // Note: using tax_total from backend
                
                const netPrice = unitPrice - discountAmount;
                const taxableAmount = qty * netPrice;
                
                let taxPercent = 0;
                if (taxableAmount > 0) {
                    taxPercent = (taxAmount / taxableAmount) * 100;
                }

                return {
                    ...it,
                    quantity: qty, // Map ordered_quantity to quantity for form
                    unit_price: unitPrice,
                    discount_amount: discountAmount,
                    tax_amount: taxAmount,
                    line_total: toNum(it.line_total),
                    unit_id: it.unit_id || '',
                    tax_percent: toNum(it.tax_percent) || taxPercent.toFixed(2)
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
        setActiveTab('general');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this purchase order?')) {
            destroy(route('admin.purchases.orders.destroy', { order: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const handleError = (errors) => {
            if (Object.keys(errors).some(k => k.startsWith('items.'))) {
                setActiveTab('items');
            } else if (Object.keys(errors).some(k => ['payment_terms_id', 'delivery_terms_id', 'shipping_method', 'shipping_address'].includes(k))) {
                setActiveTab('terms');
            } else {
                setActiveTab('general');
            }
        };

        if (mode === 'create') {
            post(route('admin.purchases.orders.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: handleError,
            });
        } else {
            put(route('admin.purchases.orders.update', { order: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: handleError,
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
                                        <td colSpan="6" style={{ textAlign: 'center' }}>No purchase orders found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="purchase-orders-module__form-container">
                        <div className="purchase-orders-module__tabs">
                            {['general', 'items', 'terms'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* GENERAL TAB */}
                        <div className={`purchase-orders-module__tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                            <div className="purchase-orders-module__grid">
                                <div className="form-group">
                                    <label>Order #</label>
                                    <input type="text" value={data.po_number} disabled placeholder="Auto-generated" />
                                </div>
                                <div className="form-group">
                                    <label>Date <span className="required">*</span></label>
                                    <input 
                                        type="date" 
                                        value={data.po_date} 
                                        onChange={e => setData('po_date', e.target.value)}
                                        className={errors.po_date ? 'error' : ''}
                                    />
                                    {errors.po_date && <span className="error-msg">{errors.po_date}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Expected Delivery</label>
                                    <input 
                                        type="date" 
                                        value={data.expected_delivery_date} 
                                        onChange={e => setData('expected_delivery_date', e.target.value)} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vendor <span className="required">*</span></label>
                                    <select 
                                        value={data.vendor_id} 
                                        onChange={e => {
                                            const selectedVendorId = e.target.value;
                                            const selectedVendor = vendors.find(v => v.id == selectedVendorId);
                                            setData(prev => ({
                                                ...prev,
                                                vendor_id: selectedVendorId,
                                                currency_id: selectedVendor?.currency_id || prev.currency_id
                                            }));
                                        }}
                                        className={errors.vendor_id ? 'error' : ''}
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name_en} - {v.name_ar}</option>
                                        ))}
                                    </select>
                                    {errors.vendor_id && <span className="error-msg">{errors.vendor_id}</span>}
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
                                <div className="form-group">
                                    <label>Exchange Rate <span className="required">*</span></label>
                                    <input 
                                        type="number" 
                                        step="0.000001" 
                                        value={data.exchange_rate} 
                                        onChange={e => setData('exchange_rate', e.target.value)}
                                        className={errors.exchange_rate ? 'error' : ''} 
                                    />
                                    {errors.exchange_rate && <span className="error-msg">{errors.exchange_rate}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Status <span className="required">*</span></label>
                                    <select 
                                        value={data.status} 
                                        onChange={e => setData('status', e.target.value)}
                                        className={errors.status ? 'error' : ''}
                                    >
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
                                <div className="form-group full-width">
                                    <label>Notes</label>
                                    <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows="3"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* ITEMS TAB */}
                        <div className={`purchase-orders-module__tab-content ${activeTab === 'items' ? 'active' : ''}`}>
                            <div className="items-table-container">
                                <table className="items-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th style={{width: '25%'}}>Product</th>
                                            <th>Quantity</th>
                                            <th>Unit</th>
                                            <th>Price</th>
                                            <th>Discount</th>
                                            <th>Tax %</th>
                                            <th>Total</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <select 
                                                        value={item.product_id} 
                                                        onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                                                        className={`input-sm ${errors[`items.${index}.product_id`] ? 'error' : ''}`}
                                                    >
                                                        <option value="">Select Product</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name_en}</option>
                                                        ))}
                                                    </select>
                                                    {errors[`items.${index}.product_id`] && <div className="error-msg">{errors[`items.${index}.product_id`]}</div>}
                                                    <input 
                                                        type="text" 
                                                        placeholder="Item Name (AR)" 
                                                        value={item.item_name_ar} 
                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                        className={`input-sm mt-1 ${errors[`items.${index}.item_name_ar`] ? 'error' : ''}`}
                                                    />
                                                    {errors[`items.${index}.item_name_ar`] && <div className="error-msg">{errors[`items.${index}.item_name_ar`]}</div>}
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        className={`input-sm ${errors[`items.${index}.quantity`] ? 'error' : ''}`}
                                                    />
                                                    {errors[`items.${index}.quantity`] && <div className="error-msg">{errors[`items.${index}.quantity`]}</div>}
                                                </td>
                                                <td>
                                                    <select 
                                                        value={item.unit_id} 
                                                        onChange={e => handleItemChange(index, 'unit_id', e.target.value)}
                                                        className={`input-sm ${errors[`items.${index}.unit_id`] ? 'error' : ''}`}
                                                    >
                                                        <option value="">Unit</option>
                                                        {units.map(u => <option key={u.id} value={u.id}>{u.name_en}</option>)}
                                                    </select>
                                                    {errors[`items.${index}.unit_id`] && <div className="error-msg">{errors[`items.${index}.unit_id`]}</div>}
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.unit_price} 
                                                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                        className={`input-sm ${errors[`items.${index}.unit_price`] ? 'error' : ''}`}
                                                    />
                                                    {errors[`items.${index}.unit_price`] && <div className="error-msg">{errors[`items.${index}.unit_price`]}</div>}
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.discount_amount} 
                                                        placeholder="Amt"
                                                        onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                        className="input-sm"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={item.tax_percent} 
                                                        placeholder="%"
                                                        onChange={e => handleItemChange(index, 'tax_percent', e.target.value)}
                                                        className="input-sm"
                                                    />
                                                </td>
                                                <td>{item.line_total}</td>
                                                <td>
                                                    <button type="button" className="btn-remove" onClick={() => removeItem(index)}>×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className="btn-add-item" onClick={addItem}>+ Add Item</button>
                            </div>
                            
                            <div className="totals-section">
                                <div className="total-row">
                                    <span>Subtotal:</span>
                                    <span>{Number(data.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>Tax:</span>
                                    <span>{Number(data.tax_amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>Discount:</span>
                                    <input 
                                        type="number" 
                                        value={data.discount_amount} 
                                        onChange={e => setData('discount_amount', e.target.value)}
                                        className="input-sm text-right"
                                    />
                                </div>
                                <div className="total-row">
                                    <span>Shipping:</span>
                                    <input 
                                        type="number" 
                                        value={data.shipping_charges} 
                                        onChange={e => setData('shipping_charges', e.target.value)}
                                        className="input-sm text-right"
                                    />
                                </div>
                                <div className="total-row grand-total">
                                    <span>Grand Total:</span>
                                    <span>{Number(data.grand_total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* TERMS TAB */}
                        <div className={`purchase-orders-module__tab-content ${activeTab === 'terms' ? 'active' : ''}`}>
                             <div className="purchase-orders-module__grid">
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
                                <div className="form-group">
                                    <label>Shipping Method</label>
                                    <input 
                                        type="text" 
                                        value={data.shipping_method} 
                                        onChange={e => setData('shipping_method', e.target.value)} 
                                        placeholder="e.g. Air Freight, Truck"
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Shipping Address</label>
                                    <textarea 
                                        value={data.shipping_address} 
                                        onChange={e => setData('shipping_address', e.target.value)} 
                                        rows="3"
                                    ></textarea>
                                </div>
                             </div>
                        </div>

                        <div className="purchase-orders-module__actions">
                            <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>Cancel</button>
                            <button type="submit" className="btn btn-save" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Order'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
