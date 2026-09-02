import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function AssetMovement({ movements, assets, warehouses }) {
    const [showCreate, setShowCreate] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        asset_id: '', movement_date: new Date().toISOString().split('T')[0],
        to_warehouse_id: '', reason: '', notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.assets.movements.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    return (
        <div className="p-6">
            <Head title="Asset Movements" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Asset Movements</h1>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ New Movement</button>
            </div>
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Record Asset Movement</h2>
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
                                        <input type="date" value={data.movement_date} onChange={e => setData('movement_date', e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">To Warehouse</label>
                                        <select value={data.to_warehouse_id} onChange={e => setData('to_warehouse_id', e.target.value)} className="w-full border rounded-lg px-3 py-2">
                                            <option value="">Select</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Reason</label>
                                    <input type="text" value={data.reason} onChange={e => setData('reason', e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Record Movement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50"><tr>
                        <th className="p-3 text-left">Date</th><th className="p-3 text-left">Asset</th><th className="p-3 text-left">To Warehouse</th><th className="p-3 text-left">Reason</th>
                    </tr></thead>
                    <tbody>
                        {movements.data?.map((m, i) => (
                            <tr key={i} className="border-t"><td className="p-3">{m.movement_date}</td><td className="p-3">{m.name}</td><td className="p-3">{m.to_warehouse_id || '-'}</td><td className="p-3">{m.reason || '-'}</td></tr>
                        ))}
                        {(!movements.data || movements.data.length === 0) && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No movements.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
