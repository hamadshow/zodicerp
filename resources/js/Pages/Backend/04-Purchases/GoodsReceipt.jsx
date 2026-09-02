import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';

export default function GoodsReceipt({ receipts, purchaseOrders, warehouses }) {
    const [showCreate, setShowCreate] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        order_id: '',
        warehouse_id: '',
        receipt_date: new Date().toISOString().split('T')[0],
        receipt_type: 'partial',
        notes: '',
        items: [],
    });

    const handlePOSelect = (poId) => {
        const po = purchaseOrders.find(o => o.id == poId);
        setData('order_id', poId);
        if (po) {
            setData('items', (po.items || []).map(item => ({
                product_id: item.product_id,
                unit_id: item.unit_id,
                quantity_received: item.pending_quantity || item.ordered_quantity || 0,
                unit_cost: item.unit_price || 0,
                accepted_quantity: item.pending_quantity || item.ordered_quantity || 0,
                rejected_quantity: 0,
                quality_status: 'good',
                notes: '',
            })));
        }
    };

    const submitReceipt = (e) => {
        e.preventDefault();
        post(route('admin.purchases.goods-receipts.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    const approveReceipt = (id) => {
        if (confirm('Approve this receipt? This will update inventory.')) {
            router.post(route('admin.purchases.goods-receipts.approve', id));
        }
    };

    const receiveReceipt = (id) => {
        router.post(route('admin.purchases.goods-receipts.receive', id));
    };

    const cancelReceipt = (id) => {
        if (confirm('Cancel this receipt?')) {
            router.post(route('admin.purchases.goods-receipts.cancel', id));
        }
    };

    const statusColor = (status) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            received: 'bg-blue-100 text-blue-800',
            checked: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100';
    };

    return (
        <div className="p-6">
            <Head title="Goods Receipts" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Goods Receipts (GRN)</h1>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    + New Receipt
                </button>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">New Goods Receipt</h2>
                        <form onSubmit={submitReceipt}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Purchase Order *</label>
                                    <select value={data.order_id} onChange={e => handlePOSelect(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Select PO</option>
                                        {purchaseOrders.map(po => (
                                            <option key={po.id} value={po.id}>
                                                {po.po_number} - {po.vendor?.name_ar}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.order_id && <p className="text-red-500 text-xs">{errors.order_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Warehouse *</label>
                                    <select value={data.warehouse_id} onChange={e => setData('warehouse_id', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Receipt Date *</label>
                                    <input type="date" value={data.receipt_date} onChange={e => setData('receipt_date', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>

                            {data.items.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Items</h3>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 text-left">Product</th>
                                                <th className="p-2">Ordered</th>
                                                <th className="p-2">Received</th>
                                                <th className="p-2">Accepted</th>
                                                <th className="p-2">Rejected</th>
                                                <th className="p-2">Unit Cost</th>
                                                <th className="p-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map((item, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-2">
                                                        {purchaseOrders.find(po => po.id == data.order_id)?.items?.find(i => i.product_id === item.product_id)?.item_name_ar || `Product ${item.product_id}`}
                                                    </td>
                                                    <td className="p-2 text-center">{item.quantity_received}</td>
                                                    <td className="p-2">
                                                        <input type="number" step="0.01" value={item.quantity_received}
                                                            onChange={e => {
                                                                const items = [...data.items];
                                                                items[idx].quantity_received = parseFloat(e.target.value) || 0;
                                                                items[idx].accepted_quantity = items[idx].quantity_received - items[idx].rejected_quantity;
                                                                setData('items', items);
                                                            }}
                                                            className="w-20 border rounded px-2 py-1 text-center" />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" step="0.01" value={item.accepted_quantity}
                                                            onChange={e => {
                                                                const items = [...data.items];
                                                                items[idx].accepted_quantity = parseFloat(e.target.value) || 0;
                                                                items[idx].rejected_quantity = items[idx].quantity_received - items[idx].accepted_quantity;
                                                                setData('items', items);
                                                            }}
                                                            className="w-20 border rounded px-2 py-1 text-center" />
                                                    </td>
                                                    <td className="p-2 text-center text-red-600">{item.rejected_quantity.toFixed(2)}</td>
                                                    <td className="p-2">
                                                        <input type="number" step="0.01" value={item.unit_cost}
                                                            onChange={e => {
                                                                const items = [...data.items];
                                                                items[idx].unit_cost = parseFloat(e.target.value) || 0;
                                                                setData('items', items);
                                                            }}
                                                            className="w-24 border rounded px-2 py-1 text-center" />
                                                    </td>
                                                    <td className="p-2">
                                                        <select value={item.quality_status}
                                                            onChange={e => {
                                                                const items = [...data.items];
                                                                items[idx].quality_status = e.target.value;
                                                                setData('items', items);
                                                            }}
                                                            className="border rounded px-2 py-1">
                                                            <option value="good">Good</option>
                                                            <option value="damaged">Damaged</option>
                                                            <option value="defective">Defective</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2" rows={2} />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setShowCreate(false); reset(); }}
                                    className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                                    {processing ? 'Creating...' : 'Create Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipts List */}
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Receipt #</th>
                            <th className="p-3 text-left">PO Reference</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-center">Items</th>
                            <th className="p-3 text-right">Value</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.data?.map(receipt => (
                            <tr key={receipt.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-medium">{receipt.receipt_number}</td>
                                <td className="p-3">{receipt.order?.po_number || '-'}</td>
                                <td className="p-3">{receipt.receipt_date}</td>
                                <td className="p-3 text-center">{receipt.total_items}</td>
                                <td className="p-3 text-right">{parseFloat(receipt.total_value).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(receipt.status)}`}>
                                        {receipt.status}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex gap-1 justify-center">
                                        {receipt.status === 'draft' && (
                                            <>
                                                <button onClick={() => receiveReceipt(receipt.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded">Receive</button>
                                                <button onClick={() => cancelReceipt(receipt.id)}
                                                    className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded">Cancel</button>
                                            </>
                                        )}
                                        {(receipt.status === 'received' || receipt.status === 'draft') && (
                                            <button onClick={() => approveReceipt(receipt.id)}
                                                className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded">Approve</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(!receipts.data || receipts.data.length === 0) && (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">No goods receipts found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
