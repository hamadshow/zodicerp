import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Allocation = () => {
  return (
    <AdminLayout activeMenu="Payments & Finance">
      <Head title="Payment Allocation" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Payment Allocation</h1>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Payment Allocation Tool Placeholder</p>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Allocation;
