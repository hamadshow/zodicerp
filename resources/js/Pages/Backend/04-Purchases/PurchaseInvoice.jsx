import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import '../../../../css/backend/04-Purchases/PurchaseInvoice.scss';

export default function PurchaseInvoice({ invoices, suppliers, orders, currencies, products, paymentTerms }) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const [activeTab, setActiveTab] = useState('general');
    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};
    const { errors } = props;

    const productOptions = useMemo(() => {
        return (products || []).map(p => ({
            id: String(p.id),
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
        supplier_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        invoice_type: 'standard', // standard, proforma, credit_note, debit_note
        payment_status: 'unpaid', // unpaid, partial, paid, overdue
        notes: '',
        
        // Financials
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_cost: 0,
        other_costs: 0,
        total_amount: 0,
        paid_amount: 0,
        balance_amount: 0,

        // Items
        items: [],
        
        // Terms
        payment_terms_id: '',
    });

    // Helper to calculate totals
    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.discount_amount, data.shipping_cost, data.other_costs, data.tax_amount, data.paid_amount]);

    const handleCreate = () => {
        reset();
        const today = new Date();
        setData(prev => ({
            ...prev,
            invoice_date: today.toISOString().split('T')[0],
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
        setActiveTab('general');
    };

    const handleEdit = (invoice) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...invoice,
            items: (invoice.details || []).map(it => {
                const qty = toNum(it.quantity);
                const unitPrice = toNum(it.unit_price);
                const discountAmount = toNum(it.discount_amount); // Assuming details table has this or calculated
                const taxAmount = toNum(it.tax_amount); // Assuming details table has this or calculated
                
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
            other_costs: toNum(invoice.other_costs),
            total_amount: toNum(invoice.total_amount),
            paid_amount: toNum(invoice.paid_amount), // Assuming we have this field or relation
            balance_amount: toNum(invoice.balance_amount),
            exchange_rate: toNum(invoice.exchange_rate) || 1.000000,
        });
        setMode('edit');
        setActiveTab('general');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this invoice?')) {
            destroy(route('admin.purchases.invoices.destroy', { invoice: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const handleError = (errors) => {
            if (Object.keys(errors).some(k => k.startsWith('items.'))) {
                setActiveTab('items');
            } else if (Object.keys(errors).some(k => ['payment_terms_id'].includes(k))) {
                setActiveTab('terms');
            } else {
                setActiveTab('general');
            }
        };

        if (mode === 'create') {
            post(route('admin.purchases.invoices.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
                onError: handleError,
            });
        } else {
            put(route('admin.purchases.invoices.update', { invoice: data.id }), {
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
        const taxVal = parseFloat(newItems[index].tax_amount) || 0;

        const netPrice = (qty * price) - discAmount;
        // Assuming tax is added to this
        const total = netPrice + taxVal;
        
        newItems[index].line_total = total.toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        // Global calculations
        const globalDiscount = parseFloat(data.discount_amount) || 0;
        const shipping = parseFloat(data.shipping_cost) || 0;
        const other = parseFloat(data.other_costs) || 0;
        
        // Logic: Subtotal is sum of line totals (usually pre-tax, but here we reconstructed it)
        // Let's rely on line_total being (qty*price - item_discount + item_tax)
        // So subtotal should be just sum of (qty*price) for clarity? 
        // Or follow the template: subtotal = sum(line_total) - sum(tax). 
        // Wait, line_total = (qty * unit_price) - discount_amount + tax_amount
        // So line_total - tax_amount = (qty * unit_price) - discount_amount.
        // If we want "Gross Subtotal" before item discounts, we need to track that separately.
        // For now, let's just sum line totals and apply global modifiers.
        
        // Recalculate strictly:
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

        // Only update if values changed to avoid infinite loop
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
            <Head title="Purchase Invoices" />
            
            <div className="purchase-invoices-module">
                <div className="purchase-invoices-module__header">
                    <h1>Purchase Invoices</h1>
                    {mode === 'list' && (
                        <button className="btn-add" onClick={handleCreate}>
                            + Create Invoice
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
                    <div className="purchase-invoices-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Type</th>
                                    <th>Payment Status</th>
                                    <th>Total</th>
                                    <th>Balance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices?.data?.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td>{invoice.invoice_number}</td>
                                        <td>{invoice.invoice_date}</td>
                                        <td>{invoice.supplier?.name_en || invoice.supplier?.name_ar}</td>
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
                                        <td>{invoice.total_amount} {invoice.currency?.code}</td>
                                        <td>{invoice.balance_amount} {invoice.currency?.code}</td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(invoice)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(invoice.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {(!invoices?.data || invoices.data.length === 0) && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center' }}>No purchase invoices found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="purchase-invoices-module__form-container">
                        <div className="purchase-invoices-module__tabs">
                            {['general', 'items', 'terms'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="purchase-invoices-module__content">
                            {activeTab === 'general' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Invoice Number</label>
                                        <input
                                            type="text"
                                            value={data.invoice_number}
                                            onChange={e => setData('invoice_number', e.target.value)}
                                            className={errors.invoice_number ? 'error' : ''}
                                            placeholder="Auto-generated if empty"
                                        />
                                        {errors.invoice_number && <div className="error-msg">{errors.invoice_number}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>Invoice Date</label>
                                        <input
                                            type="date"
                                            value={data.invoice_date}
                                            onChange={e => setData('invoice_date', e.target.value)}
                                            className={errors.invoice_date ? 'error' : ''}
                                        />
                                        {errors.invoice_date && <div className="error-msg">{errors.invoice_date}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>Due Date</label>
                                        <input
                                            type="date"
                                            value={data.due_date}
                                            onChange={e => setData('due_date', e.target.value)}
                                            className={errors.due_date ? 'error' : ''}
                                        />
                                        {errors.due_date && <div className="error-msg">{errors.due_date}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>Supplier</label>
                                        <select
                                            value={data.supplier_id}
                                            onChange={e => setData('supplier_id', e.target.value)}
                                            className={errors.supplier_id ? 'error' : ''}
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliers?.map(s => (
                                                <option key={s.id} value={s.id}>{s.name_en || s.name_ar}</option>
                                            ))}
                                        </select>
                                        {errors.supplier_id && <div className="error-msg">{errors.supplier_id}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>Link Purchase Order</label>
                                        <select
                                            value={data.order_id}
                                            onChange={e => setData('order_id', e.target.value)}
                                            className={errors.order_id ? 'error' : ''}
                                        >
                                            <option value="">Select PO (Optional)</option>
                                            {orders?.map(o => (
                                                <option key={o.id} value={o.id}>{o.po_number}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Currency</label>
                                        <select
                                            value={data.currency_id}
                                            onChange={e => setData('currency_id', e.target.value)}
                                            className={errors.currency_id ? 'error' : ''}
                                        >
                                            <option value="">Select Currency</option>
                                            {currencies?.map(c => (
                                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
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
                                        <label>Invoice Type</label>
                                        <select
                                            value={data.invoice_type}
                                            onChange={e => setData('invoice_type', e.target.value)}
                                        >
                                            <option value="standard">Standard Invoice</option>
                                            <option value="proforma">Proforma Invoice</option>
                                            <option value="credit_note">Credit Note</option>
                                            <option value="debit_note">Debit Note</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Payment Status</label>
                                        <select
                                            value={data.payment_status}
                                            onChange={e => setData('payment_status', e.target.value)}
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partial">Partially Paid</option>
                                            <option value="paid">Paid</option>
                                            <option value="overdue">Overdue</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'items' && (
                                <div className="items-section">
                                    <table className="items-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Quantity</th>
                                                <th>Price</th>
                                                <th>Discount</th>
                                                <th>Tax</th>
                                                <th>Total</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <SearchableComboBox
                                                            options={productOptions}
                                                            value={item.product_id ? String(item.product_id) : ''}
                                                            onChange={(val) => handleItemChange(index, 'product_id', val)}
                                                            error={errors[`items.${index}.product_id`]}
                                                            placeholder="Select Product"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                            min="0.1"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={item.unit_price}
                                                            onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={item.discount_amount}
                                                            onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={item.tax_amount}
                                                            onChange={e => handleItemChange(index, 'tax_amount', e.target.value)}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td>
                                                        {item.line_total}
                                                    </td>
                                                    <td>
                                                        <button type="button" className="btn-remove" onClick={() => removeItem(index)}>X</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button type="button" className="btn-add-item" onClick={addItem}>+ Add Item</button>

                                    <div className="totals-section">
                                        <div className="total-row">
                                            <span>Subtotal</span>
                                            <span>{parseFloat(data.subtotal).toFixed(2)}</span>
                                        </div>
                                        <div className="total-row">
                                            <span>Tax</span>
                                            <span>{parseFloat(data.tax_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="total-row">
                                            <span>Discount (Global)</span>
                                            <input
                                                type="number"
                                                value={data.discount_amount}
                                                onChange={e => setData('discount_amount', e.target.value)}
                                                className="total-input"
                                            />
                                        </div>
                                        <div className="total-row">
                                            <span>Shipping Cost</span>
                                            <input
                                                type="number"
                                                value={data.shipping_cost}
                                                onChange={e => setData('shipping_cost', e.target.value)}
                                                className="total-input"
                                            />
                                        </div>
                                        <div className="total-row">
                                            <span>Other Costs</span>
                                            <input
                                                type="number"
                                                value={data.other_costs}
                                                onChange={e => setData('other_costs', e.target.value)}
                                                className="total-input"
                                            />
                                        </div>
                                        <div className="total-row grand-total">
                                            <span>Total Amount</span>
                                            <span>{parseFloat(data.total_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="total-row">
                                            <span>Paid Amount</span>
                                            <input
                                                type="number"
                                                value={data.paid_amount}
                                                onChange={e => setData('paid_amount', e.target.value)}
                                                className="total-input"
                                            />
                                        </div>
                                        <div className="total-row balance-due">
                                            <span>Balance Due</span>
                                            <span>{parseFloat(data.balance_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'terms' && (
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label>Payment Terms</label>
                                        <select
                                            value={data.payment_terms_id}
                                            onChange={e => setData('payment_terms_id', e.target.value)}
                                        >
                                            <option value="">Select Payment Terms</option>
                                            {paymentTerms?.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Notes</label>
                                        <textarea
                                            value={data.notes}
                                            onChange={e => setData('notes', e.target.value)}
                                            rows="4"
                                        ></textarea>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => setMode('list')}>Cancel</button>
                            <button type="submit" className="btn-submit" disabled={processing}>
                                {processing ? 'Saving...' : (mode === 'create' ? 'Create Invoice' : 'Update Invoice')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
