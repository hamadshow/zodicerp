import React from 'react';
import { Head } from '@inertiajs/react';

export default function AssetRevaluation({ revaluations }) {
    return (
        <div className="p-6">
            <Head title="Asset Revaluation" />
            <h1 className="text-2xl font-bold mb-6">Asset Revaluation</h1>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <p className="text-gray-600">Asset revaluation allows you to adjust the carrying amount of assets to their fair value. Select an asset and enter the new fair value to record a revaluation.</p>
                <p className="text-gray-500 text-sm mt-2">Revaluation functionality requires careful accounting consideration. Contact your accountant before using this feature.</p>
            </div>
            {revaluations.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <h2 className="p-4 font-bold border-b">Revaluation History</h2>
                    <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Asset</th><th className="p-3 text-right">Previous Value</th><th className="p-3 text-right">New Value</th><th className="p-3 text-right">Gain/Loss</th></tr></thead>
                        <tbody>{revaluations.map((r, i) => (
                            <tr key={i} className="border-t"><td className="p-3">{r.asset_name || '-'}</td><td className="p-3 text-right">{r.previous_value}</td><td className="p-3 text-right">{r.new_value}</td><td className="p-3 text-right">{r.gain_loss}</td></tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
