import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Index = () => {
  return (
    <AdminLayout activeMenu="Discounts & Taxes">
      <Head title="Purchase Discounts" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Purchase Discounts</h1>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Add Discount
            </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Purchase Discounts List Placeholder</p>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Index;
