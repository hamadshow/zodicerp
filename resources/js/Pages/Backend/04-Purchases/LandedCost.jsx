import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

export default function LandedCost({ landedCosts, invoices, sourceAccounts }) {
    const [invoiceId, setInvoiceId] = useState('');
    const form = useForm({
        purchase_invoice_id: '',
        total_amount: '',
        credit_source_type: 'ap',
        credit_account_id: '',
        posting_date: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const submit = (event) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, purchase_invoice_id: invoiceId })).post(
            route('admin.purchases.landed-costs.store'),
        );
    };

    return (
        <AdminLayout>
            <Head title="Landed Costs" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Landed Costs</h1>
                    <p className="text-sm text-gray-500">Capitalize received purchase costs using weighted average inventory valuation.</p>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 grid gap-4 md:grid-cols-5">
                    <select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} required className="border rounded px-3 py-2">
                        <option value="">Purchase invoice</option>
                        {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {invoice.supplier?.name_en || invoice.supplier?.name_ar || ''}</option>)}
                    </select>
                    <input type="number" min="0.01" step="0.01" required placeholder="Total amount" value={form.data.total_amount} onChange={(event) => form.setData('total_amount', event.target.value)} className="border rounded px-3 py-2" />
                    <select value={form.data.credit_source_type} onChange={(event) => form.setData('credit_source_type', event.target.value)} className="border rounded px-3 py-2">
                        <option value="ap">AP</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="payment_source">Payment source</option>
                    </select>
                    <select value={form.data.credit_account_id} onChange={(event) => form.setData('credit_account_id', event.target.value)} required className="border rounded px-3 py-2">
                        <option value="">Credit account</option>
                        {sourceAccounts.map((account) => <option key={account.AccID} value={account.AccID}>{account.AccCode} - {account.AccName}</option>)}
                    </select>
                    <button type="submit" disabled={form.processing} className="bg-blue-600 text-white rounded px-4 py-2">Create draft</button>
                </form>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead><tr className="border-b text-left"><th className="p-3">Reference</th><th className="p-3">Invoice</th><th className="p-3">Amount</th><th className="p-3">Allocated</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                        <tbody>
                            {landedCosts.data.map((cost) => (
                                <tr key={cost.id} className="border-b">
                                    <td className="p-3">{cost.reference_number}</td><td className="p-3">{cost.purchase_invoice?.invoice_number || '-'}</td><td className="p-3">{cost.total_amount}</td><td className="p-3">{cost.allocated_amount}</td><td className="p-3">{cost.status}</td>
                                    <td className="p-3 flex gap-2">
                                        {cost.status === 'draft' && <button onClick={() => router.post(route('admin.purchases.landed-costs.allocate', cost.id))} className="text-blue-700">Allocate</button>}
                                        {cost.status === 'allocated' && <button onClick={() => router.post(route('admin.purchases.landed-costs.post', cost.id))} className="text-green-700">Post</button>}
                                        {cost.status === 'posted' && <button onClick={() => router.post(route('admin.purchases.landed-costs.reverse', cost.id))} className="text-red-700">Reverse</button>}
                                        {cost.status !== 'posted' && cost.status !== 'cancelled' && <button onClick={() => router.post(route('admin.purchases.landed-costs.cancel', cost.id))} className="text-gray-700">Cancel</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
