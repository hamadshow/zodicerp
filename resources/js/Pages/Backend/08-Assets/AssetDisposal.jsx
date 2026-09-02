import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function AssetDisposal({ disposals, assets }) {
    const [showCreate, setShowCreate] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        asset_id: '', disposal_date: new Date().toISOString().split('T')[0],
        disposal_type: 'sale', disposal_proceeds: 0, reason: '', notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.assets.disposal.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    return (
        <div className="p-6">
            <Head title="Asset Disposal" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Asset Disposals</h1>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ New Disposal</button>
            </div>
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Dispose Asset</h2>
                        <form onSubmit={submit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Asset *</label>
                                    <select value={data.asset_id} onChange={e => setData('asset_id', e.target.value)} className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Select Asset</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Date *</label>
                                        <input type="date" value={data.disposal_date} onChange={e => setData('disposal_date', e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type</label>
                                        <select value={data.disposal_type} onChange={e => setData('disposal_type', e.target.value)} className="w-full border rounded-lg px-3 py-2">
                                            <option value="sale">Sale</option>
                                            <option value="scrap">Scrap</option>
                                            <option value="donation">Donation</option>
                                            <option value="destroyed">Destroyed</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Disposal Proceeds *</label>
                                    <input type="number" step="0.01" value={data.disposal_proceeds} onChange={e => setData('disposal_proceeds', parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">Dispose</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50"><tr>
                        <th className="p-3 text-left">Asset</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Proceeds</th><th className="p-3 text-right">Gain/Loss</th>
                    </tr></thead>
                    <tbody>
                        {disposals.data?.map((d, i) => (
                            <tr key={i} className="border-t"><td className="p-3">{d.name}</td><td className="p-3">{d.disposal_date}</td><td className="p-3 capitalize">{d.disposal_type}</td><td className="p-3 text-right">{parseFloat(d.disposal_proceeds).toFixed(2)}</td><td className={`p-3 text-right ${d.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseFloat(d.gain_loss).toFixed(2)}</td></tr>
                        ))}
                        {(!disposals.data || disposals.data.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No disposals.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
