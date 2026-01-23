import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import '../../../../../css/backend/04-Purchases/style.scss';

const Show = ({ quotation }) => {
    return (
        <AdminLayout activeMenu="Purchase Management">
            <Head title={`Quotation ${quotation.quotation_number}`} />
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Quotation {quotation.quotation_number}</h1>
                        <p className="text-sm text-gray-500">View quotation details and approval status</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('admin.purchases.quotations.edit', quotation.id)}
                            className="btn btn-primary"
                        >
                            <span className="material-icons-outlined text-sm">edit</span>
                            Edit
                        </Link>
                        <Link
                            href={route('admin.purchases.quotations.index')}
                            className="btn btn-outline"
                        >
                            <span className="material-icons-outlined text-sm">arrow_back</span>
                            Back to List
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Supplier</p>
                                <p className="text-sm font-medium text-gray-800">
                                    {quotation.supplier?.name_ar || quotation.supplier?.name_en || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Status</p>
                                <span className={`status-badge status-${quotation.status}`}>
                                    {quotation.status?.replace('_', ' ')}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Quotation Date</p>
                                <p className="text-sm font-medium text-gray-800">{quotation.quotation_date || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Expiry Date</p>
                                <p className="text-sm font-medium text-gray-800">{quotation.expiry_date || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Currency</p>
                                <p className="text-sm font-medium text-gray-800">
                                    {quotation.currency?.code || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Exchange Rate</p>
                                <p className="text-sm font-medium text-gray-800">{quotation.exchange_rate || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Warehouse</p>
                                <p className="text-sm font-medium text-gray-800">
                                    {quotation.warehouse?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Valid Days</p>
                                <p className="text-sm font-medium text-gray-800">{quotation.valid_days || '-'}</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-3">Amounts</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="font-medium text-gray-800">{Number(quotation.subtotal || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Discount</span>
                                    <span className="font-medium text-gray-800">{Number(quotation.discount_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Tax</span>
                                    <span className="font-medium text-gray-800">{Number(quotation.tax_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Shipping</span>
                                    <span className="font-medium text-gray-800">{Number(quotation.shipping_cost || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Total</span>
                                    <span className="font-semibold text-gray-800">{Number(quotation.total_amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-2">Approval Notes</h2>
                                <div className="border rounded p-3 text-sm text-gray-600 min-h-[80px]">
                                    {quotation.approval_notes || 'No approval notes.'}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-2">Notes</h2>
                                <div className="border rounded p-3 text-sm text-gray-600 min-h-[80px]">
                                    {quotation.notes || 'No notes.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Sending</h2>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center justify-between">
                                    <span>Sent Date</span>
                                    <span>{quotation.sent_date || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Sent Method</span>
                                    <span>{quotation.sent_method || '-'}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Metadata</h2>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center justify-between">
                                    <span>Created At</span>
                                    <span>{quotation.created_at || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Updated At</span>
                                    <span>{quotation.updated_at || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Show;
