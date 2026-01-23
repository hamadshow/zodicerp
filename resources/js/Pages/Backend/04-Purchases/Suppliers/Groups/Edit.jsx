import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AdminLayout from '../../../components/AdminLayout';

const Edit = ({ group }) => {
    const { data, setData, put, processing, errors } = useForm({
        code: group.code || '',
        name_en: group.name_en || '',
        name_ar: group.name_ar || '',
        payment_terms: group.payment_terms || '',
        default_credit_limit: group.default_credit_limit || '',
        notes: group.notes || '',
        is_active: Boolean(group.is_active),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.purchases.supplier-groups.update', group.id));
    };

    return (
        <AdminLayout activeMenu="Suppliers & AP">
            <Head title="Edit Supplier Group" />
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Edit Supplier Group</h1>
                    <Link
                        href={route('admin.purchases.supplier-groups.index')}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <span className="material-icons-outlined">arrow_back</span>
                        Back to List
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group Code *</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder="e.g. GRP-001"
                                />
                                {errors.code && <div className="text-red-500 text-xs mt-1">{errors.code}</div>}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="flex items-center mt-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                            checked={data.is_active}
                                            onChange={e => setData('is_active', e.target.checked)}
                                        />
                                        <span className="ml-2 text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>

                            {/* Name EN */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) *</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name_en ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.name_en}
                                    onChange={e => setData('name_en', e.target.value)}
                                />
                                {errors.name_en && <div className="text-red-500 text-xs mt-1">{errors.name_en}</div>}
                            </div>

                            {/* Name AR */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Arabic)</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name_ar ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.name_ar}
                                    onChange={e => setData('name_ar', e.target.value)}
                                    dir="rtl"
                                />
                                {errors.name_ar && <div className="text-red-500 text-xs mt-1">{errors.name_ar}</div>}
                            </div>

                            {/* Payment Terms */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (Days)</label>
                                <input
                                    type="number"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.payment_terms ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.payment_terms}
                                    onChange={e => setData('payment_terms', e.target.value)}
                                />
                                {errors.payment_terms && <div className="text-red-500 text-xs mt-1">{errors.payment_terms}</div>}
                            </div>

                            {/* Credit Limit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Credit Limit</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.default_credit_limit ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.default_credit_limit}
                                    onChange={e => setData('default_credit_limit', e.target.value)}
                                />
                                {errors.default_credit_limit && <div className="text-red-500 text-xs mt-1">{errors.default_credit_limit}</div>}
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.notes ? 'border-red-500' : 'border-gray-300'}`}
                                    rows="3"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                ></textarea>
                                {errors.notes && <div className="text-red-500 text-xs mt-1">{errors.notes}</div>}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Link
                                href={route('admin.purchases.supplier-groups.index')}
                                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing ? 'Update Group' : 'Update Group'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Edit;
