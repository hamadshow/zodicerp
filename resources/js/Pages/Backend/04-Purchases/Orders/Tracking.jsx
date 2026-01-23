import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Tracking = () => {
  return (
    <AdminLayout activeMenu="Purchase Management">
      <Head title="PO Tracking" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Purchase Order Tracking</h1>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">PO Tracking List Placeholder</p>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Tracking;
