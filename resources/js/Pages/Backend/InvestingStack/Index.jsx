import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { Head } from '@inertiajs/react';

export default function Index({ auth }) {
    return (
        <AdminLayout user={auth.user}>
            <Head title="Investing & Stack" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h2 className="text-2xl font-semibold mb-4">Investing & Stack Module</h2>
                            <p>This module is under development.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
