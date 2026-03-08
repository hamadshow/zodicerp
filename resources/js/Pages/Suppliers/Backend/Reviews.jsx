import React from 'react';
import { Head } from '@inertiajs/react';
import SupplierLayout from './Layout/SupplierLayout';

const Reviews = () => {
    return (
        <SupplierLayout activeMenu="Reviews">
            <Head title="Customer Reviews" />
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Customer Reviews</h2>
                
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded">
                    <span className="material-icons text-4xl mb-2">star</span>
                    <p>Customer product reviews will go here.</p>
                </div>
            </div>
        </SupplierLayout>
    );
};

export default Reviews;
