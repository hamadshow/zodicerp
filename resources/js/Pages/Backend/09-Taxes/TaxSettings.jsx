import React from 'react';
import { Head } from '@inertiajs/react';

export default function TaxSettings() {
    return (
        <div className="p-6">
            <Head title="Tax Settings" />
            <h1 className="text-2xl font-bold mb-6">Tax Settings</h1>
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-lg mb-4">Tax Configuration</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Default Tax Behavior</h4>
                        <p className="text-gray-600 text-sm">Configure how taxes are applied to sales and purchase invoices by default.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Tax Accounts</h4>
                        <p className="text-gray-600 text-sm">Map tax types to their respective GL accounts for input tax and output tax.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Tax Periods</h4>
                        <p className="text-gray-600 text-sm">Manage tax filing periods and deadlines.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
