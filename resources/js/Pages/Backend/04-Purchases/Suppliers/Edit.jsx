import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Edit = ({ supplier, groups, countries }) => {
    const { data, setData, put, processing, errors } = useForm({
        supplier_code: supplier.supplier_code || '',
        name_en: supplier.name_en || '',
        name_ar: supplier.name_ar || '',
        supplier_group_id: supplier.supplier_group_id || '',
        email: supplier.email || '',
        primary_phone: supplier.primary_phone || '',
        tax_number: supplier.tax_number || '',
        credit_limit: supplier.credit_limit || '',
        payment_terms: supplier.payment_terms || '',
        country_id: supplier.country_id || '',
        is_active: Boolean(supplier.is_active),
        notes: supplier.notes || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.purchases.suppliers.update', supplier.id));
    };

    return (
        <AdminLayout activeMenu="Suppliers & AP">
            <Head title="Edit Supplier" />
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Edit Supplier</h1>
                    <Link
                        href={route('admin.purchases.suppliers.index')}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code *</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier_code ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.supplier_code}
                                    onChange={e => setData('supplier_code', e.target.value)}
                                    placeholder="e.g. SUP-001"
                                />
                                {errors.supplier_code && <div className="text-red-500 text-xs mt-1">{errors.supplier_code}</div>}
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

                            {/* Supplier Group */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Group</label>
                                <select
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier_group_id ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.supplier_group_id}
                                    onChange={e => setData('supplier_group_id', e.target.value)}
                                >
                                    <option value="">Select Group</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name_en}</option>
                                    ))}
                                </select>
                                {errors.supplier_group_id && <div className="text-red-500 text-xs mt-1">{errors.supplier_group_id}</div>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                />
                                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.primary_phone ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.primary_phone}
                                    onChange={e => setData('primary_phone', e.target.value)}
                                />
                                {errors.primary_phone && <div className="text-red-500 text-xs mt-1">{errors.primary_phone}</div>}
                            </div>

                            {/* Tax Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Number</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.tax_number ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.tax_number}
                                    onChange={e => setData('tax_number', e.target.value)}
                                />
                                {errors.tax_number && <div className="text-red-500 text-xs mt-1">{errors.tax_number}</div>}
                            </div>

                            {/* Country */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <select
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.country_id ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.country_id}
                                    onChange={e => setData('country_id', e.target.value)}
                                >
                                    <option value="">Select Country</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>{country.name}</option>
                                    ))}
                                </select>
                                {errors.country_id && <div className="text-red-500 text-xs mt-1">{errors.country_id}</div>}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.credit_limit ? 'border-red-500' : 'border-gray-300'}`}
                                    value={data.credit_limit}
                                    onChange={e => setData('credit_limit', e.target.value)}
                                />
                                {errors.credit_limit && <div className="text-red-500 text-xs mt-1">{errors.credit_limit}</div>}
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
                                href={route('admin.purchases.suppliers.index')}
                                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing ? 'Update Supplier' : 'Update Supplier'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Edit;
