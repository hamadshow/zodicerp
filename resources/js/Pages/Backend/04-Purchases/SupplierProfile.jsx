import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Suppliers.scss';

const SupplierProfile = ({ supplier }) => {
    const assignedProducts = supplier?.products || [];

    return (
        <AdminLayout activeMenu="Suppliers & AP">
            <Head title={`${supplier?.name_ar || supplier?.name_en || 'Supplier'} Profile`} />
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {supplier?.name_ar || supplier?.name_en || 'Supplier'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {supplier?.supplier_code || ''} • {supplier?.email || 'No email'}
                        </p>
                    </div>
                    <Link
                        href={route('admin.purchases.suppliers.index')}
                        className="btn btn-outline"
                    >
                        <span className="material-icons-outlined text-sm">arrow_back</span>
                        Back to List
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <span className={`status-badge ${supplier?.is_active ? 'status-active' : 'status-inactive'}`}>
                                {supplier?.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Primary Phone</p>
                            <p className="text-sm font-medium text-gray-800">{supplier?.primary_phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Secondary Phone</p>
                            <p className="text-sm font-medium text-gray-800">{supplier?.secondary_phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Tax Number</p>
                            <p className="text-sm font-medium text-gray-800">{supplier?.tax_number || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Credit Limit</p>
                            <p className="text-sm font-medium text-gray-800">{Number(supplier?.credit_limit || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Current Balance</p>
                            <p className="text-sm font-medium text-gray-800">{Number(supplier?.current_balance || 0).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Assigned Products</h2>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Code</th>
                                        <th>Cost Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignedProducts.length > 0 ? (
                                        assignedProducts.map((product) => (
                                            <tr key={product.id}>
                                                <td>{product.name}</td>
                                                <td>{product.product_code || product.code}</td>
                                                <td>{product.pivot?.cost_price || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center text-sm text-gray-500 py-6">
                                                No assigned products.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SupplierProfile;
