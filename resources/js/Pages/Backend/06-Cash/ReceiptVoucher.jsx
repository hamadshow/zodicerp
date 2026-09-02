import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function ReceiptVoucher({ vouchers, customers, currencies, openInvoices }) {
    const [showCreate, setShowCreate] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        customer_id: '',
        currency_id: '',
        exchange_rate: 1,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        amount: 0,
        payment_type: 'invoice_payment',
        bank_account_id: '',
        reference_number: '',
        description: '',
        status: 'posted',
        notes: '',
        allocations: [],
    });

    const handleCustomerChange = (customerId) => {
        setData('customer_id', customerId);
        const customerInvoices = openInvoices.filter(inv => inv.customer_id == customerId);
        setData('allocations', customerInvoices.map(inv => ({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            total_amount: inv.total_amount,
            paid_amount: inv.paid_amount,
            balance: inv.total_amount - inv.paid_amount,
            allocated_amount: 0,
        })));
    };

    const submitReceipt = (e) => {
        e.preventDefault();
        post(route('admin.receipt-vouchers.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    const statusColor = (status) => ({
        draft: 'bg-gray-100 text-gray-800',
        posted: 'bg-blue-100 text-blue-800',
        reconciled: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100');

    return (
        <div className="p-6">
            <Head title="Receipt Vouchers" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Receipt Vouchers (Customer Payments)</h1>
                <button onClick={() => setShowCreate(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Receipt</button>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">New Receipt Voucher</h2>
                        <form onSubmit={submitReceipt}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Customer *</label>
                                    <select value={data.customer_id} onChange={e => handleCustomerChange(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Select Customer</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={e => setData('amount', parseFloat(e.target.value) || 0)}
                                        className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Payment Method *</label>
                                    <select value={data.payment_method} onChange={e => setData('payment_method', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="credit_card">Credit Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Payment Date *</label>
                                    <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Currency</label>
                                    <select value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Select</option>
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Reference</label>
                                    <input type="text" value={data.reference_number} onChange={e => setData('reference_number', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>

                            {data.allocations.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Invoice Allocation</h3>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 text-left">Invoice #</th>
                                                <th className="p-2 text-right">Total</th>
                                                <th className="p-2 text-right">Paid</th>
                                                <th className="p-2 text-right">Balance</th>
                                                <th className="p-2 text-right">Allocate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.allocations.map((alloc, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-2">{alloc.invoice_number}</td>
                                                    <td className="p-2 text-right">{parseFloat(alloc.total_amount).toFixed(2)}</td>
                                                    <td className="p-2 text-right">{parseFloat(alloc.paid_amount).toFixed(2)}</td>
                                                    <td className="p-2 text-right">{parseFloat(alloc.balance).toFixed(2)}</td>
                                                    <td className="p-2 text-right">
                                                        <input type="number" step="0.01" min="0" max={alloc.balance}
                                                            value={alloc.allocated_amount}
                                                            onChange={e => {
                                                                const allocs = [...data.allocations];
                                                                allocs[idx].allocated_amount = parseFloat(e.target.value) || 0;
                                                                setData('allocations', allocs);
                                                            }}
                                                            className="w-28 border rounded px-2 py-1 text-right" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setShowCreate(false); reset(); }}
                                    className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                                    {processing ? 'Saving...' : 'Create Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Payment #</th>
                            <th className="p-3 text-left">Customer</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-left">Method</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchers.data?.map(v => (
                            <tr key={v.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-medium">{v.payment_number}</td>
                                <td className="p-3">{v.customer?.name_ar || '-'}</td>
                                <td className="p-3">{v.payment_date}</td>
                                <td className="p-3 capitalize">{v.payment_method?.replace('_', ' ')}</td>
                                <td className="p-3 text-right">{parseFloat(v.amount).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(v.status)}`}>
                                        {v.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(!vouchers.data || vouchers.data.length === 0) && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No receipt vouchers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
