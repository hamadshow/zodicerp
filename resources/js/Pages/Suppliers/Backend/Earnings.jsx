import React from 'react';
import { Head } from '@inertiajs/react';
import SupplierLayout from './Layout/SupplierLayout';

const Earnings = () => {
    return (
        <SupplierLayout activeMenu="Earnings">
            <Head title="Earnings & Revenue" />
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Earnings & Revenue</h2>
                
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded">
                    <span className="material-icons text-4xl mb-2">monetization_on</span>
                    <p>Earnings charts and withdrawal requests will go here.</p>
                </div>
            </div>
        </SupplierLayout>
    );
};

export default Earnings;
