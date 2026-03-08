import React from 'react';
import { Head } from '@inertiajs/react';
import SupplierLayout from './Layout/SupplierLayout';

const Products = () => {
    return (
        <SupplierLayout activeMenu="Products">
            <Head title="My Products" />
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">My Products</h2>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                        Add New Product
                    </button>
                </div>
                
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded">
                    <span className="material-icons text-4xl mb-2">inventory_2</span>
                    <p>Product management interface will go here.</p>
                </div>
            </div>
        </SupplierLayout>
    );
};

export default Products;
