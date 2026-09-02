import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';

export default function FiscalPeriods({ fiscalYears, periods }) {
    const [showCreate, setShowCreate] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        start_date: '',
        end_date: '',
    });

    const submitFiscalYear = (e) => {
        e.preventDefault();
        post(route('admin.fiscal-periods.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    const statusColor = (status) => ({
        draft: 'bg-gray-100 text-gray-800',
        open: 'bg-green-100 text-green-800',
        closed: 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100');

    return (
        <div className="p-6">
            <Head title="Fiscal Periods" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Fiscal Years & Accounting Periods</h1>
                <button onClick={() => setShowCreate(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Fiscal Year</button>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">New Fiscal Year</h2>
                        <form onSubmit={submitFiscalYear}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name *</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                        placeholder="e.g. FY 2026" className="w-full border rounded-lg px-3 py-2" />
                                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Date *</label>
                                        <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Date *</label>
                                        <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => { setShowCreate(false); reset(); }}
                                    className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                                    {processing ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Fiscal Years */}
            <div className="bg-white rounded-lg shadow mb-6">
                <h2 className="p-4 font-bold border-b">Fiscal Years</h2>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Start</th>
                            <th className="p-3 text-left">End</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fiscalYears.map(fy => (
                            <tr key={fy.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-medium">{fy.name}</td>
                                <td className="p-3">{fy.start_date}</td>
                                <td className="p-3">{fy.end_date}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(fy.status)}`}>
                                        {fy.status}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    {fy.status === 'draft' && (
                                        <button onClick={() => router.post(route('admin.fiscal-periods.open', fy.id))}
                                            className="text-green-600 text-xs px-2 py-1 bg-green-50 rounded mr-1">Open</button>
                                    )}
                                    {fy.status === 'open' && (
                                        <button onClick={() => { if (confirm('Close fiscal year? All periods will be locked.')) {
                                            router.post(route('admin.fiscal-periods.close', fy.id));
                                        }}}
                                            className="text-red-600 text-xs px-2 py-1 bg-red-50 rounded">Close</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {fiscalYears.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No fiscal years created yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Accounting Periods */}
            <div className="bg-white rounded-lg shadow">
                <h2 className="p-4 font-bold border-b">Accounting Periods</h2>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Period</th>
                            <th className="p-3 text-left">Start</th>
                            <th className="p-3 text-left">End</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periods.map(p => (
                            <tr key={p.id} className="border-t hover:bg-gray-50">
                                <td className="p-3">{p.name}</td>
                                <td className="p-3">{p.start_date}</td>
                                <td className="p-3">{p.end_date}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    {p.status === 'open' ? (
                                        <button onClick={() => router.post(route('admin.fiscal-periods.period.close', p.id))}
                                            className="text-red-600 text-xs px-2 py-1 bg-red-50 rounded">Close</button>
                                    ) : (
                                        <button onClick={() => router.post(route('admin.fiscal-periods.period.reopen', p.id))}
                                            className="text-blue-600 text-xs px-2 py-1 bg-blue-50 rounded">Reopen</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
