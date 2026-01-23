import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import '../../../../../css/backend/04-Purchases/style.scss';

const Create = ({ suppliers = [], currencies = [], warehouses = [] }) => {
    const { data, setData, post, processing, errors } = useForm({
        quotation_number: '',
        supplier_id: '',
        currency_id: '',
        exchange_rate: 1,
        quotation_date: '',
        expiry_date: '',
        valid_days: '',
        warehouse_id: '',
        subtotal: '',
        discount_percentage: '',
        discount_amount: '',
        tax_amount: '',
        shipping_cost: '',
        total_amount: '',
        status: 'draft',
        approval_notes: '',
        sent_date: '',
        sent_method: '',
        notes: '',
    });

    useEffect(() => {
        const subtotal = Number(data.subtotal || 0);
        const discount = Number(data.discount_amount || 0);
        const tax = Number(data.tax_amount || 0);
        const shipping = Number(data.shipping_cost || 0);
        const total = Math.max(0, subtotal - discount + tax + shipping);
        setData('total_amount', total.toFixed(2));
    }, [data.subtotal, data.discount_amount, data.tax_amount, data.shipping_cost]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.purchases.quotations.store'));
    };

    return (
        <AdminLayout activeMenu="Purchase Management">
            <Head title="Create Purchase Quotation" />
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Create Purchase Quotation</h1>
                    <Link
                        href={route('admin.purchases.quotations.index')}
                        className="btn btn-outline"
                    >
                        <span className="material-icons-outlined text-sm">arrow_back</span>
                        Back to List
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number *</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.quotation_number ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.quotation_number}
                                    onChange={(e) => setData('quotation_number', e.target.value)}
                                />
                                {errors.quotation_number && <div className="text-red-500 text-xs mt-1">{errors.quotation_number}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date *</label>
                                <input
                                    type="date"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.quotation_date ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.quotation_date}
                                    onChange={(e) => setData('quotation_date', e.target.value)}
                                />
                                {errors.quotation_date && <div className="text-red-500 text-xs mt-1">{errors.quotation_date}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.expiry_date ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.expiry_date}
                                    onChange={(e) => setData('expiry_date', e.target.value)}
                                />
                                {errors.expiry_date && <div className="text-red-500 text-xs mt-1">{errors.expiry_date}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Days</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.valid_days ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.valid_days}
                                    onChange={(e) => setData('valid_days', e.target.value)}
                                />
                                {errors.valid_days && <div className="text-red-500 text-xs mt-1">{errors.valid_days}</div>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                                <select
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier_id ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.supplier_id}
                                    onChange={(e) => setData('supplier_id', e.target.value)}
                                >
                                    <option value="">Select supplier</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name_ar || supplier.name_en} ({supplier.supplier_code})
                                        </option>
                                    ))}
                                </select>
                                {errors.supplier_id && <div className="text-red-500 text-xs mt-1">{errors.supplier_id}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                                <select
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currency_id ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.currency_id}
                                    onChange={(e) => setData('currency_id', e.target.value)}
                                >
                                    <option value="">Select currency</option>
                                    {currencies.map((currency) => (
                                        <option key={currency.id} value={currency.id}>
                                            {currency.code} - {currency.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.currency_id && <div className="text-red-500 text-xs mt-1">{errors.currency_id}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate *</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.exchange_rate ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.exchange_rate}
                                    onChange={(e) => setData('exchange_rate', e.target.value)}
                                />
                                {errors.exchange_rate && <div className="text-red-500 text-xs mt-1">{errors.exchange_rate}</div>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                            <select
                                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.warehouse_id ? 'border-red-500' : 'border-gray-300'}`}
                                value={data.warehouse_id}
                                onChange={(e) => setData('warehouse_id', e.target.value)}
                            >
                                <option value="">Select warehouse</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                    </option>
                                ))}
                            </select>
                            {errors.warehouse_id && <div className="text-red-500 text-xs mt-1">{errors.warehouse_id}</div>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.subtotal ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.subtotal}
                                    onChange={(e) => setData('subtotal', e.target.value)}
                                />
                                {errors.subtotal && <div className="text-red-500 text-xs mt-1">{errors.subtotal}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.discount_percentage ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.discount_percentage}
                                    onChange={(e) => setData('discount_percentage', e.target.value)}
                                />
                                {errors.discount_percentage && <div className="text-red-500 text-xs mt-1">{errors.discount_percentage}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.discount_amount ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.discount_amount}
                                    onChange={(e) => setData('discount_amount', e.target.value)}
                                />
                                {errors.discount_amount && <div className="text-red-500 text-xs mt-1">{errors.discount_amount}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.tax_amount ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.tax_amount}
                                    onChange={(e) => setData('tax_amount', e.target.value)}
                                />
                                {errors.tax_amount && <div className="text-red-500 text-xs mt-1">{errors.tax_amount}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.shipping_cost ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.shipping_cost}
                                    onChange={(e) => setData('shipping_cost', e.target.value)}
                                />
                                {errors.shipping_cost && <div className="text-red-500 text-xs mt-1">{errors.shipping_cost}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.total_amount ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.total_amount}
                                    onChange={(e) => setData('total_amount', e.target.value)}
                                />
                                {errors.total_amount && <div className="text-red-500 text-xs mt-1">{errors.total_amount}</div>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                                <select
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="sent">Sent</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="expired">Expired</option>
                                    <option value="converted">Converted</option>
                                </select>
                                {errors.status && <div className="text-red-500 text-xs mt-1">{errors.status}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sent Date</label>
                                <input
                                    type="date"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.sent_date ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.sent_date}
                                    onChange={(e) => setData('sent_date', e.target.value)}
                                />
                                {errors.sent_date && <div className="text-red-500 text-xs mt-1">{errors.sent_date}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sent Method</label>
                                <select
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.sent_method ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.sent_method}
                                    onChange={(e) => setData('sent_method', e.target.value)}
                                >
                                    <option value="">Select method</option>
                                    <option value="email">Email</option>
                                    <option value="fax">Fax</option>
                                    <option value="hand">Hand</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.sent_method && <div className="text-red-500 text-xs mt-1">{errors.sent_method}</div>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes</label>
                                <textarea
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.approval_notes ? 'border-red-500' : 'border-gray-300'}`}
                                    rows="3"
                                    value={data.approval_notes}
                                    onChange={(e) => setData('approval_notes', e.target.value)}
                                />
                                {errors.approval_notes && <div className="text-red-500 text-xs mt-1">{errors.approval_notes}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.notes ? 'border-red-500' : 'border-gray-300'}`}
                                    rows="3"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                />
                                {errors.notes && <div className="text-red-500 text-xs mt-1">{errors.notes}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Summary</h2>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center justify-between">
                                    <span>Subtotal</span>
                                    <span>{Number(data.subtotal || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Discount</span>
                                    <span>{Number(data.discount_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Tax</span>
                                    <span>{Number(data.tax_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Shipping</span>
                                    <span>{Number(data.shipping_cost || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between font-semibold text-gray-800">
                                    <span>Total</span>
                                    <span>{Number(data.total_amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="btn btn-primary w-full"
                            >
                                {processing ? 'Saving...' : 'Save Quotation'}
                            </button>
                            <Link
                                href={route('admin.purchases.quotations.index')}
                                className="btn btn-outline w-full"
                            >
                                Cancel
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default Create;
