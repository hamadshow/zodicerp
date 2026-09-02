import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';

export default function DepreciationSchedule({ assets, schedule }) {
    const { data, setData } = useForm({
        asset_id: '',
        as_of_date: new Date().toISOString().split('T')[0],
    });

    const loadSchedule = (e) => {
        e.preventDefault();
        router.get(route('admin.assets.depreciation.schedule'), { asset_id: data.asset_id }, { preserveState: true });
    };

    const runDepreciation = () => {
        if (confirm('Run depreciation for all active assets?')) {
            router.post(route('admin.assets.depreciation.run.post'), { as_of_date: data.as_of_date });
        }
    };

    return (
        <div className="p-6">
            <Head title="Depreciation Schedule" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Depreciation Schedule</h1>
                <button onClick={runDepreciation} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    Run Bulk Depreciation
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <form onSubmit={loadSchedule} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Asset</label>
                        <select value={data.asset_id} onChange={e => setData('asset_id', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2">
                            <option value="">Select Asset</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">As of Date</label>
                        <input type="date" value={data.as_of_date} onChange={e => setData('as_of_date', e.target.value)}
                            className="border rounded-lg px-3 py-2" />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">View Schedule</button>
                </form>
            </div>

            {schedule && schedule.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-center">Year</th>
                                <th className="p-3 text-right">Opening Value</th>
                                <th className="p-3 text-right">Depreciation</th>
                                <th className="p-3 text-right">Accumulated</th>
                                <th className="p-3 text-right">Closing Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedule.map(row => (
                                <tr key={row.year} className="border-t hover:bg-gray-50">
                                    <td className="p-3 text-center">{row.year}</td>
                                    <td className="p-3 text-right">{row.opening_book_value.toFixed(2)}</td>
                                    <td className="p-3 text-right text-red-600">{row.depreciation.toFixed(2)}</td>
                                    <td className="p-3 text-right">{row.accumulated_depreciation.toFixed(2)}</td>
                                    <td className="p-3 text-right font-medium">{row.closing_book_value.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
