import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';

export default function StockAdjustment({ adjustments, warehouses, products, units }) {
    const [showCreate, setShowCreate] = useState(false);
    const [stockCardModal, setStockCardModal] = useState(false);
    const [stockCardData, setStockCardData] = useState([]);
    const [stockCardProduct, setStockCardProduct] = useState('');

    const { data, setData, post, processing, reset } = useForm({
        warehouse_id: '',
        adjustment_date: new Date().toISOString().split('T')[0],
        reason: 'correction',
        description: '',
        items: [{ product_id: '', unit_id: '', adjustment_quantity: 0, unit_cost: 0, reason: '', notes: '' }],
    });

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', unit_id: '', adjustment_quantity: 0, unit_cost: 0, reason: '', notes: '' }]);
    };

    const removeItem = (idx) => {
        setData('items', data.items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx, field, value) => {
        const items = [...data.items];
        items[idx][field] = value;
        setData('items', items);
    };

    const submitAdjustment = (e) => {
        e.preventDefault();
        post(route('admin.inventory.stock-adjustments.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    const approveAdjustment = (id) => {
        if (confirm('Approve this adjustment? This will modify stock quantities.')) {
            router.post(route('admin.inventory.stock-adjustments.approve', id));
        }
    };

    const loadStockCard = async (productId) => {
        setStockCardProduct(productId);
        try {
            const response = await fetch(route('admin.inventory.stock-card') + '?product_id=' + productId);
            const data = await response.json();
            setStockCardData(data);
            setStockCardModal(true);
        } catch {
            alert('Failed to load stock card');
        }
    };

    const statusColor = (status) => ({
        draft: 'bg-gray-100 text-gray-800',
        approved: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100');

    return (
        <div className="p-6">
            <Head title="Stock Adjustments" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Stock Adjustments</h1>
                <div className="flex gap-2">
                    <button onClick={() => setStockCardModal(true)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Stock Card</button>
                    <button onClick={() => setShowCreate(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Adjustment</button>
                </div>
            </div>

            {/* Stock Card Modal */}
            {stockCardModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Stock Card</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Select Product</label>
                            <select value={stockCardProduct} onChange={e => loadStockCard(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2">
                                <option value="">Select Product</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name_ar} ({p.sku})</option>)}
                            </select>
                        </div>
                        {stockCardData.length > 0 && (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 text-left">Date</th>
                                        <th className="p-2 text-left">Type</th>
                                        <th className="p-2 text-left">Reference</th>
                                        <th className="p-2 text-right">In</th>
                                        <th className="p-2 text-right">Out</th>
                                        <th className="p-2 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockCardData.map((row, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2">{row.date}</td>
                                            <td className="p-2">{row.type}</td>
                                            <td className="p-2">{row.reference}</td>
                                            <td className="p-2 text-right text-green-600">{row.quantity_in > 0 ? row.quantity_in : ''}</td>
                                            <td className="p-2 text-right text-red-600">{row.quantity_out > 0 ? row.quantity_out : ''}</td>
                                            <td className="p-2 text-right font-medium">{row.balance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => { setStockCardModal(false); setStockCardData([]); }}
                                className="px-4 py-2 border rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">New Stock Adjustment</h2>
                        <form onSubmit={submitAdjustment}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Warehouse *</label>
                                    <select value={data.warehouse_id} onChange={e => setData('warehouse_id', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Select</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date *</label>
                                    <input type="date" value={data.adjustment_date} onChange={e => setData('adjustment_date', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Reason *</label>
                                    <select value={data.reason} onChange={e => setData('reason', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="correction">Correction</option>
                                        <option value="damage">Damage</option>
                                        <option value="expiring">Expiring</option>
                                        <option value="found">Found</option>
                                        <option value="lost">Lost</option>
                                        <option value="theft">Theft</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Items</h3>
                                    <button type="button" onClick={addItem}
                                        className="text-blue-600 hover:text-blue-800 text-sm">+ Add Item</button>
                                </div>
                                {data.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-5 gap-2 mb-2 p-2 bg-gray-50 rounded">
                                        <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}
                                            className="border rounded px-2 py-1">
                                            <option value="">Product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                                        </select>
                                        <select value={item.unit_id} onChange={e => updateItem(idx, 'unit_id', e.target.value)}
                                            className="border rounded px-2 py-1">
                                            <option value="">Unit</option>
                                            {units.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                                        </select>
                                        <input type="number" step="0.01" placeholder="Qty (+/-)" value={item.adjustment_quantity}
                                            onChange={e => updateItem(idx, 'adjustment_quantity', parseFloat(e.target.value) || 0)}
                                            className="border rounded px-2 py-1" />
                                        <input type="number" step="0.01" placeholder="Unit Cost" value={item.unit_cost}
                                            onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                            className="border rounded px-2 py-1" />
                                        <button type="button" onClick={() => removeItem(idx)}
                                            className="text-red-500 hover:text-red-700">Remove</button>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2" rows={2} />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setShowCreate(false); reset(); }}
                                    className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                                    {processing ? 'Creating...' : 'Create Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjustments List */}
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Adjustment #</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-left">Reason</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustments.data?.map(adj => (
                            <tr key={adj.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-medium">{adj.adjustment_number}</td>
                                <td className="p-3">{adj.adjustment_date}</td>
                                <td className="p-3 capitalize">{adj.reason}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(adj.status)}`}>
                                        {adj.status}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex gap-1 justify-center">
                                        {adj.status === 'draft' && (
                                            <>
                                                <button onClick={() => approveAdjustment(adj.id)}
                                                    className="text-green-600 text-xs px-2 py-1 bg-green-50 rounded">Approve</button>
                                                <button onClick={() => router.post(route('admin.inventory.stock-adjustments.cancel', adj.id))}
                                                    className="text-red-600 text-xs px-2 py-1 bg-red-50 rounded">Cancel</button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(!adjustments.data || adjustments.data.length === 0) && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No adjustments found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
