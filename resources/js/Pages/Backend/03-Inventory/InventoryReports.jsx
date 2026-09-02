import React from 'react';
import { Head } from '@inertiajs/react';

export default function InventoryReports() {
    return (
        <div className="p-6">
            <Head title="Inventory Reports" />
            <h1 className="text-2xl font-bold mb-6">Inventory Reports</h1>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                    <h3 className="font-bold text-lg mb-2">Stock by Warehouse</h3>
                    <p className="text-gray-600 mb-4">View current stock levels broken down by warehouse.</p>
                    <p className="text-sm text-gray-500">Available via Stock Adjustments → Stock Card</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                    <h3 className="font-bold text-lg mb-2">Stock Card</h3>
                    <p className="text-gray-600 mb-4">Track all movements for a specific product with running balance.</p>
                    <p className="text-sm text-gray-500">Available via Stock Adjustments → Stock Card</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                    <h3 className="font-bold text-lg mb-2">Movement Report</h3>
                    <p className="text-gray-600 mb-4">View all inventory movements (in/out) by date range and type.</p>
                    <p className="text-sm text-gray-500">Coming in next phase</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                    <h3 className="font-bold text-lg mb-2">Inventory Valuation</h3>
                    <p className="text-gray-600 mb-4">Calculate total inventory value by product and warehouse.</p>
                    <p className="text-sm text-blue-500">Available in Financial Reports → Inventory Valuation</p>
                </div>
            </div>
        </div>
    );
}
