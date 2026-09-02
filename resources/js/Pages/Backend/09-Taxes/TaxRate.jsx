import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';

export default function TaxRate({ taxes }) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingTax, setEditingTax] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        code: '',
        rate: 0,
        type: 'sales',
        is_inclusive: false,
        is_active: true,
        description: '',
    });

    const submitTax = (e) => {
        e.preventDefault();
        if (editingTax) {
            put(route('admin.taxes.rates.update', editingTax.id), {
                onSuccess: () => { setShowCreate(false); setEditingTax(null); reset(); },
            });
        } else {
            post(route('admin.taxes.rates.store'), {
                onSuccess: () => { setShowCreate(false); reset(); },
            });
        }
    };

    const editTax = (tax) => {
        setEditingTax(tax);
        setData({
            name: tax.name,
            code: tax.code || '',
            rate: tax.rate,
            type: tax.type,
            is_inclusive: tax.is_inclusive,
            is_active: tax.is_active,
            description: tax.description || '',
        });
        setShowCreate(true);
    };

    return (
        <div className="p-6">
            <Head title="Tax Rates" />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Tax Rates</h1>
                <button onClick={() => { setShowCreate(true); setEditingTax(null); reset(); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Tax Rate</button>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">{editingTax ? 'Edit Tax Rate' : 'New Tax Rate'}</h2>
                        <form onSubmit={submitTax}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name *</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2" />
                                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code</label>
                                        <input type="text" value={data.code} onChange={e => setData('code', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Rate (%) *</label>
                                        <input type="number" step="0.01" min="0" max="100" value={data.rate}
                                            onChange={e => setData('rate', parseFloat(e.target.value) || 0)}
                                            className="w-full border rounded-lg px-3 py-2" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type *</label>
                                        <select value={data.type} onChange={e => setData('type', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2">
                                            <option value="sales">Sales</option>
                                            <option value="purchase">Purchase</option>
                                            <option value="both">Both</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end gap-4 pb-2">
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" checked={data.is_inclusive}
                                                onChange={e => setData('is_inclusive', e.target.checked)} />
                                            Tax Inclusive
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" checked={data.is_active}
                                                onChange={e => setData('is_active', e.target.checked)} />
                                            Active
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => { setShowCreate(false); setEditingTax(null); reset(); }}
                                    className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                                    {editingTax ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Code</th>
                            <th className="p-3 text-center">Rate</th>
                            <th className="p-3 text-center">Type</th>
                            <th className="p-3 text-center">Inclusive</th>
                            <th className="p-3 text-center">Active</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taxes.data?.map(tax => (
                            <tr key={tax.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-medium">{tax.name}</td>
                                <td className="p-3">{tax.code || '-'}</td>
                                <td className="p-3 text-center">{tax.rate}%</td>
                                <td className="p-3 text-center capitalize">{tax.type}</td>
                                <td className="p-3 text-center">{tax.is_inclusive ? 'Yes' : 'No'}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs ${tax.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {tax.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => editTax(tax)} className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
                                    <button onClick={() => { if (confirm('Delete this tax rate?')) {
                                        router.delete(route('admin.taxes.rates.destroy', tax.id));
                                    }}} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
