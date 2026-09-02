import React from 'react';
import { Head } from '@inertiajs/react';

export default function DepreciationReport({ report }) {
    return (
        <div className="p-6">
            <Head title="Depreciation Report" />
            <h1 className="text-2xl font-bold mb-6">Depreciation Report</h1>
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Asset</th>
                            <th className="p-3 text-right">Cost</th>
                            <th className="p-3 text-right">Total Depreciation</th>
                            <th className="p-3 text-right">Book Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.map((row, idx) => (
                            <tr key={idx} className="border-t hover:bg-gray-50">
                                <td className="p-3">{row.asset_name}</td>
                                <td className="p-3 text-right">{parseFloat(row.cost).toFixed(2)}</td>
                                <td className="p-3 text-right text-red-600">{parseFloat(row.total_depreciation).toFixed(2)}</td>
                                <td className="p-3 text-right font-medium">{(parseFloat(row.cost) - parseFloat(row.total_depreciation)).toFixed(2)}</td>
                            </tr>
                        ))}
                        {report.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No depreciation data.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
