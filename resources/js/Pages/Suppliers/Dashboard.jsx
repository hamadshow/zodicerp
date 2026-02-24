import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage().props;
    const supplier = auth.supplier || auth.user;

    // Helper to get display name
    const getDisplayName = () => {
        if (!supplier) return 'Supplier';
        return supplier.name_en || supplier.name_ar || supplier.email;
    };

    return (
        <>
            <Head title="Supplier Dashboard" />
            <div className="min-h-screen bg-gray-100">
                <nav className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
                                <div className="flex-shrink-0 flex items-center">
                                    <h1 className="text-xl font-bold text-gray-800">Supplier Portal</h1>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="text-gray-700 mr-4">Welcome, {getDisplayName()}</span>
                                <Link
                                    href={route('supplier.logout')}
                                    method="post"
                                    as="button"
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                                >
                                    Logout
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="py-10">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 bg-white border-b border-gray-200">
                                <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
                                <p className="text-gray-600">
                                    You are logged in as <strong>{getDisplayName()}</strong> (Code: {supplier?.supplier_code}).
                                </p>
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Placeholder Cards */}
                                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                                        <h3 className="text-lg font-semibold text-blue-700 mb-2">Orders</h3>
                                        <p className="text-3xl font-bold text-blue-800">0</p>
                                    </div>
                                    <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                                        <h3 className="text-lg font-semibold text-green-700 mb-2">Products</h3>
                                        <p className="text-3xl font-bold text-green-800">0</p>
                                    </div>
                                    <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                                        <h3 className="text-lg font-semibold text-purple-700 mb-2">Sales</h3>
                                        <p className="text-3xl font-bold text-purple-800">$0.00</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
