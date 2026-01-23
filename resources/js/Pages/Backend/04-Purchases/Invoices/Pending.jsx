import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Pending = () => {
  return (
    <AdminLayout activeMenu="Purchase Management">
      <Head title="Pending Invoices" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Pending Invoices</h1>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Pending Invoices List Placeholder</p>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Pending;
