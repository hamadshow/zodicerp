import React from 'react';
import { Head } from '@inertiajs/react';
import SupplierLayout from './Layout/SupplierLayout';

const Profile = () => {
    return (
        <SupplierLayout activeMenu="Profile">
            <Head title="Profile Settings" />
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
                
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded">
                    <span className="material-icons text-4xl mb-2">person</span>
                    <p>Supplier profile and store settings will go here.</p>
                </div>
            </div>
        </SupplierLayout>
    );
};

export default Profile;
